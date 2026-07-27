const { readSession } = require('./_auth');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yhlyclbhmvpmdzjnwjhr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' });

  const telegramId = String(user.telegram_id || user.id || '');
  if (!telegramId) return res.status(400).json({ error: 'Telegram ID is missing' });

  try {
    if (req.method === 'GET') {
      const url = `${SUPABASE_URL}/rest/v1/user_progress?telegram_id=eq.${encodeURIComponent(telegramId)}&select=profile_data,updated_at&limit=1`;
      const response = await fetch(url, { headers: headers() });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      if (!rows.length) return res.status(404).json({ profile_data: null });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PUT') {
      const profileData = req.body?.profile_data;
      if (!profileData || typeof profileData !== 'object') return res.status(400).json({ error: 'Invalid profile_data' });
      const serialized = JSON.stringify(profileData);
      if (Buffer.byteLength(serialized, 'utf8') > 1_000_000) return res.status(413).json({ error: 'Progress data is too large' });

      const url = `${SUPABASE_URL}/rest/v1/user_progress?on_conflict=telegram_id`;
      const response = await fetch(url, {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify([{ telegram_id: telegramId, profile_data: profileData, updated_at: new Date().toISOString() }])
      });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      return res.status(200).json(rows[0] || { ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Progress API error:', error);
    return res.status(500).json({ error: 'Progress synchronization failed' });
  }
};
