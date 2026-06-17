javascript


const router = require('express').Router();
const db = require('../utils/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logChange } = require('../utils/changelog');
const { queueEmail } = require('../utils/email');
const { createPayment } = require('../utils/liqpay');
// ── Мої абонементи (танцівник) ────────────────────
router.get('/my', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM subscriptions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(rows);
});
// ── Всі абонементи (адмін / хореограф) ───────────
router.get('/', authenticate, requireRole('admin', 'choreographer'), (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, u.name, u.email
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `).all();
  res.json(rows);
});
// ── Створити абонемент ─────────────────────────────
router.post('/', authenticate, requireRole('admin', 'choreographer'), async (req, res) => {
  const { user_id, type, payment_method, valid_from, valid_to } = req.body;
  if (!user_id || !type || !valid_from || !valid_to)
    return res.status(400).json({ error: 'Заповніть всі поля' });
  const totalMap = { single: 1, '8': 8, '16': 16, unlimited: null };
  if (!(type in totalMap))
    return res.status(400).json({ error: 'Невірний тип абонементу' });
  const total_classes = totalMap[type];
  try {
    const result = db.prepare(`
      INSERT INTO subscriptions
        (user_id, type, total_classes, payment_method, valid_from, valid_to)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user_id, type, total_classes, payment_method || null, valid_from, valid_to);
    logChange({
      userId: req.user.id,
      action: 'create_subscription',
      entity: 'subscriptions',
      entityId: result.lastInsertRowid,
      newValue: req.body
    });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (user?.email) {
      const typeLabel = {
        single: 'Разовий', '8': '8 занять',
        '16': '16 занять', unlimited: 'Безліміт'
      }[type];
      await queueEmail(user.email, '🎉 ArtSpace: Абонемент оформлено', `
        <h2>Привіт, ${user.name}!</h2>
        <p>Ваш абонемент <strong>${typeLabel}</strong> успішно оформлено.</p>
        <p>Дійсний: <strong>${valid_from}</strong> — <strong>${valid_to}</strong></p>
        ${payment_method !== 'online'
          ? '<p>✅ Оплату зафіксовано.</p>'
          : '<p>⏳ Очікується онлайн-оплата.</p>'}
        <p><a href="${process.env.APP_URL}/dashboard.html">Переглянути в кабінеті</a></p>
        <br><p>З повагою, команда ArtSpace 🩰</p>
      `);
    }
    res.json({ message: 'Абонемент створено', id: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});
// ── Оновити оплату вручну (адмін / хореограф) ────
router.patch('/:id', authenticate, requireRole('admin', 'choreographer'), async (req, res) => {
  const { paid } = req.body;
  const old = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Не знайдено' });
  db.prepare('UPDATE subscriptions SET paid = ? WHERE id = ?')
    .run(paid ? 1 : 0, req.params.id);
  logChange({
    userId: req.user.id,
    action: 'update_subscription',
    entity: 'subscriptions',
    entityId: parseInt(req.params.id),
    oldValue: { paid: old.paid },
    newValue: { paid }
  });
  // Повідомити танцівника про підтвердження оплати
  if (paid && !old.paid) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(old.user_id);
    if (user?.email) {
      const typeLabel = {
        single: 'Разовий', '8': '8 занять',
        '16': '16 занять', unlimited: 'Безліміт'
      }[old.type];
      await queueEmail(user.email, '✅ ArtSpace: Оплату підтверджено', `
        <h2>Привіт, ${user.name}!</h2>
        <p>Оплату вашого абонементу <strong>${typeLabel}</strong> підтверджено.</p>
        <p>Дійсний до: <strong>${old.valid_to}</strong></p>
        <p><a href="${process.env.APP_URL}/dashboard.html">Переглянути в кабінеті</a></p>
        <br><p>З повагою, команда ArtSpace 🩰</p>
      `);
    }
  }
  res.json({ message: 'Оновлено' });
});
// ── Онлайн оплата через LiqPay ───────────────────
router.post('/:id/pay', authenticate, (req, res) => {
  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!sub) return res.status(404).json({ error: 'Не знайдено' });
  if (sub.paid) return res.status(400).json({ error: 'Вже оплачено' });
  const priceMap = { single: 200, '8': 1400, '16': 2600, unlimited: 3500 };
  const amount = priceMap[sub.type];
  if (!amount) return res.status(400).json({ error: 'Невірний тип' });
  const orderId = `sub_${sub.id}_${Date.now()}`;
  db.prepare('UPDATE subscriptions SET liqpay_order_id = ? WHERE id = ?')
    .run(orderId, sub.id);
  const typeLabel = {
    single: 'Разовий', '8': '8 занять',
    '16': '16 занять', unlimited: 'Безліміт'
  }[sub.type];
  const payment = createPayment({
    orderId,
    amount,
    description: `ArtSpace абонемент — ${typeLabel}`,
    resultUrl: `${process.env.APP_URL}/dashboard.html?paid=1`,
    serverUrl: `${process.env.APP_URL}/api/payments/callback`
  });
  res.json(payment);
});
// ── Видалити абонемент (тільки адмін) ────────────
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Не знайдено' });
  db.prepare('DELETE FROM subscriptions WHERE id = ?').run(req.params.id);
  logChange({
    userId: req.user.id,
    action: 'delete_subscription',
    entity: 'subscriptions',
    entityId: parseInt(req.params.id),
    oldValue: old
  });
  res.json({ message: 'Видалено' });
});
module.exports = router;