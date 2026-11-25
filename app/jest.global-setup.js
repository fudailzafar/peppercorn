// Before the workers start: a test's own process.env isn't the real one, so it would be too late there.
module.exports = async () => {
  process.env.TZ = process.env.TEST_ZONE ?? 'Asia/Kolkata';
};
