const crypto = require('crypto');

const CLIENT_ID = process.env.TELEGRAM_CLIENT_ID;
const CLIENT_SECRET = process.env.TELEGRAM_CLIENT_SECRET;
const CALLBACK_URL = process.env.TELEGRAM_REDIRECT_URI || 'https://irish-theory-practice.vercel.app/auth/telegram/callback';
const COOKIE_SECRET = process.env.APP_SESSION_SECRET || CLIENT_SECRET;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}
function random(size = 32) {
  return crypto.randomBytes(size).toString('base64url');
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('base64url');
}
function sign(value) {
  return crypto.createHmac('sha256', COOKIE_SECRET).update(value).digest('base64url');
}
function signedCookie(value) {
  return `${value}.${sign(value)}`;
}
function verifySignedCookie(raw) {
  if (!raw) return null;
  const index = raw.lastIndexOf('.');
  if (index < 1) return null;
  const value = raw.slice(0, index);
  const signature = raw.slice(index + 1);
  const expected = sign(value);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return value;
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [decodeURIComponent(part.slice(0, index).trim()), decodeURIComponent(part.slice(index + 1))];
  }));
}
function cookie(name, value, options = {}) {
  const attrs = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax'];
  if (options.maxAge !== undefined) attrs.push(`Max-Age=${options.maxAge}`);
  return attrs.join('; ');
}
function createSession(user) {
  const payload = base64url(JSON.stringify({ user, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }));
  return signedCookie(payload);
}
function readSession(req) {
  const cookies = parseCookies(req);
  const payload = verifySignedCookie(cookies.dtt_session);
  if (!payload) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.user || null;
  } catch {
    return null;
  }
}
async function verifyTelegramIdToken(token, nonce) {
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  if (!headerPart || !payloadPart || !signaturePart) throw new Error('Invalid ID token');
  const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
  const jwksResponse = await fetch('https://oauth.telegram.org/.well-known/jwks.json');
  if (!jwksResponse.ok) throw new Error('Could not load Telegram keys');
  const jwks = await jwksResponse.json();
  const jwk = jwks.keys.find(key => key.kid === header.kid && key.alg === 'RS256');
  if (!jwk) throw new Error('Telegram signing key not found');
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const verified = crypto.verify('RSA-SHA256', Buffer.from(`${headerPart}.${payloadPart}`), publicKey, Buffer.from(signaturePart, 'base64url'));
  if (!verified) throw new Error('Invalid Telegram signature');
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== 'https://oauth.telegram.org') throw new Error('Invalid issuer');
  const audience = Array.isArray(payload.aud) ? payload.aud : [String(payload.aud)];
  if (!audience.includes(String(CLIENT_ID))) throw new Error('Invalid audience');
  if (!payload.exp || payload.exp < now) throw new Error('Expired ID token');
  if (nonce && payload.nonce !== nonce) throw new Error('Invalid nonce');
  return payload;
}

module.exports = { CLIENT_ID, CLIENT_SECRET, CALLBACK_URL, random, sha256, signedCookie, verifySignedCookie, parseCookies, cookie, createSession, readSession, verifyTelegramIdToken };
