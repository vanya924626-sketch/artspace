javascript


const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { logChange } = require('../utils/changelog');
const { queueEmail } = require('../utils/email');
// Реєстрація
router.post('/register', async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'Заповніть всі поля' });
  const allowed = ['dancer', 'renter'];
  if (!allowed.includes(role))
    return res.status(403).json({ error: 'Недозволена роль' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(name, email, hash, role, phone || null);
    logChange({ action: 'register', entity: 'users', entityId: result.lastInsertRowid, newValue: { name, email, role } });
    await queueEmail(email, 'Ласкаво просимо до ArtSpace! 🩰', `
      <h2>Привіт, ${name}!</h2>
      <p>Ваш акаунт у <strong>ArtSpace Dance Lviv</strong> успішно створено.</p>
      <p>Роль: <strong>${role === 'dancer' ? 'Танцівник' : 'Орендар'}</strong></p>
      <p><a href="${process.env.APP_URL}">Увійти на сайт</a></p>
    `);
    res.json({ message: 'Реєстрація успішна' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email вже зайнятий' });
    res.status(500).json({ error: 'Помилка сервера' });
  }
});
// Вхід
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Невірний email або пароль' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Невірний email або пароль' });
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
  logChange({ action: 'login', entity: 'users', entityId: user.id });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});
// Змінити пароль
router.post('/change-password', require('../middleware/auth').authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const ok = await bcrypt.compare(oldPassword, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'Невірний поточний пароль' });
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  logChange({ action: 'change_password', entity: 'users', entityId: req.user.id, userId: req.user.id });
  res.json({ message: 'Пароль змінено' });
});
module.exports = router;