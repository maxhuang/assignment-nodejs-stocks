/**
 * Returns an error message as specified with the provided
 * statusCode and errorMessage
 * @param {Object} res
 * @param {Number} statusCode
 * @param {String} errorMessage
 */
function errorResponse(res, statusCode, errorMessage) {
  res.status(statusCode)
    .json({
      error: true,
      message: errorMessage
    });
}

module.exports = errorResponse;
