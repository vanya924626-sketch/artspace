javascript


const router = require('express').Router();
const db = require('../utils/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logChange } = require('../utils/changelog');
// Публічний розклад
router.get('/', (req, res) => {
  const { hall_id, date } = req.query;
  let query = `
    SELECT s.*, h.name as hall_name, u.name as choreographer_name
    FROM schedule s
    JOIN halls h ON s.hall_id = h.id
    LEFT JOIN users u ON s.choreographer_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (hall_id) { query += ' AND s.hall_id = ?'; params.push(hall_id); }
  query += ' ORDER BY s.day_of_week, s.start_time';
  res.json(db.prepare(query).all(...params));
});
// Зайнятість залу на конкретну дату
router.get('/availability', (req, res) => {
  const { hall_id, date } = req.query;
  if (!hall_id || !date) return res.status(400).json({ error: 'Вкажіть зал і дату' });
  const dayOfWeek = new Date(date).getDay();
  const adjusted = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Пн
  const classes = db.prepare(`
    SELECT start_time, end_time, title FROM schedule
    WHERE hall_id = ? AND (
      (is_recurring = 1 AND day_of_week = ?) OR
      (is_recurring = 0 AND date_specific = ?)
    )
  `).all(hall_id, adjusted, date);
  const bookings = db.prepare(`
    SELECT start_time, end_time FROM bookings
    WHERE hall_id = ? AND date = ? AND status = 'confirmed'
  `).all(hall_id, date);
  res.json({ classes, bookings });
});
// Додати заняття (адмін)
router.post('/', authenticate, requireRole('admin'), (req, res) => {
  const { hall_id, choreographer_id, title, day_of_week, start_time, end_time, is_recurring, date_specific } = req.body;
  const result = db.prepare(`
    INSERT INTO schedule (hall_id, choreographer_id, title, day_of_week, start_time, end_time, is_recurring, date_specific, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(hall_id, choreographer_id, title, day_of_week, start_time, end_time, is_recurring ?? 1, date_specific || null, req.user.id);
  logChange({ userId: req.user.id, action: 'create_schedule', entity: 'schedule', entityId: result.lastInsertRowid, newValue: req.body });
  res.json({ message: 'Заняття додано', id: result.lastInsertRowid });
});
// Редагувати заняття
router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = db.prepare('SELECT * FROM schedule WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Не знайдено' });
  const { hall_id, choreographer_id, title, day_of_week, start_time, end_time, is_recurring, date_specific } = req.body;
  db.prepare(`
    UPDATE schedule SET hall_id=?, choreographer_id=?, title=?, day_of_week=?, start_time=?, end_time=?, is_recurring=?, date_specific=?
    WHERE id=?
  `).run(hall_id, choreographer_id, title, day_of_week, start_time, end_time, is_recurring, date_specific, req.params.id);
  logChange({ userId: req.user.id, action: 'update_schedule', entity: 'schedule', entityId: parseInt(req.params.id), oldValue: old, newValue: req.body });
  res.json({ message: 'Оновлено' });
});
// Видалити заняття
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = db.prepare('SELECT * FROM schedule WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Не знайдено' });
  db.prepare('DELETE FROM schedule WHERE id = ?').run(req.params.id);
  logChange({ userId: req.user.id, action: 'delete_schedule', entity: 'schedule', entityId: parseInt(req.params.id), oldValue: old });
  res.json({ message: 'Видалено' });
});
module.exports = router;