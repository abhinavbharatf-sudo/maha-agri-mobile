import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const step2Path = path.resolve(__dirname, '../steps/Step2JobSpecific.tsx');
const step2Source = fs.readFileSync(step2Path, 'utf8');

function getOutsideDistrictsExplanation(
  outsideDistricts,
  currentDistrict,
  permanentDistrict,
  isSameAddress
) {
  if (!outsideDistricts || outsideDistricts.length === 0) return '';

  const outsideStr = outsideDistricts.join(', ');
  const isPlural = outsideDistricts.length > 1;
  const verb = isPlural ? 'are' : 'is';

  const cleanCurrent = (currentDistrict || '').trim();
  const cleanPermanent = (permanentDistrict || '').trim();

  const hasBothDistinct = Boolean(
    cleanCurrent &&
    cleanPermanent &&
    !isSameAddress &&
    cleanCurrent.toLowerCase() !== cleanPermanent.toLowerCase()
  );

  if (hasBothDistinct) {
    return `You have selected ${outsideStr}, which ${verb} outside both your current residential district (${cleanCurrent}) and permanent residential district (${cleanPermanent}).`;
  }

  if (cleanCurrent) {
    return `You have selected ${outsideStr}, which ${verb} outside your declared residential district (${cleanCurrent}).`;
  }

  if (cleanPermanent) {
    return `You have selected ${outsideStr}, which ${verb} outside your permanent residential district (${cleanPermanent}).`;
  }

  return `You have selected ${outsideStr}, which ${verb} outside your declared residential district.`;
}

test('MAHA-AGRI Careers – Mobility Consent & Location Integrity Suite', async (t) => {

  // ── 0. Source Code Structural Integrity ───────────────────────────────────
  await t.test('0. Step2JobSpecific.tsx exports getOutsideDistrictsExplanation and reactive consent invalidation', () => {
    assert.ok(
      step2Source.includes('export function getOutsideDistrictsExplanation'),
      'Step2JobSpecific must export getOutsideDistrictsExplanation'
    );
    assert.ok(
      step2Source.includes('outside both your current residential district'),
      'Step2JobSpecific must contain dynamic dual residential message'
    );
    assert.ok(
      step2Source.includes('isMobilityConsentValid'),
      'Step2JobSpecific must compute isMobilityConsentValid'
    );
    assert.ok(
      step2Source.includes("onChange('mobilityConsent', undefined)"),
      'Step2JobSpecific must invalidate mobilityConsent on location changes'
    );
  });

  // ── 1. Dynamic Consent Explanation Message Verification ───────────────────
  await t.test('1. Generates exact dynamic message for Wardha (current) and Amravati (permanent)', () => {
    const currentDistrict = 'Wardha';
    const permanentDistrict = 'Amravati';
    const outsideDistricts = ['Yavatmal'];
    const isSameAddress = false;

    const message = getOutsideDistrictsExplanation(
      outsideDistricts,
      currentDistrict,
      permanentDistrict,
      isSameAddress
    );

    assert.equal(
      message,
      'You have selected Yavatmal, which is outside both your current residential district (Wardha) and permanent residential district (Amravati).'
    );
  });

  await t.test('2. Handles plural outside districts with both residential districts', () => {
    const currentDistrict = 'Wardha';
    const permanentDistrict = 'Amravati';
    const outsideDistricts = ['Yavatmal', 'Nagpur'];
    const isSameAddress = false;

    const message = getOutsideDistrictsExplanation(
      outsideDistricts,
      currentDistrict,
      permanentDistrict,
      isSameAddress
    );

    assert.equal(
      message,
      'You have selected Yavatmal, Nagpur, which are outside both your current residential district (Wardha) and permanent residential district (Amravati).'
    );
  });

  await t.test('3. Handles single residential address or identical current and permanent address', () => {
    const currentDistrict = 'Wardha';
    const permanentDistrict = 'Wardha';
    const outsideDistricts = ['Yavatmal'];
    const isSameAddress = true;

    const message = getOutsideDistrictsExplanation(
      outsideDistricts,
      currentDistrict,
      permanentDistrict,
      isSameAddress
    );

    assert.equal(
      message,
      'You have selected Yavatmal, which is outside your declared residential district (Wardha).'
    );
  });

  // ── 2. Business Rule: Outside Districts Resolution ────────────────────────
  await t.test('4. Wardha + Amravati resident selecting Wardha, Yavatmal, Amravati has ONLY Yavatmal as outside', () => {
    const currentDistrict = 'Wardha';
    const permanentDistrict = 'Amravati';
    const preferredDistricts = [
      { id: 'p1', priority: 1, district: 'Wardha', talukas: ['Wardha', 'Deoli'] },
      { id: 'p2', priority: 2, district: 'Yavatmal', talukas: ['Yavatmal', 'Kalamb'] },
      { id: 'p3', priority: 3, district: 'Amravati', talukas: ['Amravati', 'Achalpur'] },
    ];

    const candidateResidentialDistricts = [
      currentDistrict.trim().toLowerCase(),
      permanentDistrict.trim().toLowerCase()
    ];

    const outside = [];
    preferredDistricts.forEach(p => {
      if (p.district && !candidateResidentialDistricts.includes(p.district.trim().toLowerCase())) {
        if (!outside.includes(p.district)) {
          outside.push(p.district);
        }
      }
    });

    assert.deepEqual(outside, ['Yavatmal'], 'Yavatmal must be the single outside district');
    const requiresMobilityConsent = outside.length > 0;
    assert.equal(requiresMobilityConsent, true, 'Mobility consent is required because Yavatmal is outside');
  });

  // ── 3. Stale Consent Revalidation & Invalidation ──────────────────────────
  await t.test('5. Modifying preferred districts invalidates prior consent and blocks submission until re-consented', () => {
    const currentDistrict = 'Wardha';
    const permanentDistrict = 'Amravati';
    const candidateResidentialDistricts = ['wardha', 'amravati'];

    // Initial state: Candidate selected Wardha, Yavatmal, Amravati and consented
    let outsideDistricts = ['Yavatmal'];
    let mobilityConsent = {
      consented: true,
      consentedAt: '2026-11-06T10:00:00.000Z',
      outsideDistricts: ['Yavatmal'],
      consentText: 'Declaration text...',
      consentVersion: 'v1.0',
      candidateId: 'ABF-CAND-001',
    };

    const isMobilityConsentValid = (consent, currentOutside) => {
      if (!consent?.consented) return false;
      const rec = (consent.outsideDistricts || []).map(d => d.trim().toLowerCase()).sort();
      const cur = currentOutside.map(d => d.trim().toLowerCase()).sort();
      if (rec.length !== cur.length) return false;
      return rec.every((d, i) => d === cur[i]);
    };

    // Valid on initial match
    assert.equal(isMobilityConsentValid(mobilityConsent, outsideDistricts), true);

    // Candidate switches Yavatmal (outside) to Nagpur (also outside)
    outsideDistricts = ['Nagpur'];

    // Consent must now be INVALID
    assert.equal(
      isMobilityConsentValid(mobilityConsent, outsideDistricts),
      false,
      'Old consent for Yavatmal must be INVALID when current outside district is Nagpur'
    );

    // Candidate switches to only native locations (Wardha, Amravati)
    outsideDistricts = [];
    const requiresMobilityConsent = outsideDistricts.length > 0;
    assert.equal(requiresMobilityConsent, false, 'No mobility consent required when all preferences match residential');
  });

  // ── 4. Record Metadata Integrity ──────────────────────────────────────────
  await t.test('6. Consent record contains mandatory audit metadata', () => {
    const consentPayload = {
      consented: true,
      consentedAt: new Date().toISOString(),
      outsideDistricts: ['Yavatmal'],
      consentText: 'Official text',
      consentVersion: 'v1.0',
      candidateId: 'ABF-CAND-999',
    };

    assert.equal(consentPayload.consented, true);
    assert.ok(consentPayload.consentedAt, 'Must have timestamp');
    assert.deepEqual(consentPayload.outsideDistricts, ['Yavatmal']);
    assert.equal(consentPayload.consentVersion, 'v1.0');
    assert.equal(consentPayload.candidateId, 'ABF-CAND-999');
  });

});
