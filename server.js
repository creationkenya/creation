require('dotenv').config();
const express = require('express');

const app = express();

// --- NATIVE CORS WORKAROUND ---
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10kb' }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// STK Push Endpoint for PayWave Express
app.post('/api/stkpush', async (req, res) => {
  try {
    const { phone, amount, smartcard } = req.body;

    if (!phone || !amount || !smartcard) {
      return res.status(400).json({ error: 'Missing required parameters: phone, amount, or smartcard' });
    }

    // Prepare payload according to PayWave Express specification
    const payload = {
      api_key: process.env.PAYWAVE_API_KEY,
      email: process.env.PAYWAVE_EMAIL,
      amount: String(amount), // PayWave expects string or number, string matches curl example
      msisdn: String(phone),  // PayWave accepts local format like 0712345678 directly
      reference: `DStv_${smartcard}`
    };

    const response = await fetch('https://paywavexpress.co.ke/v1/stkpush', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('STK Push Error:', error);
    return res.status(500).json({ error: 'Failed to process STK push', details: error.message });
  }
});

// Optional: Add a Transaction Status checking endpoint
app.post('/api/tstatus', async (req, res) => {
  try {
    const { transaction_request_id } = req.body;

    if (!transaction_request_id) {
      return res.status(400).json({ error: 'Missing required parameter: transaction_request_id' });
    }

    const payload = {
      api_key: process.env.PAYWAVE_API_KEY,
      email: process.env.PAYWAVE_EMAIL,
      transaction_request_id
    };

    const response = await fetch('https://paywavexpress.co.ke/v1/tstatus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Transaction Status Error:', error);
    return res.status(500).json({ error: 'Failed to check transaction status', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
