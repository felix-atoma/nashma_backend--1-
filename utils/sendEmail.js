const nodemailer = require('nodemailer');

const sendEmail = async ({ subject, text }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,     // e.g. noreply@united-intellects.com
      pass: process.env.EMAIL_PASS,     // your app password
    },
  });

  const mailOptions = {
    from: `"Nashma Contact Form" <${process.env.EMAIL_USER}>`,  // sender name & address
    to: process.env.CLIENT_EMAIL,  // site owner’s receiving email (e.g. yeboahmartin733@gmail.com)
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
