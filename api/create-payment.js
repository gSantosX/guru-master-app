import Stripe from 'stripe';

// In a real Vercel environment, these come from Environment Variables:
// process.env.STRIPE_SECRET_KEY
// Assuming the user hasn't generated one yet, so we leave it empty/mocked for now, 
// but code is structured for production.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_PLACEHOLDER');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body;

    // Create a PaymentIntent with the final exact price
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2990, // R$ 29,90 represented in cents
      currency: 'brl',
      payment_method_types: ['card', 'pix'],
      receipt_email: email,
      metadata: { integration_check: 'guru_master_native', user_email: email },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error('Stripe API Error:', err);
    res.status(500).json({ error: err.message });
  }
}
