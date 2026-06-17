javascript


let currentPage = 0;
const pageSize  = 100;
document.addEventListener('DOMContentLoaded', () => {
  requireAuth(['admin']);
  document.getElementById('nav-logout').onclick = logout;
  loadChangelog();
});
async function loadChangelog() {
  const entity = document.getElementById('filter-entity').value;
  const limit  = parseInt(document.getElementById('filter-limit').value);
  const offset = currentPage * limit;
  const tbody = document.getElementById('changelog-body');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Завантаження...</td></tr>';
  try {
    let url = `/changelog?limit=${limit}&offset=${offset}`;
    if (entity) url += `&entity=${entity}`;
    const rows = await apiFetch(url);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Записів не знайдено</td></tr>';
      document.getElementById('next-page').disabled = true;
      return;
    }
    const actionLabels = {
      login: '🔑 Вхід', register: '📝 Реєстрація',
      create_user: '➕ Створення користувача', update_user: '✏️ Зміна користувача', delete_user: '🗑️ Видалення користувача',
      create_schedule: '➕ Додано заняття', update_schedule: '✏️ Змінено заняття', delete_schedule: '🗑️ Видалено заняття',
      create_booking: '📅 Нове бронювання', booking_confirmed: '✅ Підтверджено бронювання', booking_rejected: '❌ Відхилено бронювання',
      create_subscription: '🎟️ Новий абонемент', payment_success: '💳 Оплата',
      create_attendance: '📋 Відвідування', update_attendance: '✏️ Зміна відвідування',
      change_password: '🔒 Зміна паролю'
    };
    const entityLabels = {
      users: 'Користувачі', schedule: 'Розклад', bookings: 'Бронювання',
      subscriptions: 'Абонементи', attendance: 'Відвідування', halls: 'Зали'
    };
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${formatDateTime(r.created_at)}</td>
        <td>${r.user_name || '—'}</td>
        <td>${actionLabels[r.action] || r.action}</td>
        <td>${entityLabels[r.entity] || r.entity}</td>
        <td>${r.entity_id || '—'}</td>
        <td>${(r.old_value || r.new_value)
          ? `<button class="btn-sm btn-outline" onclick="showDetail('${encodeURIComponent(r.old_value||'')}','${encodeURIComponent(r.new_value||'')}')">🔍 Деталі</button>`
          : '—'}</td>
      </tr>`).join('');
    document.getElementById('page-info').textContent = `Сторінка ${currentPage + 1}`;
    document.getElementById('prev-page').disabled = currentPage === 0;
    document.getElementById('next-page').disabled = rows.length < limit;
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Помилка завантаження</td></tr>';
  }
}
function changePage(dir) {
  currentPage = Math.max(0, currentPage + dir);
  loadChangelog();
}
function showDetail(oldEnc, newEnc) {
  const oldVal = decodeURIComponent(oldEnc);
  const newVal = decodeURIComponent(newEnc);
  const fmt = str => {
    try { return JSON.stringify(JSON.parse(str), null, 2); }
    catch { return str || '—'; }
  };
  document.getElementById('diff-old').textContent = fmt(oldVal);
  document.getElementById('diff-new').textContent = fmt(newVal);
  openModal('change-detail-modal');
}