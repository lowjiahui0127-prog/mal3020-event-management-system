const express = require('express');
const eventController = require('../controllers/event.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

const organiserOnly = [authenticate, authorize('organiser')];

// Public: anyone can browse
router.get('/', eventController.getEvents);

// Organiser's own events, including drafts and past events.
// Must be declared before '/:id', otherwise "mine" is treated as an id.
router.get('/mine', ...organiserOnly, eventController.getMyEvents);

router.get('/:id', eventController.getEventById);

// Organiser only
router.post('/', ...organiserOnly, eventController.createEvent);
router.put('/:id', ...organiserOnly, eventController.updateEvent);
router.delete('/:id', ...organiserOnly, eventController.deleteEvent);

module.exports = router;