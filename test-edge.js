async function run() {
  const url = 'https://dmtetjahbxedugszztla.supabase.co/functions/v1/whatsapp';
  const anonKey = 'sb_publishable_LI1Z-g6SAHi4GrBeQF3U3g_WHMDXbgg';

  const body = {
    action: 'sendTemplate',
    phone: '918766443100',
    template: 'otp',
    variables: ['123456']
  };

  console.log('Sending request to Edge Function...');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', data);
}

run();
