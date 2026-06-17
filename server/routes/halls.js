javascript


const router = require('express').Router();
const db = require('../utils/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logChange } = require('../utils/changelog');
// Всі зали (публічно)
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM halls ORDER BY id').all());
});
// Редагувати зал (адмін)
router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
  const { name, description, capacity, price_per_hour } = req.body;
  const old = db.prepare('SELECT * FROM halls WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Не знайдено' });
  db.prepare('UPDATE halls SET name=?, description=?, capacity=?, price_per_hour=? WHERE id=?')
    .run(name, description, capacity, price_per_hour, req.params.id);
  logChange({ userId: req.user.id, action: 'update_hall', entity: 'halls', entityId: parseInt(req.params.id), oldValue: old, newValue: req.body });
  res.json({ message: 'Зал оновлено' });
});
module.exports = router;