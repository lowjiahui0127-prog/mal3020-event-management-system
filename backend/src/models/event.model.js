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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Event', eventSchema);
