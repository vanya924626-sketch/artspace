javascript


const db = require('./db');
const { queueEmail } = require('./email');
async function sendReminders() {
  // Знаходимо танцівників у яких залишилось 1-2 заняття
  const low = db.prepare(`
    SELECT u.name, u.email, s.type, s.used_classes, s.total_classes,
           (s.total_classes - s.used_classes) as remaining
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE s.type != 'unlimited'
      AND s.paid = 1
      AND (s.total_classes - s.used_classes) IN (1, 2)
      AND s.valid_to >= date('now')
  `).all();
  for (const row of low) {
    await queueEmail(
      row.email,
      `⚠️ ArtSpace: у вас залишилось ${row.remaining} заняття`,
      `
        <h2>Привіт, ${row.name}!</h2>
        <p>На вашому абонементі залишилось <strong>${row.remaining} заняття</strong>.</p>
        <p>Не забудьте поновити абонемент, щоб не переривати тренування.</p>
        <p>Перейдіть до <a href="${process.env.APP_URL}/subscriptions.html">особистого кабінету</a> для поновлення.</p>
        <br><p>З повагою, команда ArtSpace 🩰</p>
      `
    );
  }
}
module.exports = { sendReminders };