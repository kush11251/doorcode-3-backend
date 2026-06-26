const { createLog } = require('./controllers/logController');

const logLevels = ['INFO', 'WARNING', 'ERROR'];

const logger = async ({ level = 'INFO', message, service = 'unknown' }) => {
  if (!message) {
    throw new Error('Logger requires a message');
  }

  if (!logLevels.includes(level)) {
    throw new Error(`Invalid log level: ${level}`);
  }

  try {
    await createLog({ level, message, service });
  } catch (error) {
    console.error('Failed to create log:', error);
  }
};

module.exports = logger;
