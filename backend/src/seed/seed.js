require('dotenv').config();

const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const User = require('../models/user.model');
const Event = require('../models/event.model');

// Demo accounts for development and the report. Override through env if needed.
const SEED_USERS = [
  {
    name: 'Demo Organiser',
    email: process.env.SEED_ORGANISER_EMAIL || 'organiser@eventhub.test',
    password: process.env.SEED_ORGANISER_PASSWORD || 'Organiser123!',
    role: 'organiser'
  },
  {
    name: 'Demo Attendee',
    email: process.env.SEED_ATTENDEE_EMAIL || 'attendee@eventhub.test',
    password: process.env.SEED_ATTENDEE_PASSWORD || 'Attendee123!',
    role: 'attendee'
  }
];

async function seed() {
  await connectDatabase();

  let organiser = null;

  for (const data of SEED_USERS) {
    let user = await User.findOne({ email: data.email });

    if (user) {
      if (user.role !== data.role) {
        user.role = data.role;
        await user.save();
      }
      console.log(`Already exists: ${data.email} (${data.role})`);
    } else {
      user = await User.create(data); // password is hashed by the model hook
      console.log(`Created: ${data.email} (${data.role})`);
    }

    if (user.role === 'organiser') {
      organiser = user;
    }
  }

  // Events created before auth existed have no owner. Give them to the demo organiser.
  const result = await Event.updateMany(
    { createdBy: { $exists: false } },
    { $set: { createdBy: organiser._id } }
  );
  console.log(
    `Assigned ${result.modifiedCount} existing event(s) to ${organiser.email}`
  );

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});