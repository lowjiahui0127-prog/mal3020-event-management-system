const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required']
    },

    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed'
    },

    registeredAt: {
      type: Date,
      default: Date.now
    },

    cancelledAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// One registration per attendee per event.
// Registering again after a cancellation reuses the same record.
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

// Fast lookups of the attendee list for one event
registrationSchema.index({ event: 1, status: 1 });

module.exports = mongoose.model('Registration', registrationSchema);