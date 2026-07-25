const { CLIENT_ID, CLIENT_SECRET, CALLBACK_URL, parseCookies, verifySignedCookie, cookie, createSession, verifyTelegramIdToken } = require('./_auth');

module.exports = async function handler(req, res) {
  const base = 'https://irish-theory-practice.vercel.app/';
  try {
    const { code, state, error } = req.query;
    if (error) throw new Error(String(error));
    if (!code || !state) throw new Error('Missing authorization code');
    const cookies = parseCookies(req);
    const expectedState = verifySignedCookie(cookies.tg_state);
    const verifier = verifySignedCookie(cookies.tg_verifier);
    const nonce = verifySignedCookie(cookies.tg_nonce);
    if (!expectedState || expectedState !== state || !verifier) throw new Error('Invalid or expired login request');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: CALLBACK_URL,
      client_id: CLIENT_ID,
      code_verifier: verifier
    });
    const tokenResponse = await fetch('https://oauth.telegram.org/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      },
      body
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.id_token) throw new Error(tokens.error_description || tokens.error || 'Telegram token exchange failed');
    const claims = await verifyTelegramIdToken(tokens.id_token, nonce);
    const user = {
      id: String(claims.sub || claims.id),
      telegram_id: claims.id || claims.sub,
      name: claims.name || claims.given_name || claims.preferred_username || 'Telegram user',
      preferred_username: claims.preferred_username || '',
      picture: claims.picture || ''
    };
    res.setHeader('Set-Cookie', [
      cookie('dtt_session', createSession(user), { maxAge: 60 * 60 * 24 * 30 }),
      cookie('tg_state', '', { maxAge: 0 }),
      cookie('tg_verifier', '', { maxAge: 0 }),
      cookie('tg_nonce', '', { maxAge: 0 })
    ]);
    res.redirect(302, `${base}?telegram_login=success`);
  } catch (err) {
    console.error(err);
    res.redirect(302, `${base}?telegram_login=error`);
  }
};
