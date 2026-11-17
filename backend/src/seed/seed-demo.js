/**
 * Demo data for development, testing and the demo video.
 *
 * Every run RESETS the demo organiser's events (and the registrations on them)
 * to the same starting point. Accounts are kept: existing users keep their
 * passwords. Dates are relative to "now" (Malaysia time), so the events are
 * always in the future whenever the script is run.
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const Registration = require('../models/registration.model');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MALAYSIA_OFFSET = 8 * HOUR;

const ORGANISER = {
  name: 'Demo Organiser',
  email: process.env.SEED_ORGANISER_EMAIL || 'organiser@eventhub.test',
  password: process.env.SEED_ORGANISER_PASSWORD || 'Organiser123!',
  role: 'organiser'
};

const DEMO_ATTENDEE = {
  name: 'Demo Attendee',
  email: process.env.SEED_ATTENDEE_EMAIL || 'attendee@eventhub.test',
  password: process.env.SEED_ATTENDEE_PASSWORD || 'Attendee123!',
  role: 'attendee'
};

// Fictional students: student1@eventhub.test ... student40@eventhub.test
// (all share the demo attendee password). The largest event needs 40 of them,
// because one account can register for an event only once.
const DEMO_STUDENTS = [
  'Nur Aisyah binti Zulkifli', 'Tan Wei Jie', 'Priya Darshini Nair',
  'Muhammad Hafiz bin Roslan', 'Lim Mei Ling', 'Arjun Subramaniam',
  'Nurul Izzah binti Ahmad', 'Wong Jun Hao', 'Siti Khadijah binti Osman',
  'Kavitha Rajendran', 'Daniel Chong Kah Wai', 'Farah Nabilah binti Azlan',
  'Ng Zhi Xuan', 'Ahmad Imran bin Ismail', 'Sofia Lee Jia Qi',
  'Lee Kah Ming', 'Amirul Hakim bin Yusof', 'Lau Li Ting',
  'Rahul Krishnan', 'Nur Balqis binti Razak', 'Ong Yi Kai',
  'Chong Xin Yi', 'Syafiqah binti Hashim', 'Darshan Pillai',
  'Teoh Wen Hao', 'Aina Sofea binti Kamarul', 'Goh Pei Shan',
  'Thinesh Kumar', 'Danial Hakim bin Mazlan', 'Yap Jia Yi',
  'Haziq Aiman bin Shariff', 'Khoo Zi Xuan', 'Shalini Devi',
  'Tan Jun Wei', 'Nadia binti Sulaiman', 'Chan Kok Leong',
  'Irfan Syahmi bin Nasir', 'Cheah Hui Min', 'Navin Raj',
  'Nurul Ain binti Hamid'
];

// Rename these to real places on your campus if you like
const VENUE = {
  auditorium: 'Auditorium',
  services: 'Student Services Hub',
  makerLab: 'Maker Lab',
  lab: 'Computer Lab 3',
  innovation: 'Innovation Hub',
  sports: 'Sports Hall',
  courtyard: 'Main Courtyard',
  lounge: 'Student Lounge',
  hall: 'Main Hall',
  seminar: 'Seminar Room 2'
};

// ---------- Date helpers (always Malaysia time, wherever the script runs) ----------

// N days from now, at hour:minute Malaysia time
function at(daysFromNow, hour, minute = 0) {
  const shifted = new Date(Date.now() + daysFromNow * DAY + MALAYSIA_OFFSET);

  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      hour,
      minute
    ) - MALAYSIA_OFFSET
  );
}

// A fixed date while it is still in the future, otherwise "fallbackDays from now"
function onOrSoon(fixedIso, fallbackDays, hour, minute = 0) {
  const fixed = new Date(fixedIso);

  return fixed.getTime() > Date.now() + DAY ? fixed : at(fallbackDays, hour, minute);
}

const hoursAgo = (hours) => new Date(Date.now() - hours * HOUR);

// ---------- Description helpers ----------
// Paragraphs are separated by a blank line. The event page keeps line breaks.
const text = (...blocks) => blocks.join('\n\n');
const list = (title, items) =>
  `${title}\n${items.map((item) => `• ${item}`).join('\n')}`;
const note = (title, body) => `${title}\n${body}`;

// ---------- The demo events ----------
// students: how many of the demo students are registered
// demo: what the demo attendee account has for this event
const DEMO_EVENTS = [
  {
    title: 'Practical Cybersecurity & Ethical Hacking Talk',
    description: text(
      'Most security incidents do not start with a clever exploit. They start with a reused password, a convincing email or a forgotten setting.',
      'In this talk, a lecturer from the School of Computing explains how attackers think and how to defend against them, including a live demonstration in an isolated lab environment. No prior security knowledge is needed.',
      list("WHAT YOU'LL TAKE AWAY", [
        'How phishing and social engineering really work, and how to spot them',
        'Why weak and reused passwords fail, and what to use instead',
        'The most common web vulnerabilities, shown live on a practice application',
        'How to start learning ethical hacking legally and safely'
      ]),
      note(
        "WHO IT'S FOR",
        'Students from any faculty. Computing students will get extra from the demo, but the talk is written for beginners.'
      ),
      'A Q&A session follows the talk.'
    ),
    image: '/posters/cybersecurity-talk.jpg',
    venue: VENUE.auditorium,
    capacity: 120,
    start: () => at(3, 14),
    hours: 2,
    students: 38
  },
  {
    title: 'Tech CV & LinkedIn Portfolio Clinic',
    description: text(
      'Recruiters skim quickly. For students with strong projects but little work experience, the challenge is making that work easy to find and easy to understand.',
      'Bring your CV and LinkedIn profile for friendly one-to-one feedback from final-year students and the careers team. We review one profile at a time and focus on what you can improve today.',
      list("WHAT YOU'LL TAKE AWAY", [
        'A clearer CV structure for projects, internships and skills',
        'How to present GitHub and portfolio work so recruiters notice it',
        'LinkedIn headline and summary tips that still sound like you',
        'A short list of next steps for your applications'
      ]),
      note(
        'WHAT TO BRING',
        'A laptop and a recent version of your CV (PDF or Word). Sessions are 15 minutes, first come first served.'
      )
    ),
    image: '/posters/cv-linkedin-clinic.jpg',
    venue: VENUE.services,
    capacity: 40,
    start: () => at(5, 10),
    hours: 2,
    students: 17,
    demo: 'cancelled'
  },
  {
    title: '3D Printing & Rapid Prototyping Workshop',
    description: text(
      'Going from an idea to something you can hold is one of the fastest ways to learn how products are made. This workshop takes you through the whole path in one morning.',
      'You will learn the basics of CAD, prepare a model for printing and set up a printer, then print a small design of your own to take home. Places are limited by the number of printers.',
      list("WHAT YOU'LL TAKE AWAY", [
        'Designing a simple object in beginner-friendly CAD software',
        'Slicing: how layer height and infill affect strength and print time',
        'Setting up and starting a print safely',
        'What to check when a print fails, and how to fix it'
      ]),
      note(
        "WHO IT'S FOR",
        'Beginners from any faculty. No design experience is needed.'
      ),
      note('WHAT TO BRING', 'Your own ideas. All materials are provided.')
    ),
    image: '/posters/3d-printing-workshop.jpg',
    venue: VENUE.makerLab,
    capacity: 24,
    start: () => at(7, 9, 30),
    hours: 3,
    students: 22 // only 2 places left
  },
  {
    title: 'AI & LLM Engineering Hands-On Bootcamp',
    description: text(
      'Large language models are easy to try and hard to build with reliably. This bootcamp closes that gap with a full day of guided, hands-on practice.',
      'You will build a small application step by step, starting from a simple prompt and ending with a working assistant that can answer questions from your own documents. Example code and API access are provided.',
      list("WHAT YOU'LL TAKE AWAY", [
        'Prompting patterns that give more consistent results',
        'Retrieval: letting a model answer from your own documents',
        'Simple tool use and agents, and where they go wrong',
        'How to evaluate an AI feature before you ship it'
      ]),
      note(
        "WHO IT'S FOR",
        'Students who can write basic code in Python or JavaScript.'
      ),
      note(
        'WHAT TO BRING',
        'A laptop with a modern browser. Lunch and refreshments are provided.'
      )
    ),
    image: '/posters/ai-llm-bootcamp.jpg',
    venue: VENUE.lab,
    capacity: 30,
    start: () => at(10, 9),
    hours: 8,
    students: 30 // completely full
  },
  {
    title: 'Inter-Faculty Friendly Futsal Cup',
    description: text(
      'Faculties take each other on in a friendly knockout tournament, and everyone is welcome to cheer from the stands.',
      'Matches are short, fixtures are announced on the day, and the focus is on good football and good sportsmanship.',
      list('THE BASICS', [
        'Teams of seven players (five on court, two substitutes) from the same faculty',
        'Short knockout matches, with a trophy for the winning faculty',
        'Register here to reserve a place as a player or as a spectator',
        'Non-marking indoor shoes are required on court'
      ])
    ),
    image: '/posters/futsal-cup.jpg',
    venue: VENUE.sports,
    capacity: 60,
    start: () => at(12, 16),
    hours: 3,
    students: 27,
    demo: 'confirmed'
  },
  {
    title: 'Peninsula Hackathon 2026: Build with AI',
    description: text(
      'One night, one problem, one prototype. This hackathon challenges teams to use AI to solve a real problem on campus, from finding free study spaces to making notices easier to follow.',
      'Form a team of up to four, choose a problem and build through the night with mentors on hand. The next morning, each team demonstrates its prototype to a panel of lecturers and industry guests.',
      list('HOW IT WORKS', [
        'Teams of up to four, from any faculty. No team? Join the matching session at the start',
        'Mentors are available from the start to the final demos',
        'Demos are five minutes, followed by questions',
        'Judged on usefulness, a working demo and teamwork'
      ]),
      note(
        'WHAT TO BRING',
        'A laptop, a charger and a team-mate or two. Snacks and drinks are provided.'
      )
    ),
    image: '/posters/ai-hackathon.jpg',
    venue: VENUE.innovation,
    capacity: 80,
    start: () => at(14, 18),
    hours: 18,
    students: 36,
    demo: 'confirmed'
  },
  {
    title: 'World Singing Day 2026: Campus Live',
    description: text(
      'Some of the best campus memories are made by singing together. This evening in the courtyard is for exactly that.',
      'Perform a song with friends, or simply come and sing along with the crowd. All genres and languages are welcome, from pop and folk to nasyid and Mandopop.',
      list('THE PLAN', [
        'Open stage: sign up on the night to perform, solo or in a group',
        'Singalong sets led by student bands',
        'No experience needed, only enthusiasm'
      ]),
      'Bring a friend, and a light jacket in case the evening breeze picks up.'
    ),
    image: '/posters/world-singing-day.jpg',
    venue: VENUE.courtyard,
    capacity: 150,
    start: () => at(18, 19),
    hours: 2.5,
    students: 40
  },
  {
    title: 'Christmas Wonderland Party 2026',
    description: text(
      'Celebrate the end of the semester with an evening of games, music and good company.',
      'Expect team games, light-hearted challenges with small prizes, a secret gift exchange and festive snacks. Festive outfits are encouraged but never required.',
      list('BEFORE YOU COME', [
        'Secret gift exchange: bring one wrapped gift worth about RM10',
        'Come with a team of friends, or join one on the night',
        'Everyone is welcome, whatever you celebrate'
      ])
    ),
    image: '/posters/christmas-party.jpg',
    venue: VENUE.lounge,
    capacity: 100,
    start: () => onOrSoon('2026-12-19T19:00:00+08:00', 20, 19),
    hours: 4,
    students: 35
  },
  {
    title: 'Masquerade Prom Night 2027',
    description: text(
      'An evening of music, dancing and a little mystery. Dress up, put on a mask and join us for the biggest night out of the year.',
      'Doors open with a welcome drink and a photo corner, followed by a live DJ set. A best-dressed award is announced before the night ends.',
      note(
        'DRESS CODE',
        'Formal or semi-formal. Masks are encouraged, and a few spares will be available at the door.'
      ),
      list('GOOD TO KNOW', [
        'Student or staff ID is required at entry',
        'Registration closes when the hall is full'
      ])
    ),
    image: '/posters/masquerade-prom.jpg',
    venue: VENUE.hall,
    capacity: 120,
    start: () => onOrSoon('2027-01-23T19:30:00+08:00', 45, 19, 30),
    hours: 4,
    students: 31
  },
  // A draft: only the organiser can see it
  {
    title: 'Alumni Career Panel',
    description:
      'Graduates share how they found their first role in tech. Details to be confirmed.',
    image: '',
    venue: VENUE.seminar,
    capacity: 60,
    start: () => at(21, 15),
    hours: 2,
    students: 0,
    status: 'draft'
  },
  // Already finished: shows under "Ended" and in the attendee's Past tab
  {
    title: 'Orientation Week Welcome Mixer',
    description: 'A relaxed meet-and-greet to start the semester.',
    image: '',
    venue: VENUE.lounge,
    capacity: 100,
    start: () => at(-7, 17),
    hours: 2,
    students: 26,
    demo: 'confirmed',
    ended: true
  }
];

// ---------- Users ----------

async function ensureUser({ name, email, password, role }) {
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role !== role) {
      existing.role = role;
      await existing.save();
    }
    return existing;
  }

  return User.create({ name, email, password, role }); // the model hashes the password
}

// Create the demo students, or update their names if they already exist.
// The password is hashed once and written only when an account is created.
async function ensureStudents() {
  const wanted = DEMO_STUDENTS.map((name, index) => ({
    name,
    email: `student${index + 1}@eventhub.test`
  }));

  const hash = await bcrypt.hash(DEMO_ATTENDEE.password, 10);

  await User.bulkWrite(
    wanted.map((student) => ({
      updateOne: {
        filter: { email: student.email },
        update: {
          $set: { name: student.name },
          $setOnInsert: { password: hash, role: 'attendee' }
        },
        upsert: true
      }
    }))
  );

  const users = await User.find({ email: { $in: wanted.map((s) => s.email) } });
  const byEmail = new Map(users.map((user) => [user.email, user]));

  return wanted.map((student) => byEmail.get(student.email));
}

// ---------- Main ----------

async function seedDemo() {
  await connectDatabase();

  const organiser = await ensureUser(ORGANISER);
  const demoAttendee = await ensureUser(DEMO_ATTENDEE);
  const students = await ensureStudents();

  // Start clean: replace every event owned by the demo organiser
  const oldEvents = await Event.find({ createdBy: organiser._id }).select('_id');
  await Registration.deleteMany({ event: { $in: oldEvents.map((event) => event._id) } });
  await Event.deleteMany({ createdBy: organiser._id });

  const summary = [];

  for (const [index, spec] of DEMO_EVENTS.entries()) {
    const demoSeat = spec.demo === 'confirmed' ? 1 : 0;

    if (spec.students > students.length) {
      throw new Error(`"${spec.title}" needs more students than the demo list has`);
    }

    if (spec.students + demoSeat > spec.capacity) {
      throw new Error(`"${spec.title}" has more registrations than capacity`);
    }

    const start = spec.start();
    const end = new Date(start.getTime() + spec.hours * HOUR);

    const event = await Event.create({
      title: spec.title,
      description: spec.description,
      date: start,
      endDate: end,
      location: spec.venue,
      imageUrl: spec.image,
      capacity: spec.capacity,
      status: spec.status || 'published',
      createdBy: organiser._id
    });

    const registrations = [];

    for (let j = 0; j < spec.students; j++) {
      registrations.push({
        user: students[(index * 7 + j) % students.length]._id,
        event: event._id,
        status: 'confirmed',
        registeredAt: hoursAgo(spec.ended ? 24 * (8 + (j % 3)) : 1 + ((j * 13) % 120))
      });
    }

    if (spec.demo === 'confirmed') {
      registrations.push({
        user: demoAttendee._id,
        event: event._id,
        status: 'confirmed',
        registeredAt: hoursAgo(spec.ended ? 24 * 9 : 30)
      });
    }

    if (spec.demo === 'cancelled') {
      registrations.push({
        user: demoAttendee._id,
        event: event._id,
        status: 'cancelled',
        registeredAt: hoursAgo(72),
        cancelledAt: hoursAgo(48)
      });
    }

    if (registrations.length > 0) {
      await Registration.insertMany(registrations);
    }

    // The seat counter always matches the confirmed registrations
    const confirmed = await Registration.countDocuments({
      event: event._id,
      status: 'confirmed'
    });
    await Event.updateOne({ _id: event._id }, { $set: { registeredCount: confirmed } });

    summary.push({
      event: spec.title,
      starts: start.toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur' }),
      registered: `${confirmed} / ${spec.capacity}`,
      status: spec.ended ? 'ended' : spec.status || 'published'
    });
  }

  console.table(summary);
  console.log('\nDemo logins');
  console.log(`  Organiser:  ${ORGANISER.email} / ${ORGANISER.password}`);
  console.log(`  Attendee:   ${DEMO_ATTENDEE.email} / ${DEMO_ATTENDEE.password}`);
  console.log(`  Student:    student40@eventhub.test / ${DEMO_ATTENDEE.password}`);

  await mongoose.disconnect();
}

seedDemo().catch((error) => {
  console.error('Demo seed failed:', error);
  process.exit(1);
});