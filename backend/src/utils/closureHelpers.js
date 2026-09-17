/**
 * Creates an in-memory sliding-window rate limiter using JavaScript Closures.
 * @param {number} maxRequests - Max requests allowed per window
 * @param {number} windowMs - Window duration in milliseconds
 * @returns {Function} Rate limiter function
 */
function createRateLimiter(maxRequests = 10, windowMs = 60000) {
  const requestLogs = new Map();

  return function rateLimiterMiddleware(key) {
    const now = Date.now();
    const timestamps = requestLogs.get(key) || [];
    
    // Filter out timestamps outside the window
    const validTimestamps = timestamps.filter(time => now - time < windowMs);

    if (validTimestamps.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTimeMs: windowMs - (now - validTimestamps[0])
      };
    }

    validTimestamps.push(now);
    requestLogs.set(key, validTimestamps);

    return {
      allowed: true,
      remaining: maxRequests - validTimestamps.length,
      resetTimeMs: 0
    };
  };
}

/**
 * Creates a debounced function wrapper using Closure context to preserve timer state.
 * @param {Function} func 
 * @param {number} waitMs 
 * @returns {Function}
 */
function createDebouncedFunction(func, waitMs = 300) {
  let timeoutId = null;

  return function (...args) {
    const context = this;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, waitMs);
  };
}

module.exports = {
  createRateLimiter,
  createDebouncedFunction
};
