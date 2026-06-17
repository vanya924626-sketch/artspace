javascript


let allUsers = [];
let allBookings = [];
let currentBookingId = null;
document.addEventListener('DOMContentLoaded', async () => {
  requireAuth(['admin']);
  document.getElementById('nav-logout').onclick = logout;
  await loadUsers();
  await loadHalls();
  await loadBookings();
  await loadStats();
});
function showAdminTab(tab) {
  document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.remove('hidden');
  event.target.classList.add('active');
}
// ── Користувачі ───────────────────────────────────
async function loadUsers() {
  try {
    allUsers = await apiFetch('/users');
    renderUsers(allUsers);
  } catch { document.getElementById('users-body').innerHTML = '<tr><td colspan="6" class="empty-state">Помилка</td></tr>'; }
}
function renderUsers(users) {
  document.getElementById('users-body').innerHTML = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="badge badge-role-${u.role}">${roleLabel(u.role)}</span></td>
      <td>${u.phone || '—'}</td>
      <td>${formatDate(u.created_at)}</td>
      <td>
        <button class="btn-sm btn-outline" onclick="openEditUser(${JSON.stringify(u).replace(/"/g,'&quot;')})">✏️</button>
        <button class="btn-sm btn-danger" onclick="deleteUser(${u.id})">🗑️</button>
      </td>
    </tr>`).join('');
}
function filterUsers() {
  const q    = document.getElementById('user-search').value.toLowerCase();
  const role = document.getElementById('user-role-filter').value;
  renderUsers(allUsers.filter(u =>
    (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (!role || u.role === role)
  ));
}
function openAddUser() {
  document.getElementById('user-id').value = '';
  document.getElementById('user-form').reset();
  document.getElementById('user-modal-title').textContent = 'Додати користувача';
  document.getElementById('user-pass-group').style.display = 'block';
  document.getElementById('user-email').disabled = false;
  openModal('user-modal');
}
function openEditUser(u) {
  document.getElementById('user-id').value    = u.id;
  document.getElementById('user-name').value  = u.name;
  document.getElementById('user-email').value = u.email;
  document.getElementById('user-role').value  = u.role;
  document.getElementById('user-phone').value = u.phone || '';
  document.getElementById('user-modal-title').textContent = 'Редагувати користувача';
  document.getElementById('user-pass-group').style.display = 'none';
  document.getElementById('user-email').disabled = true;
  openModal('user-modal');
}
async function saveUser(e) {
  e.preventDefault();
  const id  = document.getElementById('user-id').value;
  const err = document.getElementById('user-error');
  const body = {
    name:     document.getElementById('user-name').value,
    email:    document.getElementById('user-email').value,
    role:     document.getElementById('user-role').value,
    phone:    document.getElementById('user-phone').value,
    password: document.getElementById('user-password')?.value
  };
  try {
    if (id) {
      await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal('user-modal');
    await loadUsers();
  } catch (e) { showEl(err, e.message); }
}
async function deleteUser(id) {
  if (!confirm('Видалити користувача?')) return;
  try {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    await loadUsers();
  } catch (e) { alert(e.message); }
}
// ── Зали ──────────────────────────────────────────
async function loadHalls() {
  const halls = await apiFetch('/halls');
  document.getElementById('halls-body').innerHTML = halls.map(h => `
    <tr>
      <td>${h.name}</td>
      <td>${h.description || '—'}</td>
      <td>${h.capacity || '—'}</td>
      <td>${h.price_per_hour}</td>
      <td><button class="btn-sm btn-outline" onclick="openEditHall(${JSON.stringify(h).replace(/"/g,'&quot;')})">✏️</button></td>
    </tr>`).join('');
}
function openEditHall(h) {
  document.getElementById('hall-id').value          = h.id;
  document.getElementById('hall-name').value        = h.name;
  document.getElementById('hall-description').value = h.description || '';
  document.getElementById('hall-capacity').value    = h.capacity || '';
  document.getElementById('hall-price').value       = h.price_per_hour;
  openModal('hall-modal');
}
async function saveHall(e) {
  e.preventDefault();
  const id = document.getElementById('hall-id').value;
  try {
    await apiFetch(`/halls/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name:           document.getElementById('hall-name').value,
        description:    document.getElementById('hall-description').value,
        capacity:       document.getElementById('hall-capacity').value,
        price_per_hour: document.getElementById('hall-price').value
      })
    });
    closeModal('hall-modal');
    await loadHalls();
  } catch (e) { alert(e.message); }
}
// ── Бронювання ────────────────────────────────────
async function loadBookings() {
  allBookings = await apiFetch('/bookings');
  renderBookings(allBookings);
}
function renderBookings(bookings) {
  document.getElementById('bookings-body').innerHTML = bookings.map(b => `
    <tr>
      <td>${b.renter_name}<br><small>${b.renter_email}</small></td>
      <td>${b.hall_name}</td>
      <td>${formatDate(b.date)}</td>
      <td>${b.start_time}–${b.end_time}</td>
      <td>${b.total_price} грн</td>
      <td>${statusLabel(b.status)}</td>
      <td>${b.paid ? '<span class="badge badge-green">✅</span>' : '—'}</td>
      <td>${b.status === 'pending'
        ? `<button class="btn-sm btn-primary" onclick="openBookingAction(${b.id})">Розглянути</button>`
        : '—'}</td>
    </tr>`).join('');
}
function filterBookings() {
  const status = document.getElementById('booking-status-filter').value;
  renderBookings(allBookings.filter(b => !status || b.status === status));
}
function openBookingAction(id) {
  currentBookingId = id;
  const b = allBookings.find(b => b.id === id);
  document.getElementById('booking-action-info').innerHTML = `
    <p><strong>Орендар:</strong> ${b.renter_name} (${b.renter_email})</p>
    <p><strong>Зал:</strong> ${b.hall_name}</p>
    <p><strong>Дата:</strong> ${formatDate(b.date)} ${b.start_time}–${b.end_time}</p>
    <p><strong>Вартість:</strong> ${b.total_price} грн</p>`;
  document.getElementById('booking-note').value = '';
  openModal('booking-action-modal');
}
async function setBookingStatus(status) {
  try {
    await apiFetch(`/bookings/${currentBookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_note: document.getElementById('booking-note').value })
    });
    closeModal('booking-action-modal');
    await loadBookings();
  } catch (e) { alert(e.message); }
}
// ── Статистика ────────────────────────────────────
async function loadStats() {
  try {
    const users = await apiFetch('/users');
    document.getElementById('stat-users').textContent   = users.length;
    document.getElementById('stat-dancers').textContent = users.filter(u => u.role === 'dancer').length;
    const bookings = await apiFetch('/bookings');
    const thisMonth = new Date().toISOString().slice(0,7);
    const monthBookings = bookings.filter(b => b.date?.startsWith(thisMonth));
    document.getElementById('stat-bookings').textContent = monthBookings.length;
    document.getElementById('stat-revenue').textContent  =
      monthBookings.filter(b => b.paid).reduce((s, b) => s + b.total_price, 0).toFixed(0);
    const subs = await apiFetch('/subscriptions');
    document.getElementById('stat-subs').textContent = subs.filter(s => s.paid).length;
  } catch {}
}