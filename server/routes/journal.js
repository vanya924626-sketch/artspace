javascript


const router = require('express').Router();
const db = require('../utils/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logChange } = require('../utils/changelog');
// Журнал відвідувань
router.get('/', authenticate, requireRole('admin', 'choreographer'), (req, res) => {
  const { schedule_id, date } = req.query;
  let query = `
    SELECT a.*, u.name as user_name, s.title as class_title, h.name as hall_name
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    JOIN schedule s ON a.schedule_id = s.id
    JOIN halls h ON s.hall_id = h.id
    WHERE 1=1
  `;
  const params = [];
  if (schedule_id) { query += ' AND a.schedule_id = ?'; params.push(schedule_id); }
  if (date) { query += ' AND a.date = ?'; params.push(date); }
  query += ' ORDER BY a.date DESC, a.created_at DESC';
  res.json(db.prepare(query).all(...params));
});
// Відмітити відвідування
router.post('/', authenticate, requireRole('admin', 'choreographer'), (req, res) => {
  const { schedule_id, user_id, date, present, subscription_id, amount_paid, notes } = req.body;
  const existing = db.prepare(
    'SELECT id FROM attendance WHERE schedule_id = ? AND user_id = ? AND date = ?'
  ).get(schedule_id, user_id, date);
  if (existing) {
    db.prepare(`
      UPDATE attendance SET present=?, subscription_id=?, amount_paid=?, notes=?, marked_by=?
      WHERE id=?
    `).run(present, subscription_id, amount_paid || 0, notes, req.user.id, existing.id);
    logChange({ userId: req.user.id, action: 'update_attendance', entity: 'attendance', entityId: existing.id, newValue: req.body });
    return res.json({ message: 'Оновлено' });
  }
  const result = db.prepare(`
    INSERT INTO attendance (schedule_id, user_id, date, present, subscription_id, amount_paid, notes, marked_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(schedule_id, user_id, date, present, subscription_id, amount_paid || 0, notes, req.user.id);
  // Якщо присутній — збільшити лічильник абонемента
  if (present && subscription_id) {
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subscription_id);
    if (sub && sub.total_classes !== null) {
      db.prepare('UPDATE subscriptions SET used_classes = used_classes + 1 WHERE id = ?').run(subscription_id);
    }
  }
  logChange({ userId: req.user.id, action: 'create_attendance', entity: 'attendance', entityId: result.lastInsertRowid, newValue: req.body });
  res.json({ message: 'Відмічено', id: result.lastInsertRowid });
});
module.exports = router;