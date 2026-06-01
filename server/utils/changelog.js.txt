javascript


const db = require('./db');
function logChange({ userId, action, entity, entityId, oldValue, newValue, ip }) {
  db.prepare(`
    INSERT INTO changelog (user_id, action, entity, entity_id, old_value, new_value, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    action,
    entity,
    entityId || null,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null,
    ip || null
  );
}
module.exports = { logChange };