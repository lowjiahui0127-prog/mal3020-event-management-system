const mongoose = require('mongoose');
const Event = require('../models/event.model');

const ALLOWED_FIELDS = [
  'title',
  'description',
  'date',
  'location',
  'capacity',
  'status'
];

// Only accept fields defined in our API
function pickAllowedFields(body) {
  const data = {};

  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  return data;
}

// Handle validation errors and unexpected server errors
function handleError(res, error, fallbackMessage) {
  if (
    error.name === 'ValidationError' ||
    error.name === 'CastError'
  ) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  console.error(fallbackMessage, error.message);

  return res.status(500).json({
    success: false,
    message: fallbackMessage
  });
}

// GET /api/events
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch events');
  }
};

// GET /api/events/:id
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch event');
  }
};

// POST /api/events
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(
      pickAllowedFields(req.body)
    );

    return res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    return handleError(res, error, 'Failed to create event');
  }
};

// PUT /api/events/:id
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findByIdAndUpdate(
      id,
      pickAllowedFields(req.body),
      {
        new: true,
        runValidators: true
      }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    return handleError(res, error, 'Failed to update event');
  }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Event deleted'
    });
  } catch (error) {
    return handleError(res, error, 'Failed to delete event');
  }
};
