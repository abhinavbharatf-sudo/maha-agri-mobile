const fetch = global.fetch || require('node-fetch');

async function runTest() {
    const webhookUrl = 'https://webhook.whatapi.in/webhook/6a59ab0c6f1a8bf9dd94b669';
    const payload = {
      phone: '919999999999',
      type: 'welcome'
    };

    console.log('Sending payload to Webhook...');
    console.log(JSON.stringify(payload, null, 2));

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        
        const text = await res.text();
        console.log('--- RESPONSE ---');
        console.log('Status:', res.status);
        console.log('Body:', text);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}
runTest();
