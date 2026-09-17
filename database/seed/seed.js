const { seedDatabase } = require('../../backend/src/db/seed');

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = { seedDatabase };
