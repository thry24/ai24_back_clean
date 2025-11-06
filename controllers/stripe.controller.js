const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createOrGetCustomer = async (req, res) => {
  try {
    const { email, name, metadata } = req.body;
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0] || await stripe.customers.create({ email, name, metadata });
    res.json({ ok: true, customerId: customer.id });
  } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const { priceId, quantity = 1, mode = 'payment', customerEmail, successUrl, cancelUrl, metadata } = req.body;
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity }],
      customer_email: customerEmail,
      success_url: successUrl || `${process.env.FRONTEND_URL}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/pago-cancelado`,
      allow_promotion_codes: true,
      metadata
    });
    res.json({ ok: true, id: session.id, url: session.url });
  } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
};

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'mxn', customerId, receipt_email, metadata } = req.body;

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      receipt_email,
      metadata
    });
    res.json({ ok: true, clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
};

exports.createBillingPortalSession = async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || process.env.FRONTEND_URL
    });
    res.json({ ok: true, url: session.url });
  } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
};
