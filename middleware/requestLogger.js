const logger = require('../logger');

const requestLogger = (req, res, next) => {
  const isLogsEndpoint = req.originalUrl.startsWith('/api/logs');

  if (isLogsEndpoint) {
    return next();
  }

  const startTime = Date.now();
  const requestData = {
    method: req.method,
    url: req.originalUrl,
    headers: {
      origin: req.headers.origin || '',
      referer: req.headers.referer || '',
      userAgent: req.headers['user-agent'] || '',
      contentType: req.headers['content-type'] || ''
    },
    query: req.query || {},
    params: req.params || {},
    body: req.body || {}
  };

  const origin = req.headers.origin || req.headers.referer || '';
  const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  const metadata = {
    protocol: req.protocol,
    hostname: req.hostname,
    secure: req.secure,
    forwarded: req.headers['x-forwarded-for'] || ''
  };

  const originalSend = res.send.bind(res);
  let responseBody;

  res.send = function (body) {
    responseBody = body;
    return originalSend(body);
  };

  res.on('finish', async () => {
    const responseData = {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseTimeMs: Date.now() - startTime,
      body: responseBody
    };

    await logger({
      level: 'INFO',
      message: `${req.method} ${req.originalUrl} -> ${res.statusCode}`,
      service: 'request',
      request: requestData,
      response: responseData,
      origin,
      ipAddress,
      metadata
    });
  });

  next();
};

module.exports = requestLogger;
