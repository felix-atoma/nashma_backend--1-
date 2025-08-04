const bcrypt = require('bcryptjs');

// Tunable cost factor; 10 is a good balance. Raise to 11 or 12 if you need more work but watch latency.
const SALT_ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
const comparePassword = (candidate, hash) => bcrypt.compare(candidate, hash);

module.exports = { hashPassword, comparePassword };
