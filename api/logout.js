const { cookie } = require('./_auth');
module.exports = function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Set-Cookie', cookie('dtt_session', '', { maxAge: 0 }));
  return res.status(204).end();
};
