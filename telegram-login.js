const { CLIENT_ID, CALLBACK_URL, random, sha256, signedCookie, cookie } = require('./_auth');

module.exports = async function handler(req, res) {
  if (!CLIENT_ID) return res.status(500).send('TELEGRAM_CLIENT_ID is missing');
  const state = random(24);
  const verifier = random(48);
  const nonce = random(24);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    response_type: 'code',
    scope: 'openid profile telegram:bot_access',
    state,
    nonce,
    code_challenge: sha256(verifier),
    code_challenge_method: 'S256'
  });
  res.setHeader('Set-Cookie', [
    cookie('tg_state', signedCookie(state), { maxAge: 600 }),
    cookie('tg_verifier', signedCookie(verifier), { maxAge: 600 }),
    cookie('tg_nonce', signedCookie(nonce), { maxAge: 600 })
  ]);
  res.redirect(302, `https://oauth.telegram.org/auth?${params.toString()}`);
};
