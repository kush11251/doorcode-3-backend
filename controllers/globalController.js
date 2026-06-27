const GlobalControl = require('../models/GlobalControl');
const logger = require('../logger');

const getGlobalControlDocument = async () => {
  let config = await GlobalControl.findOne();
  if (!config) {
    config = await GlobalControl.create({});
  }
  return config;
};

exports.getGlobalControl = async (req, res) => {
  try {
    const config = await getGlobalControlDocument();
    res.status(200).json({ statusCode: 200, data: config });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get global control failed: ${error.message}`, service: 'global-control' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

exports.updateGlobalControl = async (req, res) => {
  try {
    const updates = req.body;
    const config = await getGlobalControlDocument();
    Object.assign(config, updates, { metadata: { updatedBy: req.user.userId || '' } });
    await config.save();

    await logger({ level: 'INFO', message: `Updated global control`, service: 'global-control' });
    res.status(200).json({ statusCode: 200, data: config });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Update global control failed: ${error.message}`, service: 'global-control' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};
