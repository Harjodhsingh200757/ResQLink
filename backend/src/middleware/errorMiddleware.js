function errorMiddleware(err, req, res, next) {
  console.error(`[Error Middleware] ${req.method} ${req.url} - ${err.message}`);

  const statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal server error occurred.';

  // Mask database / SQL / unhandled 500 errors to avoid exposing internal raw stack traces or SQL errors to users
  if (statusCode === 500 || err.routine || (err.message && (err.message.includes('missing FROM-clause') || err.message.includes('syntax error') || err.message.includes('relation') || err.message.includes('column')))) {
    errorCode = 'SERVICE_ERROR';
    message = 'Unable to process the ambulance request right now. Please try again.';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message
    }
  });
}

module.exports = errorMiddleware;
