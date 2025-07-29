const nodemailer = require('nodemailer');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Nashma App <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    // Use Mailtrap for development
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(subject, text) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text,
      // html: `<p>${text}</p>` // Uncomment if you want HTML emails
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send(
      'Welcome to Nashma!',
      `Hi ${this.firstName},\n\nWelcome to Nashma! We're excited to have you.\n\nVisit your account: ${this.url}`
    );
  }

  async sendPasswordReset() {
    await this.send(
      'Password Reset Token',
      `Hi ${this.firstName},\n\nForgot your password? Submit a PATCH request with your new password to: ${this.url}\n\nThis link is valid for 10 minutes.`
    );
  }
};