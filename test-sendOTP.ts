process.env.VITE_SUPABASE_URL = 'https://dmtetjahbxedugszztla.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_LI1Z-g6SAHi4GrBeQF3U3g_WHMDXbgg';

import { sendOTP } from './src/services/whatapi';

async function test() {
  console.log('Testing sendOTP to 918766443100 with OTP 123456');
  const res = await sendOTP('918766443100', '123456');
  console.log('Response:', res);
}

test();
