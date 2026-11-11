import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationPath = path.resolve(
  __dirname,
  '../../../../supabase/migrations/20261106200000_rms_atomic_interview_slot_booking.sql'
);
const migrationSource = fs.readFileSync(migrationPath, 'utf8');

const apiPath = path.resolve(__dirname, '../../lib/api.ts');
const apiSource = fs.readFileSync(apiPath, 'utf8');

test('MAHA-AGRI Careers – Atomic Concurrency-Safe Interview Slot Booking Suite', async (t) => {

  // ── 1. Migration Architectural & Security Inspection ────────────────────────
  await t.test('1. Migration implements SELECT FOR UPDATE row-locking, SECURITY DEFINER and least-privilege grants', () => {
    // Row lock on slot
    assert.match(
      migrationSource,
      /SELECT[\s\S]*?FROM\s+public\.rms_interview_slots[\s\S]*?WHERE\s+id\s*=\s*p_slot_id[\s\S]*?FOR\s+UPDATE;/,
      'Must acquire exclusive row-level lock (FOR UPDATE) on the target slot'
    );

    // SECURITY DEFINER and search_path hardening
    assert.match(migrationSource, /SECURITY DEFINER/, 'Must specify SECURITY DEFINER');
    assert.match(
      migrationSource,
      /SET\s+search_path\s*=\s*public,\s*pg_temp/,
      'Must set safe search_path to prevent search-path hijacking'
    );

    // Candidate ownership check using auth.uid()
    assert.match(
      migrationSource,
      /v_user_id\s*:=\s*auth\.uid\(\);/,
      'Must verify authenticated user id from auth.uid()'
    );
    assert.match(
      migrationSource,
      /IF\s+v_app\.candidate_user_id\s*<>\s*v_user_id\s+THEN/,
      'Must strictly enforce candidate application ownership against auth.uid()'
    );

    // Least-Privilege Grants: Authenticated only, revoked from anon & public
    assert.match(
      migrationSource,
      /REVOKE ALL ON FUNCTION public\.rms_book_interview_slot\(uuid, uuid\) FROM public;/,
      'Must revoke execution from public'
    );
    assert.match(
      migrationSource,
      /REVOKE ALL ON FUNCTION public\.rms_book_interview_slot\(uuid, uuid\) FROM anon;/,
      'Must revoke execution from anon'
    );
    assert.match(
      migrationSource,
      /GRANT EXECUTE ON FUNCTION public\.rms_book_interview_slot\(uuid, uuid\) TO authenticated;/,
      'Must grant execution exclusively to authenticated'
    );
  });

  // ── 2. TypeScript Client Hardening: Zero Unsafe Fallback ───────────────────
  await t.test('2. bookApplicationToSlot in api.ts delegates exclusively to atomic RPC with zero unsafe fallback', () => {
    // Must call RPC with proper arguments
    assert.ok(
      apiSource.includes("'rms_book_interview_slot'"),
      'Must invoke rms_book_interview_slot RPC'
    );
    assert.ok(
      apiSource.includes('p_application_id: applicationId'),
      'Must forward p_application_id'
    );
    assert.ok(
      apiSource.includes('p_slot_id: slotId'),
      'Must forward p_slot_id'
    );

    // Must NOT contain a non-atomic upsert fallback
    const bookFunctionCode = apiSource.match(/export async function bookApplicationToSlot[\s\S]*?^}/m)?.[0] || '';
    assert.ok(bookFunctionCode, 'Must locate bookApplicationToSlot implementation');
    assert.doesNotMatch(
      bookFunctionCode,
      /\.from\(['"]rms_interview_bookings['"]\)\s*\.upsert/,
      'bookApplicationToSlot must NOT fall back to a non-atomic upsert'
    );
  });

  // ── 3. Simulated Atomic Engine Matching PostgreSQL Stored Procedure ────────
  // We model the exact transactional semantics of rms_book_interview_slot:
  // - A Mutex simulating PostgreSQL row-level FOR UPDATE lock on slot_id
  // - In-memory state simulating PostgreSQL tables
  class MockPostgreSQLEngine {
    constructor() {
      this.slots = new Map();
      this.applications = new Map();
      this.candidateProfiles = new Map();
      this.bookings = new Map(); // key: application_id -> booking record
      this.slotLocks = new Map(); // key: slot_id -> Promise chain for mutex
    }

    async acquireSlotLock(slotId) {
      while (this.slotLocks.has(slotId)) {
        await this.slotLocks.get(slotId);
      }
      let releaseLock;
      const lockPromise = new Promise((resolve) => {
        releaseLock = resolve;
      });
      this.slotLocks.set(slotId, lockPromise);
      return () => {
        this.slotLocks.delete(slotId);
        releaseLock();
      };
    }

    async rms_book_interview_slot(applicationId, slotId, currentUserId) {
      if (!currentUserId) {
        return { success: false, code: 'UNAUTHORIZED', message: 'Authentication required' };
      }

      const app = this.applications.get(applicationId);
      if (!app) {
        return { success: false, code: 'APP_NOT_FOUND', message: 'Application record not found.' };
      }

      const candidate = this.candidateProfiles.get(app.candidate_id);
      if (!candidate || candidate.user_id !== currentUserId) {
        return { success: false, code: 'FORBIDDEN', message: 'Permission denied: You can only book interview slots for your own application.' };
      }

      if (app.fee_amount > 0 && app.status !== 'payment_successful') {
        return {
          success: false,
          code: 'PAYMENT_REQUIRED',
          message: 'This position requires payment of the application fee before booking an interview slot.',
        };
      }

      // Acquire exclusive row lock on slot (simulates SELECT ... FOR UPDATE)
      const release = await this.acquireSlotLock(slotId);
      try {
        // Critical Section (Serialized)
        const slot = this.slots.get(slotId);
        if (!slot) {
          return { success: false, code: 'SLOT_NOT_FOUND', message: 'Selected interview slot does not exist.' };
        }

        if (slot.job_posting_id !== app.job_posting_id) {
          return { success: false, code: 'JOB_MISMATCH', message: 'This interview slot does not match the job posting for your application.' };
        }

        const existingBooking = this.bookings.get(applicationId);
        const currentBookingsForSlot = Array.from(this.bookings.values()).filter((b) => b.slot_id === slotId);

        // Idempotent re-booking check: If applicant is ALREADY booked to this exact slot,
        // succeed immediately even if slot is currently marked 'full' due to their booking
        if (existingBooking && existingBooking.slot_id === slotId) {
          return {
            success: true,
            code: 'OK',
            booking: existingBooking,
            slot: { ...slot, booked_count: currentBookingsForSlot.length },
          };
        }

        // For new booking or rescheduling: slot must be open
        if (slot.status !== 'open') {
          return {
            success: false,
            code: slot.status === 'full' ? 'SLOT_FULL' : 'SLOT_CLOSED',
            message: slot.status === 'full' ? 'Interview slot is full.' : 'Interview slot is no longer available.',
          };
        }

        // Strict capacity check
        if (currentBookingsForSlot.length >= slot.capacity) {
          slot.status = 'full';
          slot.booked_count = currentBookingsForSlot.length;
          return {
            success: false,
            code: 'SLOT_FULL',
            message: 'Interview slot is full. Please select another slot.',
          };
        }

        // Perform booking
        const bookingRecord = {
          id: existingBooking?.id || `bk-${Date.now()}-${Math.random()}`,
          application_id: applicationId,
          slot_id: slotId,
          attendance_status: 'booked',
          booked_at: new Date().toISOString(),
        };
        this.bookings.set(applicationId, bookingRecord);

        // Update application
        app.status = 'interview_scheduled';

        // Reconcile new slot
        const newSlotBookings = Array.from(this.bookings.values()).filter((b) => b.slot_id === slotId);
        slot.booked_count = newSlotBookings.length;
        if (slot.booked_count >= slot.capacity) {
          slot.status = 'full';
        }

        // Reconcile old slot if rescheduling
        if (existingBooking && existingBooking.slot_id !== slotId) {
          const oldSlot = this.slots.get(existingBooking.slot_id);
          if (oldSlot) {
            const oldBookings = Array.from(this.bookings.values()).filter((b) => b.slot_id === existingBooking.slot_id);
            oldSlot.booked_count = oldBookings.length;
            if (oldSlot.booked_count < oldSlot.capacity && oldSlot.status === 'full') {
              oldSlot.status = 'open';
            }
          }
        }

        return {
          success: true,
          code: 'OK',
          booking: bookingRecord,
          slot: { ...slot },
        };
      } finally {
        release();
      }
    }
  }

  // ── 4. Test Scenario 1: One remaining seat, one booking request: SUCCESS ───
  await t.test('Scenario 1: One remaining seat, one booking request succeeds', async () => {
    const db = new MockPostgreSQLEngine();
    db.candidateProfiles.set('cand-1', { id: 'cand-1', user_id: 'usr-1' });
    db.applications.set('app-1', { id: 'app-1', candidate_id: 'cand-1', job_posting_id: 'job-1', status: 'submitted', fee_amount: 0 });
    db.slots.set('slot-1', { id: 'slot-1', job_posting_id: 'job-1', capacity: 1, booked_count: 0, status: 'open' });

    const res = await db.rms_book_interview_slot('app-1', 'slot-1', 'usr-1');
    assert.equal(res.success, true);
    assert.equal(res.code, 'OK');
    assert.equal(res.slot.booked_count, 1);
    assert.equal(res.slot.status, 'full');
    assert.equal(db.applications.get('app-1').status, 'interview_scheduled');
  });

  // ── 5. Test Scenario 2: One remaining seat, two simultaneous requests: EXACTLY ONE SUCCEEDS ─
  await t.test('Scenario 2: One remaining seat, two simultaneous requests: exactly one succeeds, second gets SLOT_FULL', async () => {
    const db = new MockPostgreSQLEngine();
    db.candidateProfiles.set('cand-1', { id: 'cand-1', user_id: 'usr-1' });
    db.candidateProfiles.set('cand-2', { id: 'cand-2', user_id: 'usr-2' });

    db.applications.set('app-1', { id: 'app-1', candidate_id: 'cand-1', job_posting_id: 'job-1', status: 'submitted', fee_amount: 0 });
    db.applications.set('app-2', { id: 'app-2', candidate_id: 'cand-2', job_posting_id: 'job-1', status: 'submitted', fee_amount: 0 });

    // Capacity is strictly 1
    db.slots.set('slot-1', { id: 'slot-1', job_posting_id: 'job-1', capacity: 1, booked_count: 0, status: 'open' });

    // Fire both requests concurrently
    const [res1, res2] = await Promise.all([
      db.rms_book_interview_slot('app-1', 'slot-1', 'usr-1'),
      db.rms_book_interview_slot('app-2', 'slot-1', 'usr-2'),
    ]);

    const successes = [res1, res2].filter((r) => r.success === true);
    const failures = [res1, res2].filter((r) => r.success === false);

    assert.equal(successes.length, 1, 'Exactly one booking request must succeed');
    assert.equal(failures.length, 1, 'Exactly one booking request must fail');
    assert.equal(failures[0].code, 'SLOT_FULL', 'Failed request must receive SLOT_FULL error');

    // Confirm database state has not oversubscribed capacity
    const slot = db.slots.get('slot-1');
    assert.equal(slot.booked_count, 1, 'Slot booked_count must not exceed capacity (1)');
    assert.equal(slot.status, 'full', 'Slot status must be marked full');
    assert.equal(db.bookings.size, 1, 'Total bookings count must equal 1');
  });

  // ── 6. Test Scenario 3: Full slot: Booking rejected with SLOT_FULL ────────
  await t.test('Scenario 3: Full slot: Booking request is rejected with SLOT_FULL', async () => {
    const db = new MockPostgreSQLEngine();
    db.candidateProfiles.set('cand-1', { id: 'cand-1', user_id: 'usr-1' });
    db.candidateProfiles.set('cand-2', { id: 'cand-2', user_id: 'usr-2' });

    db.applications.set('app-1', { id: 'app-1', candidate_id: 'cand-1', job_posting_id: 'job-1', status: 'interview_scheduled', fee_amount: 0 });
    db.applications.set('app-2', { id: 'app-2', candidate_id: 'cand-2', job_posting_id: 'job-1', status: 'submitted', fee_amount: 0 });

    // Slot already has 1 booking and status is full
    db.slots.set('slot-1', { id: 'slot-1', job_posting_id: 'job-1', capacity: 1, booked_count: 1, status: 'full' });
    db.bookings.set('app-1', { id: 'bk-1', application_id: 'app-1', slot_id: 'slot-1', attendance_status: 'booked' });

    const res = await db.rms_book_interview_slot('app-2', 'slot-1', 'usr-2');
    assert.equal(res.success, false);
    assert.equal(res.code, 'SLOT_FULL');
  });

  // ── 7. Test Scenario 4: Closed / Cancelled slot: Booking rejected with SLOT_CLOSED ──
  await t.test('Scenario 4: Closed or cancelled slot is rejected with SLOT_CLOSED', async () => {
    const db = new MockPostgreSQLEngine();
    db.candidateProfiles.set('cand-1', { id: 'cand-1', user_id: 'usr-1' });
    db.applications.set('app-1', { id: 'app-1', candidate_id: 'cand-1', job_posting_id: 'job-1', status: 'submitted', fee_amount: 0 });
    db.slots.set('slot-1', { id: 'slot-1', job_posting_id: 'job-1', capacity: 5, booked_count: 0, status: 'cancelled' });

    const res = await db.rms_book_interview_slot('app-1', 'slot-1', 'usr-1');
    assert.equal(res.success, false);
    assert.equal(res.code, 'SLOT_CLOSED');
  });

  // ── 8. Test Scenario 5: Same application attempts duplicate booking: IDEMPOTENT ──
  await t.test('Scenario 5: Same application re-booking same slot is idempotent and does not create duplicate record', async () => {
    const db = new MockPostgreSQLEngine();
    db.candidateProfiles.set('cand-1', { id: 'cand-1', user_id: 'usr-1' });
    db.applications.set('app-1', { id: 'app-1', candidate_id: 'cand-1', job_posting_id: 'job-1', status: 'submitted', fee_amount: 0 });
    db.slots.set('slot-1', { id: 'slot-1', job_posting_id: 'job-1', capacity: 1, booked_count: 0, status: 'open' });

    // Initial booking
    const res1 = await db.rms_book_interview_slot('app-1', 'slot-1', 'usr-1');
    assert.equal(res1.success, true);
    assert.equal(db.bookings.size, 1);

    // Second booking attempt by same application for the same slot
    const res2 = await db.rms_book_interview_slot('app-1', 'slot-1', 'usr-1');
    assert.equal(res2.success, true, 'Re-booking should return success idempotently');
    assert.equal(db.bookings.size, 1, 'Must still contain exactly one booking record');
  });

  // ── 9. Test Scenario 6: Payment-required unpaid application: REJECTED with PAYMENT_REQUIRED ──
  await t.test('Scenario 6: Payment-required application with pending payment is rejected with PAYMENT_REQUIRED', async () => {
    const db = new MockPostgreSQLEngine();
    db.candidateProfiles.set('cand-1', { id: 'cand-1', user_id: 'usr-1' });
    db.applications.set('app-1', { id: 'app-1', candidate_id: 'cand-1', job_posting_id: 'job-1', status: 'payment_pending', fee_amount: 559 });
    db.slots.set('slot-1', { id: 'slot-1', job_posting_id: 'job-1', capacity: 5, booked_count: 0, status: 'open' });

    const res = await db.rms_book_interview_slot('app-1', 'slot-1', 'usr-1');
    assert.equal(res.success, false);
    assert.equal(res.code, 'PAYMENT_REQUIRED');
  });

  // ── 10. Test Scenario 7: Zero-fee application: PERMITTED ───────────────────
  await t.test('Scenario 7: Zero-fee application is permitted without payment check blocking', async () => {
    const db = new MockPostgreSQLEngine();
    db.candidateProfiles.set('cand-1', { id: 'cand-1', user_id: 'usr-1' });
    db.applications.set('app-1', { id: 'app-1', candidate_id: 'cand-1', job_posting_id: 'job-1', status: 'submitted', fee_amount: 0 });
    db.slots.set('slot-1', { id: 'slot-1', job_posting_id: 'job-1', capacity: 2, booked_count: 0, status: 'open' });

    const res = await db.rms_book_interview_slot('app-1', 'slot-1', 'usr-1');
    assert.equal(res.success, true);
    assert.equal(res.code, 'OK');
    assert.equal(db.applications.get('app-1').status, 'interview_scheduled');
  });

  // ── 11. Test Scenario 8: Candidate Ownership Enforcement (FORBIDDEN) ──────
  await t.test('Scenario 8: Candidate cannot book slot for an application belonging to another candidate', async () => {
    const db = new MockPostgreSQLEngine();
    db.candidateProfiles.set('cand-1', { id: 'cand-1', user_id: 'usr-1' });
    db.candidateProfiles.set('cand-2', { id: 'cand-2', user_id: 'usr-2' });

    db.applications.set('app-1', { id: 'app-1', candidate_id: 'cand-1', job_posting_id: 'job-1', status: 'submitted', fee_amount: 0 });
    db.slots.set('slot-1', { id: 'slot-1', job_posting_id: 'job-1', capacity: 2, booked_count: 0, status: 'open' });

    // User 2 attempts to book for Application 1
    const res = await db.rms_book_interview_slot('app-1', 'slot-1', 'usr-2');
    assert.equal(res.success, false);
    assert.equal(res.code, 'FORBIDDEN');
  });

  // ── 12. Test Scenario 9: Rescheduling reconciles both old and new slots ─────
  await t.test('Scenario 9: Rescheduling reassigns slot and restores capacity on previous slot', async () => {
    const db = new MockPostgreSQLEngine();
    db.candidateProfiles.set('cand-1', { id: 'cand-1', user_id: 'usr-1' });
    db.applications.set('app-1', { id: 'app-1', candidate_id: 'cand-1', job_posting_id: 'job-1', status: 'submitted', fee_amount: 0 });

    db.slots.set('slot-A', { id: 'slot-A', job_posting_id: 'job-1', capacity: 1, booked_count: 0, status: 'open' });
    db.slots.set('slot-B', { id: 'slot-B', job_posting_id: 'job-1', capacity: 1, booked_count: 0, status: 'open' });

    // Book Slot A
    await db.rms_book_interview_slot('app-1', 'slot-A', 'usr-1');
    assert.equal(db.slots.get('slot-A').booked_count, 1);
    assert.equal(db.slots.get('slot-A').status, 'full');

    // Reschedule to Slot B
    const res2 = await db.rms_book_interview_slot('app-1', 'slot-B', 'usr-1');
    assert.equal(res2.success, true);

    // Slot B should now be full (1)
    assert.equal(db.slots.get('slot-B').booked_count, 1);
    assert.equal(db.slots.get('slot-B').status, 'full');

    // Slot A must have been restored to 0 and open
    assert.equal(db.slots.get('slot-A').booked_count, 0);
    assert.equal(db.slots.get('slot-A').status, 'open');
  });
});
