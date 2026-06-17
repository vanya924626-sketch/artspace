javascript


document.addEventListener('DOMContentLoaded', async () => {
  requireAuth(['admin', 'choreographer']);
  document.getElementById('nav-logout').onclick = logout;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('filter-date').value = today;
  await loadClassesSelect();
  await loadJournal();
});
async function loadClassesSelect() {
  const sel = document.getElementById('filter-class');
  const schedule = await apiFetch('/schedule');
  schedule.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = `${s.title} — ${s.hall_name}`;
    sel.appendChild(o);
  });
}
async function loadJournal() {
  const tbody = document.getElementById('journal-body');
  tbody.innerHTML = '<tr><td colspan="8" class="loading">Завантаження...</td></tr>';
  try {
    const date     = document.getElementById('filter-date').value;
    const classId  = document.getElementById('filter-class').value;
    let url = '/journal?';
    if (date)    url += `date=${date}&`;
    if (classId) url += `schedule_id=${classId}`;
    const rows = await apiFetch(url);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Записів не знайдено</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.user_name}</td>
        <td>${r.class_title}</td>
        <td>${r.hall_name}</td>
        <td>${formatDate(r.date)}</td>
        <td>${r.present ? '<span class="badge badge-green">Так</span>' : '<span class="badge badge-red">Ні</span>'}</td>
        <td>${r.subscription_id ? '✅ Абонемент' : '—'}</td>
        <td>${r.amount_paid ? r.amount_paid + ' грн' : '—'}</td>
        <td><button class="btn-sm btn-outline" onclick="editAttendance(${JSON.stringify(r).replace(/"/g,'&quot;')})">✏️</button></td>
      </tr>
    `).join('');
  } catch { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Помилка</td></tr>'; }
}
async function openAddAttendance() {
  await fillAttendanceModal();
  openModal('attendance-modal');
}
async function editAttendance(row) {
  await fillAttendanceModal(row);
  openModal('attendance-modal');
}
async function fillAttendanceModal(row = null) {
  // Завантажити танцівників
  const userSel = document.getElementById('att-user');
  userSel.innerHTML = '';
  const users = await apiFetch('/users');
  users.filter(u => u.role === 'dancer').forEach(u => {
    const o = document.createElement('option');
    o.value = u.id; o.textContent = u.name;
    userSel.appendChild(o);
  });
  // Завантажити заняття
  const classSel = document.getElementById('att-class');
  classSel.innerHTML = '';
  const schedule = await apiFetch('/schedule');
  schedule.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = `${s.title} — ${s.hall_name}`;
    classSel.appendChild(o);
  });
  if (row) {
    userSel.value = row.user_id;
    classSel.value = row.schedule_id;
    document.getElementById('att-date').value    = row.date;
    document.getElementById('att-present').value = row.present;
    document.getElementById('att-amount').value  = row.amount_paid || 0;
    document.getElementById('att-notes').value   = row.notes || '';
    await loadUserSubs(row.user_id, row.subscription_id);
  } else {
    document.getElementById('att-date').value = new Date().toISOString().split('T')[0];
    userSel.onchange = () => loadUserSubs(userSel.value);
  }
}
async function loadUserSubs(userId, selectedId = null) {
  const sel = document.getElementById('att-sub');
  sel.innerHTML = '<option value="">— без абонементу —</option>';
  try {
    const subs = await apiFetch('/subscriptions');
    subs.filter(s => s.user_id == userId && s.paid).forEach(s => {
      const o = document.createElement('option');
      o.value = s.id;
      const label = { single:'Разовий', '8':'8 занять', '16':'16 занять', unlimited:'Безліміт' }[s.type];
      o.textContent = `${label} (до ${formatDate(s.valid_to)})`;
      if (selectedId && s.id == selectedId) o.selected = true;
      sel.appendChild(o);
    });
  } catch {}
}
async function saveAttendance(e) {
  e.preventDefault();
  try {
    await apiFetch('/journal', {
      method: 'POST',
      body: JSON.stringify({
        schedule_id:     document.getElementById('att-class').value,
        user_id:         document.getElementById('att-user').value,
        date:            document.getElementById('att-date').value,
        present:         parseInt(document.getElementById('att-present').value),
        subscription_id: document.getElementById('att-sub').value || null,
        amount_paid:     parseFloat(document.getElementById('att-amount').value) || 0,
        notes:           document.getElementById('att-notes').value
      })
    });
    closeModal('attendance-modal');
    await loadJournal();
  } catch (err) { alert(err.message); }
}