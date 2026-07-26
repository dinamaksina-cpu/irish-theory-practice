const TELEGRAM_API = 'https://api.telegram.org';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
  const providedKey = req.query && req.query.key;

  if (!token) return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN is missing' });
  if (!setupSecret) return res.status(500).json({ ok: false, error: 'TELEGRAM_SETUP_SECRET is missing' });
  if (providedKey !== setupSecret) return res.status(401).json({ ok: false, error: 'Invalid setup key' });

  const baseUrl = (process.env.APP_URL || 'https://irish-theory-practice.vercel.app').replace(/\/$/, '');
  const webhookUrl = `${baseUrl}/api/telegram-webhook`;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: true,
        ...(webhookSecret ? { secret_token: webhookSecret } : {})
      })
    });
    const data = await response.json();
    return res.status(response.ok ? 200 : 502).json({ ...data, webhook_url: webhookUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Could not configure Telegram webhook' });
  }
};
