// utils/email.js
const nodemailer = require('nodemailer');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.name = user.firstName || user.fullName || '';
    this.url = url;
    this.from = process.env.EMAIL_FROM; // e.g. "YourApp <no-reply@yourapp.com>"
  }

  createTransport() {
    // Example for SMTP; adjust if using SendGrid / other provider
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(subject, html) {
    const transporter = this.createTransport();
    await transporter.sendMail({
      from: this.from,
      to: this.to,
      subject,
      html,
    });
  }

  async sendWelcome() {
    const subject = 'Welcome to Nashma!';
    const html = `
      <p>Hi ${this.name},</p>
      <p>Welcome! You can manage your account here: <a href="${this.url}">${this.url}</a></p>
    `;
    await this.send(subject, html);
  }

  async sendPasswordReset() {
    const subject = 'Your password reset token (valid for 10 minutes)';
    const html = `
      <p>Hi ${this.name},</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${this.url}">${this.url}</a></p>
      <p>If you didn’t request this, ignore this email.</p>
    `;
    await this.send(subject, html);
  }

  async sendAdminWelcome() {
    const subject = 'Admin Access Granted';
    const html = `
      <p>Hi ${this.name},</p>
      <p>You have been granted admin access. Visit your dashboard: <a href="${this.url}">${this.url}</a></p>
    `;
    await this.send(subject, html);
  }

  async sendRoleUpdateNotification(newRole) {
    const subject = `Your role changed to ${newRole}`;
    const html = `
      <p>Hi ${this.name},</p>
      <p>Your role has been updated to <strong>${newRole}</strong>. Visit: <a href="${this.url}">${this.url}</a></p>
    `;
    await this.send(subject, html);
  }
}

module.exports = Email;
