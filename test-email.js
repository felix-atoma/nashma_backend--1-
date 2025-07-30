// test-email.js - Run this to verify your Mailtrap setup
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: '08d73228bfe15d',
    pass: '40bcc32b067f38'
  }
});

const mailOptions = {
  from: 'noreply@nashma.com',
  to: 'your-email@example.com',
  subject: 'Mailtrap Test',
  text: 'This is a test email from Mailtrap'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error sending email:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});