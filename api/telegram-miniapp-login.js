const crypto = require('crypto');
const { cookie, createSession } = require('./_auth');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MAX_AGE_SECONDS = 24 * 60 * 60;

function verifyInitData(initData) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is missing');
  if (!initData || typeof initData !== 'string') throw new Error('Telegram initData is missing');

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  const authDate = Number(params.get('auth_date'));
  if (!receivedHash || !authDate) throw new Error('Invalid Telegram initData');
  if (Math.abs(Math.floor(Date.now() / 1000) - authDate) > MAX_AGE_SECONDS) throw new Error('Telegram initData has expired');

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const received = Buffer.from(receivedHash, 'hex');
  const calculated = Buffer.from(calculatedHash, 'hex');
  if (received.length !== calculated.length || !crypto.timingSafeEqual(received, calculated)) throw new Error('Invalid Telegram signature');

  const rawUser = params.get('user');
  if (!rawUser) throw new Error('Telegram user is missing');
  return JSON.parse(rawUser);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const telegramUser = verifyInitData(req.body?.initData);
    const user = {
      id: String(telegramUser.id),
      telegram_id: String(telegramUser.id),
      name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || telegramUser.username || 'Telegram user',
      preferred_username: telegramUser.username || '',
      username: telegramUser.username || '',
      picture: telegramUser.photo_url || '',
      photo_url: telegramUser.photo_url || '',
      language_code: telegramUser.language_code || '',
      is_premium: Boolean(telegramUser.is_premium),
      telegram_premium: Boolean(telegramUser.is_premium)
    };
    res.setHeader('Set-Cookie', cookie('dtt_session', createSession(user), { maxAge: 60 * 60 * 24 * 30 }));
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Telegram Mini App login failed:', error);
    return res.status(401).json({ error: error.message || 'Telegram login failed' });
  }
};
