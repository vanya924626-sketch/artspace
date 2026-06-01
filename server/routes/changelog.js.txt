javascript


const router = require('express').Router();
const db = require('../utils/db');
const { authenticate, requireRole } = require('../middleware/auth');
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const { entity, limit = 100, offset = 0 } = req.query;
  let query = `
    SELECT c.*, u.name as user_name FROM changelog c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (entity) { query += ' AND c.entity = ?'; params.push(entity); }
  query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  res.json(db.prepare(query).all(...params));
});
module.exports = router;