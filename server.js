require('dotenv').config();
const express = require('express');

const app = express();

// --- NATIVE CORS WORKAROUND (No npm install required) ---
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allows requests from your GitHub Pages frontend
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  // Handle preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
// ---------------------------------------------------------

app.use(express.json());

// Health check route for Render & UptimeRobot
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// STK Push Endpoint matching your frontend
app.post('/api/stkpush', async (req, res) => {
  try {
    const { phone, amount, smartcard } = req.body;

    if (!phone || !amount || !smartcard) {
      return res.status(400).json({ error: 'Missing required parameters: phone, amount, or smartcard' });
    }

    // Convert local format (07... / 01...) to international format (254...) required by SmartPayPesa
    let formattedPhone = String(phone).trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.slice(1);
    }

    const payload = {
      phone: formattedPhone,
      amount: Number(amount),
      account_reference: `DStv_${smartcard}`
    };

    const response = await fetch(process.env.SMARTPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMARTPAY_API_KEY}`
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
