const logger = require('../logger');

const requestLogger = (req, res, next) => {
  const isLogsEndpoint = req.originalUrl.startsWith('/api/logs');

  if (!isLogsEndpoint) {
    const message = `${req.method} ${req.originalUrl}`;
    logger({ level: 'INFO', message, service: 'request' });
  }

  next();
};

module.exports = requestLogger;
