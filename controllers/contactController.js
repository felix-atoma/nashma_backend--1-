const ContactMessage = require('../models/ContactMessage');
const sendEmail = require('../utils/sendEmail');

exports.submitContact = async (req, res) => {
  try {
    const contact = await ContactMessage.create(req.body);
    await sendEmail({
      subject: `New Contact from ${contact.name}`,
      text: `Message: ${contact.message}

From: ${contact.email} | Phone: ${contact.phone}`
    });
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
