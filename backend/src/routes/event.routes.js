const express = require('express');
const eventController = require('../controllers/event.controller');
const registrationController = require('../controllers/registration.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

const organiserOnly = [authenticate, authorize('organiser')];

// Public: anyone can browse
router.get('/', eventController.getEvents);

// Organiser's own routes. Declared before '/:id' so "mine" is not read as an id.
router.get('/mine', ...organiserOnly, eventController.getMyEvents);
router.get(
  '/mine/recent-registrations',
  ...organiserOnly,
  registrationController.getRecentRegistrations
);

// Attendee list of one event (ownership is checked in the controller)
router.get(
  '/:id/registrations',
  ...organiserOnly,
  registrationController.getEventRegistrations
);

router.get('/:id', eventController.getEventById);

// Organiser only
router.post('/', ...organiserOnly, eventController.createEvent);
router.put('/:id', ...organiserOnly, eventController.updateEvent);
router.delete('/:id', ...organiserOnly, eventController.deleteEvent);

module.exports = router;