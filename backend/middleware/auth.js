const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next){
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if(!token) return res.status(401).json({ msg: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ msg: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;