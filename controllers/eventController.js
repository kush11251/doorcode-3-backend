const Event = require('../models/Event');
const User = require('../models/User');
const logger = require('../logger');

const resolveUserIds = async ({ ids = [], emails = [] }) => {
  const validIds = Array.isArray(ids) ? ids : [];
  const normalizedEmails = Array.isArray(emails) ? emails : [];
  const usersById = validIds.length > 0 ? await User.find({ userId: { $in: validIds } }).select('userId') : [];
  const foundIds = usersById.map((user) => user.userId);
  const invalidIds = validIds.filter((id) => !foundIds.includes(id));

  if (normalizedEmails.length > 0) {
    const usersByEmail = await User.find({ email: { $in: normalizedEmails } }).select('userId email');
    const emailToId = usersByEmail.reduce((map, user) => {
      map[user.email] = user.userId;
      return map;
    }, {});
    const invalidEmails = normalizedEmails.filter((email) => !emailToId[email]);
    if (invalidIds.length > 0 || invalidEmails.length > 0) {
      const errors = [];
      if (invalidIds.length > 0) errors.push(`Invalid userIds: ${invalidIds.join(', ')}`);
      if (invalidEmails.length > 0) errors.push(`Invalid emails: ${invalidEmails.join(', ')}`);
      throw new Error(errors.join('; '));
    }
    const resolvedEmailIds = normalizedEmails.map((email) => emailToId[email]);
    return Array.from(new Set([...foundIds, ...resolvedEmailIds]));
  }

  if (invalidIds.length > 0) {
    throw new Error(`Invalid userIds: ${invalidIds.join(', ')}`);
  }

  return Array.from(new Set(foundIds));
};

const getUserDetailsByIds = async (ids = []) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const users = await User.find({ userId: { $in: ids } }).select('userId firstName lastName email phoneNumber role');

  return users.map((user) => ({
    userId: user.userId,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role
  }));
};

const mapEventToUsers = async (eventId, userIds = []) => {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  await User.updateMany(
    { userId: { $in: userIds } },
    { $addToSet: { events: eventId } }
  );
};

const unmapEventFromUsers = async (eventId, userIds = []) => {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  await User.updateMany(
    { userId: { $in: userIds } },
    { $pull: { events: eventId } }
  );
};

const unmapEventFromAllUsers = async (eventId) => {
  if (!eventId) return;
  await User.updateMany(
    { events: eventId },
    { $pull: { events: eventId } }
  );
};

const mergeParticipantIds = (organizerIds = [], inviteeIds = []) =>
  Array.from(new Set([...(organizerIds || []), ...(inviteeIds || [])]));

// @desc    Create new event
// @route   POST /api/events
// @access  Protected
exports.createEvent = async (req, res) => {
  try {
    const eventData = req.body;
    const creatorId = req.user.userId || '';

    const organizerIds = await resolveUserIds({
      ids: eventData.organizerIds,
      emails: eventData.organizerEmails
    });
    const inviteeIds = await resolveUserIds({
      ids: eventData.inviteeIds,
      emails: eventData.inviteeEmails
    });

    const finalOrganizerIds = creatorId ? Array.from(new Set([...organizerIds, creatorId])) : organizerIds;
    const finalInviteeIds = creatorId ? Array.from(new Set([...inviteeIds, creatorId])) : inviteeIds;

    const event = await Event.create({
      ...eventData,
      organizerIds: finalOrganizerIds,
      inviteeIds: finalInviteeIds,
      metadata: { createdBy: creatorId, updatedBy: creatorId }
    });

    const mappedParticipants = mergeParticipantIds(finalOrganizerIds, finalInviteeIds);
    await mapEventToUsers(event.eventId, mappedParticipants);

    await logger({ level: 'INFO', message: `Event created: ${event.eventId}`, service: 'event-service' });
    res.status(201).json({ statusCode: 201, message: 'Event created successfully', data: event });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Create event failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Protected
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({}).sort({ startDateTime: 1 });
    await logger({ level: 'INFO', message: 'Retrieved all events', service: 'event-service' });
    res.status(200).json({ statusCode: 200, count: events.length, data: events });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get events failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Get events for a specific user
// @route   GET /api/events/user/:userId
// @access  Protected
exports.getEventsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    if (!user) {
      await logger({ level: 'WARNING', message: `User not found for event lookup: ${userId}`, service: 'event-service' });
      return res.status(404).json({ statusCode: 404, message: 'User not found' });
    }

    const events = await Event.find({ eventId: { $in: user.events || [] } }).sort({ startDateTime: 1 });

    await logger({ level: 'INFO', message: `Retrieved mapped events for user: ${userId}`, service: 'event-service' });
    res.status(200).json({ statusCode: 200, count: events.length, data: events });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get events for user failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Get all invitees across events for an organizer
// @route   GET /api/events/organizer/:userId/invitees
// @access  Protected
exports.getOrganizerInvitees = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).select('userId role firstName lastName');

    if (!user) {
      return res.status(404).json({ statusCode: 404, message: 'User not found' });
    }

    if (user.role !== 'organizer') {
      return res.status(400).json({ statusCode: 400, message: 'User is not an organizer' });
    }

    const events = await Event.find({ organizerIds: userId }).select('eventCode inviteeIds');
    const inviteeIds = Array.from(new Set(events.flatMap((event) => event.inviteeIds || [])));
    const invitees = await User.find({ userId: { $in: inviteeIds } }).select('userId firstName lastName email phoneNumber role');
    const inviteeMap = invitees.reduce((map, invitee) => {
      map[invitee.userId] = invitee;
      return map;
    }, {});

    const data = events.flatMap((event) =>
      (event.inviteeIds || []).map((inviteeId) => {
        const invitee = inviteeMap[inviteeId];
        if (!invitee) return null;
        return {
          eventCode: event.eventCode,
          userId: invitee.userId,
          fullName: `${invitee.firstName} ${invitee.lastName}`.trim(),
          email: invitee.email,
          phoneNumber: invitee.phoneNumber,
          role: invitee.role
        };
      }).filter(Boolean)
    );

    await logger({ level: 'INFO', message: `Retrieved invitees for organizer: ${userId}`, service: 'event-service' });
    res.status(200).json({ statusCode: 200, count: data.length, data });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get organizer invitees failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Get invitee details for a single event
// @route   GET /api/events/:eventId/invitees/details
// @access  Protected
exports.getEventInviteeDetails = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ eventId }).select('eventCode inviteeIds');

    if (!event) {
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    const inviteeIds = Array.from(new Set(event.inviteeIds || []));
    const invitees = await User.find({ userId: { $in: inviteeIds } }).select('userId firstName lastName email phoneNumber role');

    const data = invitees.map((invitee) => ({
      eventCode: event.eventCode,
      userId: invitee.userId,
      fullName: `${invitee.firstName} ${invitee.lastName}`.trim(),
      email: invitee.email,
      phoneNumber: invitee.phoneNumber,
      role: invitee.role
    }));

    await logger({ level: 'INFO', message: `Retrieved invitees for event: ${eventId}`, service: 'event-service' });
    res.status(200).json({ statusCode: 200, count: data.length, data });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get event invitee details failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Get single event by id
// @route   GET /api/events/:eventId
// @access  Protected
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) {
      await logger({ level: 'WARNING', message: `Event not found: ${req.params.eventId}`, service: 'event-service' });
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    const organizerDetails = await getUserDetailsByIds(event.organizerIds);
    const inviteeDetails = await getUserDetailsByIds(event.inviteeIds);
    const enhancedEvent = {
      ...event.toObject(),
      organizerDetails,
      inviteeDetails
    };

    await logger({ level: 'INFO', message: `Retrieved event: ${req.params.eventId}`, service: 'event-service' });
    res.status(200).json({ statusCode: 200, data: enhancedEvent });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get event failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Update event
// @route   PATCH /api/events/:eventId
// @access  Protected
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) {
      await logger({ level: 'WARNING', message: `Update event failed, not found: ${req.params.eventId}`, service: 'event-service' });
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    const previousParticipantIds = mergeParticipantIds(event.organizerIds, event.inviteeIds);

    Object.assign(event, req.body, { metadata: { ...event.metadata, updatedBy: req.user.userId || '' } });

    if (req.body.organizerIds || req.body.inviteeIds) {
      const newParticipantIds = mergeParticipantIds(event.organizerIds, event.inviteeIds);
      const addedIds = newParticipantIds.filter((id) => !previousParticipantIds.includes(id));
      const removedIds = previousParticipantIds.filter((id) => !newParticipantIds.includes(id));

      await mapEventToUsers(event.eventId, addedIds);
      await unmapEventFromUsers(event.eventId, removedIds);
    }

    await event.save();

    await logger({ level: 'INFO', message: `Updated event: ${event.eventId}`, service: 'event-service' });
    res.status(200).json({ statusCode: 200, message: 'Event updated successfully', data: event });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Update event failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Delete event and remove mapping from all users
// @route   DELETE /api/events/:eventId
// @access  Protected
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) {
      await logger({ level: 'WARNING', message: `Delete event failed, not found: ${req.params.eventId}`, service: 'event-service' });
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    await Event.deleteOne({ eventId: req.params.eventId });
    await unmapEventFromAllUsers(req.params.eventId);

    await logger({ level: 'INFO', message: `Deleted event: ${req.params.eventId}`, service: 'event-service' });
    res.status(200).json({ statusCode: 200, message: 'Event deleted successfully' });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Delete event failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Add invitee to event
// @route   POST /api/events/:eventId/invitees
// @access  Protected
exports.addInvitee = async (req, res) => {
  try {
    const { inviteeId, inviteeEmail } = req.body;
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) {
      await logger({ level: 'WARNING', message: `Add invitee failed, event not found: ${req.params.eventId}`, service: 'event-service' });
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    if (!inviteeId && !inviteeEmail) {
      return res.status(400).json({ statusCode: 400, message: 'inviteeId or inviteeEmail is required' });
    }

    const resolvedInviteeIds = await resolveUserIds({
      ids: inviteeId ? [inviteeId] : [],
      emails: inviteeEmail ? [inviteeEmail] : []
    });
    const resolvedInviteeId = resolvedInviteeIds[0];

    if (!event.inviteeIds.includes(resolvedInviteeId)) {
      event.inviteeIds.push(resolvedInviteeId);
    }

    await mapEventToUsers(event.eventId, [resolvedInviteeId]);
    await event.save();
    await logger({ level: 'INFO', message: `Added invitee ${resolvedInviteeId} to event ${event.eventId}`, service: 'event-service' });
    res.status(200).json({ statusCode: 200, message: 'Invitee added successfully'});
  } catch (error) {
    await logger({ level: 'ERROR', message: `Add invitee failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Add organizer to event
// @route   POST /api/events/:eventId/organizers
// @access  Protected
exports.addOrganizer = async (req, res) => {
  try {
    const { organizerId, organizerEmail } = req.body;
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) {
      await logger({ level: 'WARNING', message: `Add organizer failed, event not found: ${req.params.eventId}`, service: 'event-service' });
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    if (!organizerId && !organizerEmail) {
      return res.status(400).json({ statusCode: 400, message: 'organizerId or organizerEmail is required' });
    }

    const resolvedOrganizerIds = await resolveUserIds({
      ids: organizerId ? [organizerId] : [],
      emails: organizerEmail ? [organizerEmail] : []
    });
    const resolvedOrganizerId = resolvedOrganizerIds[0];

    if (!event.organizerIds.includes(resolvedOrganizerId)) {
      event.organizerIds.push(resolvedOrganizerId);
    }

    await mapEventToUsers(event.eventId, [resolvedOrganizerId]);
    await event.save();
    await logger({ level: 'INFO', message: `Added organizer ${resolvedOrganizerId} to event ${event.eventId}`, service: 'event-service' });
    res.status(200).json({ statusCode: 200, message: 'Organizer added successfully'});
  } catch (error) {
    await logger({ level: 'ERROR', message: `Add organizer failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Add activity to event
// @route   POST /api/events/:eventId/activities
// @access  Protected
exports.addActivity = async (req, res) => {
  try {
    const activity = req.body;
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) {
      await logger({ level: 'WARNING', message: `Add activity failed, event not found: ${req.params.eventId}`, service: 'event-service' });
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    event.activities.push(activity);
    await event.save();
    await logger({ level: 'INFO', message: `Added activity to event ${event.eventId}`, service: 'event-service' });
    res.status(200).json({ statusCode: 200, message: 'Activity added successfully' });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Add activity failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    View all invitees for an event
// @route   GET /api/events/:eventId/invitees
// @access  Protected
exports.getEventInvitees = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) {
      await logger({ level: 'WARNING', message: `Get invitees failed, event not found: ${req.params.eventId}`, service: 'event-service' });
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    res.status(200).json({ statusCode: 200, count: event.inviteeIds.length, data: event.inviteeIds });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get invitees failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    View all organizers for an event
// @route   GET /api/events/:eventId/organizers
// @access  Protected
exports.getEventOrganizers = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) {
      await logger({ level: 'WARNING', message: `Get organizers failed, event not found: ${req.params.eventId}`, service: 'event-service' });
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    res.status(200).json({ statusCode: 200, count: event.organizerIds.length, data: event.organizerIds });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get organizers failed: ${error.message}`, service: 'event-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};
