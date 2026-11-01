const mongoose = require('mongoose');
const Event = require('../models/event.model');

const ALLOWED_FIELDS = [
  'title',
  'description',
  'date',
  'endDate',
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

// Validate event start and end times
function validateEventTimes(data) {
  const start = new Date(data.date);
  const end = new Date(data.endDate);

  if (
    !data.date ||
    !data.endDate ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 'A valid start date and end date are required';
  }

  if (end <= start) {
    return 'End date must be later than start date';
  }

  return null;
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

function isOwner(event, user) {
  return Boolean(event.createdBy && event.createdBy.equals(user._id));
}

function forbidden(res) {
  return res.status(403).json({
    success: false,
    message: 'You can only manage your own events'
  });
}

// GET /api/events
exports.getEvents = async (req, res) => {
  try {
    const now = new Date();

    const events = await Event.find({
      status: 'published',
      $or: [
        { endDate: { $gte: now } },
        {
          endDate: { $exists: false },
          date: { $gte: now }
        }
      ]
    }).sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch events');
  }
};

// GET /api/events/mine (organiser only)
exports.getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id }).sort({
      date: 1
    });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch your events');
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

// POST /api/events (organiser only)
exports.createEvent = async (req, res) => {
  try {
    const data = pickAllowedFields(req.body);
    const timeError = validateEventTimes(data);

    if (timeError) {
      return res.status(400).json({
        success: false,
        message: timeError
      });
    }

    const event = await Event.create({
      ...data,
      createdBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    return handleError(res, error, 'Failed to create event');
  }
};

// PUT /api/events/:id (owner only)
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const existingEvent = await Event.findById(id);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (!isOwner(existingEvent, req.user)) {
      return forbidden(res);
    }

    const updates = pickAllowedFields(req.body);

    const mergedData = {
      date: updates.date ?? existingEvent.date,
      endDate: updates.endDate ?? existingEvent.endDate
    };

    const timeError = validateEventTimes(mergedData);

    if (timeError) {
      return res.status(400).json({
        success: false,
        message: timeError
      });
    }

    Object.assign(existingEvent, updates);
    await existingEvent.save();

    return res.status(200).json({
      success: true,
      data: existingEvent
    });
  } catch (error) {
    return handleError(res, error, 'Failed to update event');
  }
};

// DELETE /api/events/:id (owner only)
exports.deleteEvent = async (req, res) => {
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

    if (!isOwner(event, req.user)) {
      return forbidden(res);
    }

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Event deleted'
    });
  } catch (error) {
    return handleError(res, error, 'Failed to delete event');
  }
};
