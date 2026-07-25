const { readSession } = require('./_auth');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yhlyclbhmvpmdzjnwjhr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = readSession(req);
  if (!user) return res.status(401).json({ user: null, is_premium: false, demo_exam_attempts: 0 });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' });

  const telegramId = String(user.id || user.telegram_id || '');
  try {
    const url = `${SUPABASE_URL}/rest/v1/user_progress?telegram_id=eq.${encodeURIComponent(telegramId)}&select=is_premium,demo_exam_attempts&limit=1`;
    const response = await fetch(url, { headers: headers() });
    if (!response.ok) throw new Error(await response.text());
    const rows = await response.json();
    const access = rows[0] || {};
    return res.status(200).json({
      user,
      is_premium: Boolean(access.is_premium),
      demo_exam_attempts: Number(access.demo_exam_attempts || 0)
    });
  } catch (error) {
    console.error('User access lookup failed:', error);
    return res.status(500).json({ error: 'Could not load account access' });
  }
};
