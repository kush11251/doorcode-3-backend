const express = require('express');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  addInvitee,
  addOrganizer,
  addActivity,
  getEventInvitees,
  getEventOrganizers,
  getEventsForUser,
  getOrganizerInvitees,
  getEventInviteeDetails
} = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getEvents);
router.post('/', protect, createEvent);
router.get('/user/:userId', protect, getEventsForUser);
router.get('/organizer/:userId/invitees', protect, getOrganizerInvitees);
router.get('/:eventId/invitees/details', protect, getEventInviteeDetails);
router.get('/:eventId', protect, getEventById);
router.patch('/:eventId', protect, updateEvent);
router.delete('/:eventId', protect, deleteEvent);
router.post('/:eventId/invitees', protect, addInvitee);
router.post('/:eventId/organizers', protect, addOrganizer);
router.post('/:eventId/activities', protect, addActivity);
router.get('/:eventId/invitees', protect, getEventInvitees);
router.get('/:eventId/organizers', protect, getEventOrganizers);

module.exports = router;
