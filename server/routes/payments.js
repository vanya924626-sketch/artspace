javascript


const router = require('express').Router();
const db = require('../utils/db');
const { verifyCallback, decodeData } = require('../utils/liqpay');
const { queueEmail } = require('../utils/email');
const { logChange } = require('../utils/changelog');
// LiqPay callback
router.post('/callback', (req, res) => {
  const { data, signature } = req.body;
  if (!verifyCallback(data, signature)) {
    return res.status(400).send('Invalid signature');
  }
  const payload = decodeData(data);
  if (payload.status === 'success' || payload.status === 'sandbox') {
    const orderId = payload.order_id;
    if (orderId.startsWith('sub_')) {
      const sub = db.prepare('SELECT * FROM subscriptions WHERE liqpay_order_id = ?').get(orderId);
      if (sub) {
        db.prepare('UPDATE subscriptions SET paid = 1, payment_method = ? WHERE id = ?').run('online', sub.id);
        logChange({ action: 'payment_success', entity: 'subscriptions', entityId: sub.id, newValue: { orderId, amount: payload.amount } });
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(sub.user_id);
        queueEmail(user.email, '✅ ArtSpace: Оплату отримано', `
          <h2>Оплату підтверджено!</h2>
          <p>Абонемент <strong>${sub.type}</strong> активовано.</p>
          <p>Сума: <strong>${payload.amount} грн</strong></p>
        `);
      }
    }
    if (orderId.startsWith('booking_')) {
      const booking = db.prepare(`
        SELECT b.*, u.email, u.name FROM bookings b
        JOIN users u ON b.renter_id = u.id
        WHERE b.liqpay_order_id = ?
      `).get(orderId);
      if (booking) {
        db.prepare('UPDATE bookings SET paid = 1 WHERE id = ?').run(booking.id);
        logChange({ action: 'payment_success', entity: 'bookings', entityId: booking.id, newValue: { orderId, amount: payload.amount } });
        queueEmail(booking.email, '✅ ArtSpace: Оренду оплачено', `
          <h2>Оплату підтверджено!</h2>
          <p>Оренда залу на <strong>${booking.date} ${booking.start_time}–${booking.end_time}</strong> оплачена.</p>
          <p>Сума: <strong>${payload.amount} грн</strong></p>
        `);
      }
    }
  }
  res.send('OK');
});
module.exports = router;