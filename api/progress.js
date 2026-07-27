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

function progressCount(payload) {
  if (!payload || typeof payload !== 'object' || !payload.profiles || typeof payload.profiles !== 'object') return 0;
  return Object.values(payload.profiles).reduce((sum, profile) => {
    if (!profile || typeof profile !== 'object') return sum;
    return sum
      + (Array.isArray(profile.answered) ? profile.answered.length : 0)
      + (Array.isArray(profile.correct) ? profile.correct.length : 0)
      + (Array.isArray(profile.mistakes) ? profile.mistakes.length : 0)
      + (Array.isArray(profile.favorites) ? profile.favorites.length : 0)
      + (Array.isArray(profile.examScores) ? profile.examScores.length : 0);
  }, 0);
}

async function getRow(id) {
  if (!id) return null;
  const url = `${SUPABASE_URL}/rest/v1/user_progress?telegram_id=eq.${encodeURIComponent(id)}&select=telegram_id,profile_data,updated_at,is_premium,demo_exam_attempts&limit=1`;
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows[0] || null;
}

async function upsertRow(id, profileData, extra = {}) {
  const url = `${SUPABASE_URL}/rest/v1/user_progress?on_conflict=telegram_id`;
  const response = await fetch(url, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify([{ telegram_id: id, profile_data: profileData, updated_at: new Date().toISOString(), ...extra }])
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows[0] || { ok: true };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' });

  const telegramId = String(user.telegram_id || user.id || '');
  const legacyId = user.oidc_sub ? String(user.oidc_sub) : '';
  if (!telegramId) return res.status(400).json({ error: 'Telegram ID is missing' });

  try {
    if (req.method === 'GET') {
      let row = await getRow(telegramId);
      if (!row && legacyId && legacyId !== telegramId) {
        const legacy = await getRow(legacyId);
        if (legacy) {
          row = await upsertRow(telegramId, legacy.profile_data || {}, {
            is_premium: Boolean(legacy.is_premium),
            demo_exam_attempts: Number(legacy.demo_exam_attempts || 0)
          });
        }
      }
      if (!row) return res.status(404).json({ profile_data: null });
      return res.status(200).json(row);
    }

    if (req.method === 'PUT') {
      const profileData = req.body?.profile_data;
      if (!profileData || typeof profileData !== 'object') return res.status(400).json({ error: 'Invalid profile_data' });
      const serialized = JSON.stringify(profileData);
      if (Buffer.byteLength(serialized, 'utf8') > 1_000_000) return res.status(413).json({ error: 'Progress data is too large' });

      const existing = await getRow(telegramId);
      const incomingCount = progressCount(profileData);
      const existingCount = progressCount(existing?.profile_data);
      if (existingCount > 0 && incomingCount === 0) {
        return res.status(409).json({ error: 'Refusing to overwrite non-empty cloud progress with empty progress' });
      }

      const row = await upsertRow(telegramId, profileData);
      return res.status(200).json(row);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Progress API error:', error);
    return res.status(500).json({ error: 'Progress synchronization failed' });
  }
};
