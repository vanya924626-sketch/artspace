javascript


const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../utils/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logChange } = require('../utils/changelog');
// Всі користувачі (адмін)
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const users = db.prepare(
    'SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});
// Один користувач
router.get('/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id))
    return res.status(403).json({ error: 'Доступ заборонено' });
  const user = db.prepare(
    'SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Не знайдено' });
  res.json(user);
});
// Створити користувача (адмін — для хореографів)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, hash, role, phone || null);
    logChange({ userId: req.user.id, action: 'create_user', entity: 'users', entityId: result.lastInsertRowid, newValue: { name, email, role } });
    res.json({ message: 'Користувача створено', id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email вже зайнятий' });
    res.status(500).json({ error: 'Помилка сервера' });
  }
});
// Редагувати користувача
router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
  const { name, phone, role } = req.body;
  const old = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Не знайдено' });
  db.prepare('UPDATE users SET name = ?, phone = ?, role = ? WHERE id = ?')
    .run(name, phone, role, req.params.id);
  logChange({ userId: req.user.id, action: 'update_user', entity: 'users', entityId: parseInt(req.params.id), oldValue: old, newValue: { name, phone, role } });
  res.json({ message: 'Оновлено' });
});
// Видалити користувача
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Не знайдено' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logChange({ userId: req.user.id, action: 'delete_user', entity: 'users', entityId: parseInt(req.params.id), oldValue: old });
  res.json({ message: 'Видалено' });
});
module.exports = router;