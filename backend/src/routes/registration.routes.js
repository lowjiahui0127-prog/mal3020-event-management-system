const express = require('express');
const registrationController = require('../controllers/registration.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

const attendeeOnly = [authenticate, authorize('attendee')];

router.post('/', ...attendeeOnly, registrationController.registerForEvent);

// Must be declared before '/:id'
router.get('/mine', ...attendeeOnly, registrationController.getMyRegistrations);

router.get('/:id', ...attendeeOnly, registrationController.getRegistrationById);
router.patch(
  '/:id/cancel',
  ...attendeeOnly,
  registrationController.cancelRegistration
);

module.exports = router;