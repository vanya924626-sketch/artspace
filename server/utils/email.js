javascript


const nodemailer = require('nodemailer');
const db = require('./db');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from: `"ArtSpace Lviv" <${process.env.SMTP_USER}>`,
    to, subject, html
  });
}
async function queueEmail(to, subject, body) {
  db.prepare(
    'INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)'
  ).run(to, subject, body);
}
async function processEmailQueue() {
  const emails = db.prepare(
    'SELECT * FROM email_queue WHERE sent = 0 LIMIT 20'
  ).all();
  for (const email of emails) {
    try {
      await sendEmail(email.to_email, email.subject, email.body);
      db.prepare(
        'UPDATE email_queue SET sent = 1, sent_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(email.id);
    } catch (err) {
      console.error('Email error:', err.message);
    }
  }
}
module.exports = { sendEmail, queueEmail, processEmailQueue };