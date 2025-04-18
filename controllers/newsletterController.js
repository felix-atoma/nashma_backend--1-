const NewsletterSubscriber = require('../models/NewsletterSubscriber');

exports.subscribe = async (req, res) => {
  const { email } = req.body;
  try {
    const exists = await NewsletterSubscriber.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'You are already subscribed.' });
    }
    await NewsletterSubscriber.create({ email });
    res.status(200).json({ message: 'Subscription successful!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
