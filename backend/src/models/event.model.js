const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },

    description: {
      type: String,
      trim: true,
      default: ''
    },

    date: {
      type: Date,
      required: [true, 'Date is required']
    },

    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          return !this.date || value > this.date;
        },
        message: 'End date must be later than start date'
      }
    },

    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },

    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1']
    },

    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled'],
      default: 'published'
    },

    // Number of confirmed registrations. Only the server changes this.
    registeredCount: {
      type: Number,
      default: 0,
      min: [0, 'Registered count cannot be negative']
    },

    // The organiser who owns this event
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event creator is required'],
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Event', eventSchema);
