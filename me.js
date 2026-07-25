const { readSession } = require('./_auth');
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = readSession(req);
  if (!user) return res.status(401).json({ user: null });
  return res.status(200).json({ user });
};
