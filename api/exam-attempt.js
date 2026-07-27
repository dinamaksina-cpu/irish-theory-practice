const { readSession } = require('./_auth');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yhlyclbhmvpmdzjnwjhr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FREE_EXAM_LIMIT = 3;

function headers(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = readSession(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized', demo_exam_attempts: 0 });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' });

  const telegramId = String(user.telegram_id || user.id || '');
  if (!telegramId) return res.status(400).json({ error: 'Telegram ID is missing' });

  try {
    const readUrl = `${SUPABASE_URL}/rest/v1/user_progress?telegram_id=eq.${encodeURIComponent(telegramId)}&select=is_premium,demo_exam_attempts,profile_data&limit=1`;
    const readResponse = await fetch(readUrl, { headers: headers() });
    if (!readResponse.ok) throw new Error(await readResponse.text());
    const rows = await readResponse.json();
    const current = rows[0] || {};

    if (current.is_premium) {
      return res.status(200).json({ is_premium: true, demo_exam_attempts: Number(current.demo_exam_attempts || 0) });
    }

    const attempts = Number(current.demo_exam_attempts || 0);
    if (attempts >= FREE_EXAM_LIMIT) {
      return res.status(403).json({ error: 'Demo exam limit reached', is_premium: false, demo_exam_attempts: attempts });
    }

    const nextAttempts = attempts + 1;
    const writeUrl = `${SUPABASE_URL}/rest/v1/user_progress?on_conflict=telegram_id`;
    const writeResponse = await fetch(writeUrl, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify([{
        telegram_id: telegramId,
        profile_data: current.profile_data || {},
        is_premium: false,
        demo_exam_attempts: nextAttempts,
        updated_at: new Date().toISOString()
      }])
    });
    if (!writeResponse.ok) throw new Error(await writeResponse.text());

    return res.status(200).json({ is_premium: false, demo_exam_attempts: nextAttempts });
  } catch (error) {
    console.error('Exam attempt API error:', error);
    return res.status(500).json({ error: 'Could not register exam attempt' });
  }
};
