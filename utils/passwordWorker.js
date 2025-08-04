// utils/passwordWorker.js
const { parentPort } = require('worker_threads');
const bcrypt = require('bcryptjs');

parentPort.on('message', async ({ password, rounds }) => {
  try {
    const hash = await bcrypt.hash(password, rounds);
    parentPort.postMessage({ hash });
  } catch (err) {
    parentPort.postMessage({ error: err.message });
  }
});