require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');

async function connectTestDb() {
  const uri = process.env.MONGO_URI_TEST;

  if (!uri) {
    throw new Error('MONGO_URI_TEST is not configured');
  }

  const databaseName = new URL(uri).pathname.slice(1);

  if (databaseName !== 'eventdb_test') {
    throw new Error('Integration tests must use the eventdb_test database');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    // Jest cannot run the driver's dynamic import('os'), so provide it directly
    runtimeAdapters: { os: require('os') }
  });
}

module.exports = { connectTestDb };