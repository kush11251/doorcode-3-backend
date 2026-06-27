const User = require('../models/User');
const Event = require('../models/Event');
const Log = require('../models/Log');

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toMB = (bytes) => Number((bytes / 1024 / 1024).toFixed(2));

const diffMetrics = (todayCount, prevCount) => {
  const change = todayCount - prevCount;
  const percent = prevCount === 0 ? (todayCount > 0 ? 100 : 0) : Number(((change / prevCount) * 100).toFixed(2));
  return { todayCount, prevCount, change, percent };
};

exports.getDashboardMetrics = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);

    const [
      totalUsers,
      todayUsers,
      yesterdayUsers,
      totalEvents,
      todayEvents,
      yesterdayEvents,
      totalRequests,
      todayRequests,
      yesterdayRequests
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
      Event.countDocuments(),
      Event.countDocuments({ createdAt: { $gte: todayStart } }),
      Event.countDocuments({ createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
      Log.countDocuments({ service: 'request' }),
      Log.countDocuments({ service: 'request', createdAt: { $gte: todayStart } }),
      Log.countDocuments({ service: 'request', createdAt: { $gte: yesterdayStart, $lt: todayStart } })
    ]);

    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      statusCode: 200,
      data: {
        users: {
          total: totalUsers,
          ...diffMetrics(todayUsers, yesterdayUsers)
        },
        events: {
          total: totalEvents,
          ...diffMetrics(todayEvents, yesterdayEvents)
        },
        requests: {
          total: totalRequests,
          ...diffMetrics(todayRequests, yesterdayRequests)
        },
        memoryUsage: {
          rssMB: toMB(memoryUsage.rss),
          heapTotalMB: toMB(memoryUsage.heapTotal),
          heapUsedMB: toMB(memoryUsage.heapUsed),
          externalMB: toMB(memoryUsage.external),
          arrayBuffersMB: toMB(memoryUsage.arrayBuffers || 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Get organizer event metrics
// @route   GET /api/dashboard/organizer/:userId
// @access  Protected (admin or organizer)
exports.getOrganizerMetrics = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).select('userId role firstName lastName');

    console.log('User found:', user); // Debugging line

    if (!user) {
      return res.status(404).json({ statusCode: 404, message: 'User not found' });
    }

    if (user.role !== 'organizer') {
      return res.status(400).json({ statusCode: 400, message: 'User is not an organizer' });
    }

    const events = await Event.find({ organizerIds: userId }).select('eventId inviteeIds');
    const totalEvents = events.length;
    const totalInvitees = events.reduce((count, event) => {
      const filteredInvitees = Array.isArray(event.inviteeIds)
        ? event.inviteeIds.filter((inviteeId) => inviteeId !== userId)
        : [];
      return count + filteredInvitees.length;
    }, 0);

    res.status(200).json({
      statusCode: 200,
      data: {
        userId: user.userId,
        organizerName: `${user.firstName} ${user.lastName}`.trim(),
        totalEvents,
        totalInvitees
      }
    });
  } catch (error) {
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};
