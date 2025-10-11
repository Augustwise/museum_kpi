const jwt = require('jsonwebtoken');

/**
 * Very small authentication middleware that expects a JSON Web Token in the
 * Authorization header. The goal is to keep the code easy to follow, so the
 * logic is written in a straightforward top-to-bottom style.
 */
module.exports = function authenticate(req, res, next) {
  const authorizationHeader = req.headers.authorization || '';
  const hasBearerPrefix = authorizationHeader.startsWith('Bearer ');
  const token = hasBearerPrefix ? authorizationHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authorization token is missing.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const payload = jwt.verify(token, secret);

    // Attach the payload to the request so later handlers can use it.
    req.user = payload;
    return next();
  } catch (error) {
    console.error('Failed to verify token:', error);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
