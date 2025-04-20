const ContactMessage = require('../models/ContactMessage');
const sendEmail = require('../utils/sendEmail');

exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Save to DB
    const contact = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    // Send email to the site owner
    await sendEmail({
      to: process.env.CLIENT_EMAIL, // ← Message goes to the site owner
      subject: `New Contact Message: ${subject}`,
      text: `
You received a new message from your website:

Name: ${name}
Email: ${email}
Phone: ${phone}

Message:
${message}
      `,
    });

    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Contact submission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
