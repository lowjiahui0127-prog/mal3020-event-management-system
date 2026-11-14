const mongoose = require('mongoose');
const Event = require('../models/event.model');
const Registration = require('../models/registration.model');

// Event fields returned together with a registration
const EVENT_FIELDS =
  'title date endDate location status capacity registeredCount';

function conflict(res, message) {
  return res.status(409).json({ success: false, message });
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function notFound(res, message) {
  return res.status(404).json({ success: false, message });
}

function handleError(res, error, fallbackMessage) {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return badRequest(res, error.message);
  }

  console.error(fallbackMessage, error.message);

  return res.status(500).json({
    success: false,
    message: fallbackMessage
  });
}

// POST /api/registrations (attendee only)
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.body || {};

    if (typeof eventId !== 'string' || !mongoose.isValidObjectId(eventId)) {
      return badRequest(res, 'A valid event id is required');
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return notFound(res, 'Event not found');
    }

    if (event.status !== 'published') {
      return conflict(res, 'This event is not open for registration');
    }

    if (event.endDate <= new Date()) {
      return conflict(res, 'This event has already ended');
    }

    const alreadyRegistered = await Registration.exists({
      user: req.user._id,
      event: event._id,
      status: 'confirmed'
    });

    if (alreadyRegistered) {
      return conflict(res, 'You are already registered for this event');
    }

    // Reserve a seat in ONE atomic step: the count is only increased if there
    // is still room. Two attendees clicking at the same moment can never both
    // take the last seat. ($ifNull covers events created before this field existed.)
    const reserved = await Event.findOneAndUpdate(
      {
        _id: event._id,
        status: 'published',
        $expr: { $lt: [{ $ifNull: ['$registeredCount', 0] }, '$capacity'] }
      },
      { $inc: { registeredCount: 1 } }
    );

    if (!reserved) {
      return conflict(res, 'This event is fully booked');
    }

    let registration;

    try {
      // Re-registering after a cancellation: reuse the cancelled record
      registration = await Registration.findOneAndUpdate(
        { user: req.user._id, event: event._id, status: 'cancelled' },
        {
          $set: { status: 'confirmed', registeredAt: new Date() },
          $unset: { cancelledAt: 1 }
        },
        { returnDocument: 'after' }
      );

      if (!registration) {
        registration = await Registration.create({
          user: req.user._id,
          event: event._id
        });
      }
    } catch (error) {
      // Saving failed: give the seat back
      await Event.updateOne(
        { _id: event._id, registeredCount: { $gt: 0 } },
        { $inc: { registeredCount: -1 } }
      );

      if (error.code === 11000) {
        return conflict(res, 'You are already registered for this event');
      }

      throw error;
    }

    await registration.populate('event', EVENT_FIELDS);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: registration
    });
  } catch (error) {
    return handleError(res, error, 'Failed to register for event');
  }
};

// GET /api/registrations/mine (attendee only)
exports.getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({
      user: req.user._id
    }).populate('event', EVENT_FIELDS);

    // Drop any record whose event no longer exists, then sort by event date
    const data = registrations
      .filter((registration) => registration.event)
      .sort((a, b) => a.event.date - b.event.date);

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch your registrations');
  }
};

// GET /api/registrations/:id (owner only)
exports.getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return badRequest(res, 'Invalid registration id');
    }

    const registration = await Registration.findById(id).populate(
      'event',
      EVENT_FIELDS
    );

    if (!registration || !registration.event) {
      return notFound(res, 'Registration not found');
    }

    if (!registration.user.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own registrations'
      });
    }

    return res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch registration');
  }
};

// PATCH /api/registrations/:id/cancel (owner only)
exports.cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return badRequest(res, 'Invalid registration id');
    }

    const registration = await Registration.findById(id).populate(
      'event',
      EVENT_FIELDS
    );

    if (!registration || !registration.event) {
      return notFound(res, 'Registration not found');
    }

    if (!registration.user.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own registrations'
      });
    }

    if (registration.status === 'cancelled') {
      return conflict(res, 'This registration is already cancelled');
    }

    if (registration.event.date <= new Date()) {
      return conflict(
        res,
        'This event has already started, so the registration can no longer be cancelled'
      );
    }

    // Atomic: if two cancel requests arrive together, only one can flip
    // confirmed -> cancelled, so the seat is released exactly once.
    const cancelled = await Registration.findOneAndUpdate(
      { _id: registration._id, status: 'confirmed' },
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!cancelled) {
      return conflict(res, 'This registration is already cancelled');
    }

    await Event.updateOne(
      { _id: registration.event._id, registeredCount: { $gt: 0 } },
      { $inc: { registeredCount: -1 } }
    );

    await cancelled.populate('event', EVENT_FIELDS);

    return res.status(200).json({
      success: true,
      message: 'Registration cancelled',
      data: cancelled
    });
  } catch (error) {
    return handleError(res, error, 'Failed to cancel registration');
  }
};

// GET /api/events/:id/registrations (owner of the event only)
exports.getEventRegistrations = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return badRequest(res, 'Invalid event id');
    }

    const event = await Event.findById(id);

    if (!event) {
      return notFound(res, 'Event not found');
    }

    if (!event.createdBy || !event.createdBy.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view registrations for your own events'
      });
    }

    const registrations = await Registration.find({ event: event._id })
      .sort({ registeredAt: -1 })
      .populate('user', 'name email');

    // Skip records whose user account no longer exists
    const data = registrations.filter((registration) => registration.user);

    return res.status(200).json({
      success: true,
      event,
      count: data.length,
      data
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch event registrations');
  }
};

// GET /api/events/mine/recent-registrations (organiser only)
exports.getRecentRegistrations = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 8, 1),
      20
    );

    const myEvents = await Event.find({ createdBy: req.user._id }).select('_id');

    const registrations = await Registration.find({
      event: { $in: myEvents.map((event) => event._id) },
      status: 'confirmed'
    })
      .sort({ registeredAt: -1 })
      .limit(limit)
      .populate('user', 'name') // name only: the feed does not expose emails
      .populate('event', 'title');

    const data = registrations.filter(
      (registration) => registration.user && registration.event
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch recent registrations');
  }
};