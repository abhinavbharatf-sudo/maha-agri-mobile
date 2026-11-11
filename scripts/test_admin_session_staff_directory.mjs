import pg from 'pg';

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.PROD_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const client = await pool.connect();

  try {
    console.log('=== VERIFYING RMS_LIST_STAFF_DIRECTORY UNDER AUTHORIZED & UNAUTHORIZED SESSIONS ===\n');

    // Super Admin user ID
    const superAdminId = 'c4b18f08-3199-4c1b-b46f-c1f0b0c61811';
    // Non-admin Staff user ID (telecaller)
    const telecallerId = '073f131a-6df9-42b7-a365-5d985a9df61a';

    // 1. Authorized Super Admin Session Test
    console.log('── 1. Authorized Super Admin Session Simulation ──');
    await client.query('BEGIN;');
    await client.query(`
      SET LOCAL role = 'authenticated';
      SET LOCAL request.jwt.claim.sub = '${superAdminId}';
      SET LOCAL request.jwt.claim.role = 'authenticated';
    `);

    const { rows: adminStaff } = await client.query(`
      SELECT id, email, full_name, employee_code, role_key, is_active
      FROM public.rms_list_staff_directory(NULL, NULL, NULL, 'all', NULL, NULL, NULL, 0);
    `);
    await client.query('COMMIT;');

    console.log(`✅ SUCCESS: Authorized Admin retrieved ${adminStaff.length} genuine staff records from Production.`);
    console.table(adminStaff);

    // Verify zero mock records
    const hasMock = adminStaff.some(s => (s.full_name && s.full_name.includes('Preview')) || s.id.startsWith('preview-'));
    if (!hasMock) {
      console.log('✅ PASS: Zero preview/mock records present. All records are genuine Production profiles.\n');
    } else {
      console.error('❌ FAIL: Preview mock records found in result!');
      process.exit(1);
    }

    // 2. Unauthorized Staff Session Test (Telecaller role trying to access staff directory)
    console.log('── 2. Unauthorized Non-Admin Staff Session Simulation ──');
    await client.query('BEGIN;');
    await client.query(`
      SET LOCAL role = 'authenticated';
      SET LOCAL request.jwt.claim.sub = '${telecallerId}';
      SET LOCAL request.jwt.claim.role = 'authenticated';
    `);

    try {
      await client.query(`
        SELECT id FROM public.rms_list_staff_directory(NULL, NULL, NULL, 'all', NULL, NULL, NULL, 0);
      `);
      console.error('❌ FAIL: Non-admin staff member was NOT blocked!');
      await client.query('ROLLBACK;');
      process.exit(1);
    } catch (err) {
      await client.query('ROLLBACK;');
      console.log('✅ PASS: Non-admin staff member blocked as expected:');
      console.log(`   Error: ${err.message}`);
      console.log(`   Code:  ${err.code}\n`);
    }

    // 3. Anonymous Session Test via PostgREST
    console.log('── 3. Anonymous Unauthenticated Session Simulation via PostgREST ──');
    const { createClient } = await import('@supabase/supabase-js');
    const fs = await import('fs');
    const envContent = fs.readFileSync('.env', 'utf-8');
    const url = envContent.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
    const key = envContent.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/)[1].trim();
    const anonClient = createClient(url, key);

    const anonRes = await anonClient.rpc('rms_list_staff_directory', {});
    if (anonRes.error && (anonRes.error.code === 'P0001' || anonRes.error.message.includes('Unauthorized'))) {
      console.log('✅ PASS: Anonymous PostgREST caller blocked as expected:');
      console.log(`   Error: ${anonRes.error.message}`);
      console.log(`   Code:  ${anonRes.error.code}\n`);
    } else {
      console.error('❌ FAIL: Anonymous caller was NOT blocked via PostgREST!');
      process.exit(1);
    }

    console.log('====================================================================');
    console.log('ALL ROLE-BASED ACCESS & DATA INTEGRITY TESTS PASSED ✅');
    console.log('====================================================================\n');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
