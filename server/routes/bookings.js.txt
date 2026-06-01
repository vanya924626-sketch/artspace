javascript


const router = require('express').Router();
const db = require('../utils/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logChange } = require('../utils/changelog');
const { queueEmail } = require('../utils/email');
const { createPayment } = require('../utils/liqpay');
// Мої бронювання
router.get('/my', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, h.name as hall_name FROM bookings b
    JOIN halls h ON b.hall_id = h.id
    WHERE b.renter_id = ? ORDER BY b.date DESC
  `).all(req.user.id);
  res.json(rows);
});
// Всі бронювання (адмін)
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, h.name as hall_name, u.name as renter_name, u.email as renter_email
    FROM bookings b
    JOIN halls h ON b.hall_id = h.id
    JOIN users u ON b.renter_id = u.id
    ORDER BY b.created_at DESC
  `).all();
  res.json(rows);
});
// Створити бронювання
router.post('/', authenticate, requireRole('renter', 'admin'), async (req, res) => {
  const { hall_id, date, start_time, end_time } = req.body;
  // Перевірка перетину
  const conflict = db.prepare(`
    SELECT id FROM bookings
    WHERE hall_id = ? AND date = ? AND status = 'confirmed'
      AND NOT (end_time <= ? OR start_time >= ?)
  `).get(hall_id, date, start_time, end_time);
  if (conflict) return res.status(409).json({ error: 'Цей час вже зайнятий' });
  const hall = db.prepare('SELECT * FROM halls WHERE id = ?').get(hall_id);
  const hours = (new Date(`2000-01-01T${end_time}`) - new Date(`2000-01-01T${start_time}`)) / 3600000;
  const total_price = hours * hall.price_per_hour;
  const result = db.prepare(`
    INSERT INTO bookings (hall_id, renter_id, date, start_time, end_time, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(hall_id, req.user.id, date, start_time, end_time, total_price);
  logChange({ userId: req.user.id, action: 'create_booking', entity: 'bookings', entityId: result.lastInsertRowid, newValue: req.body });
  // Повідомити адміна
  const admins = db.prepare("SELECT email FROM users WHERE role = 'admin'").all();
  for (const admin of admins) {
    await queueEmail(admin.email, '📋 Нове бронювання ArtSpace', `
      <h2>Нове бронювання потребує підтвердження</h2>
      <p><strong>Зал:</strong> ${hall.name}</p>
      <p><strong>Дата:</strong> ${date} ${start_time}–${end_time}</p>
      <p><strong>Вартість:</strong> ${total_price} грн</p>
      <p><a href="${process.env.APP_URL}/admin.html">Переглянути в панелі адміна</a></p>
    `);
  }
  res.json({ message: 'Бронювання відправлено на підтвердження', id: result.lastInsertRowid, total_price });
});
// Підтвердити / відхилити (адмін)
router.patch('/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  const { status, admin_note } = req.body;
  const booking = db.prepare(`
    SELECT b.*, u.email, u.name, h.name as hall_name
    FROM bookings b JOIN users u ON b.renter_id = u.id JOIN halls h ON b.hall_id = h.id
    WHERE b.id = ?
  `).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Не знайдено' });
  db.prepare('UPDATE bookings SET status = ?, admin_note = ?, confirmed_by = ? WHERE id = ?')
    .run(status, admin_note || null, req.user.id, req.params.id);
  logChange({ userId: req.user.id, action: `booking_${status}`, entity: 'bookings', entityId: parseInt(req.params.id), oldValue: { status: booking.status }, newValue: { status } });
  const statusText = status === 'confirmed' ? '✅ підтверджено' : '❌ відхилено';
  await queueEmail(booking.email, `ArtSpace: бронювання ${statusText}`, `
    <h2>Привіт, ${booking.name}!</h2>
    <p>Ваше бронювання <strong>${statusText}</strong>.</p>
    <p><strong>Зал:</strong> ${booking.hall_name}</p>
    <p><strong>Дата:</strong> ${booking.date} ${booking.start_time}–${booking.end_time}</p>
    ${admin_note ? `<p><strong>Примітка:</strong> ${admin_note}</p>` : ''}
    ${status === 'confirmed' ? `<p>Сума до сплати: <strong>${booking.total_price} грн</strong></p>` : ''}
  `);
  res.json({ message: 'Статус оновлено' });
});
// LiqPay для бронювання
router.post('/:id/pay', authenticate, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND renter_id = ?').get(req.params.id, req.user.id);
  if (!booking) return res.status(404).json({ error: 'Не знайдено' });
  if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Спочатку потрібне підтвердження' });
  const orderId = `booking_${booking.id}_${Date.now()}`;
  db.prepare('UPDATE bookings SET liqpay_order_id = ? WHERE id = ?').run(orderId, booking.id);
  const payment = createPayment({
    orderId,
    amount: booking.total_price,
    description: `Оренда залу ArtSpace ${booking.date} ${booking.start_time}-${booking.end_time}`,
    resultUrl: `${process.env.APP_URL}/bookings.html?paid=1`,
    serverUrl: `${process.env.APP_URL}/api/payments/callback`
  });
  res.json(payment);
});
module.exports = router;