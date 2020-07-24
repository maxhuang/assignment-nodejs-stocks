const jwt = require("jsonwebtoken");

const errorResponse = require("./errorTools");

/**
 * Returns true if the given token is valid
 * @param {String} authToken
 */
function authVerify(authToken) {
  const secretKey = process.env.SECRET_KEY;

  try {
    const decoded = jwt.verify(authToken, secretKey);
    return decoded.exp > Date.now();
  } catch (err) {
    // Invalid token
    return false;
  }
}

module.exports = authVerify;
