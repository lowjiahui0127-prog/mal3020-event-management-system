const Event = require('../models/event.model');

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, location, capacity } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      location,
      capacity
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to create event' });
  }
};