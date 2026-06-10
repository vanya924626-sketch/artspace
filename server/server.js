javascript


const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
// Маршрути
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/changelog', require('./routes/changelog'));
app.use('/api/halls', require('./routes/halls'));
// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
// Cron: нагадування (щодня о 9:00)
cron.schedule('0 9 * * *', async () => {
  const { sendReminders } = require('./utils/reminders');
  await sendReminders();
});
// Cron: відправка email черги (кожні 5 хв)
cron.schedule('*/5 * * * *', async () => {
  const { processEmailQueue } = require('./utils/email');
  await processEmailQueue();
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ArtSpace сервер запущено на порті ${PORT}`));