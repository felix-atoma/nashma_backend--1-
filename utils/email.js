const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text'); // Correct import syntax
const fs = require('fs');
const path = require('path');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name?.split(' ')[0] || 'User';
    this.url = url;
    this.from = `Nashma Agribusiness <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject, templateData = {}) {
    try {
      // 1) Resolve template path
      const templatePath = path.join(__dirname, `../views/email/${template}.pug`);
      
      // 2) Verify template exists
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }

      // 3) Render HTML
      const html = pug.renderFile(templatePath, {
        firstName: this.firstName,
        url: this.url,
        subject,
        ...templateData
      });

      // 4) Create text version
      const text = htmlToText(html, {
        wordwrap: 130,
        preserveNewlines: true
      });

      // 5) Send email
      await this.newTransport().sendMail({
        from: this.from,
        to: this.to,
        subject,
        html,
        text
      });
      
    } catch (err) {
      console.error(`[Email Error] ${template}:`, err.message);
      throw new Error(`Failed to send ${template} email`);
    }
  }

  async sendContactConfirmation() {
    await this.send(
      'contactConfirmation',
      'Thank you for contacting Nashma'
    );
  }

  async sendContactNotification(contact) {
    await this.send(
      'contactNotification', 
      `New Contact: ${contact.subject}`,
      { contact }
    );
  }
}

module.exports = Email;