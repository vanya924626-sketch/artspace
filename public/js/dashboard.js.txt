javascript


document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  document.getElementById('user-greeting').textContent =
    `Вітаємо, ${user.name}! (${roleLabel(user.role)})`;
  if (user.role === 'dancer') {
    document.getElementById('dancer-section').classList.remove('hidden');
    await loadMySubscriptions();
    await loadMyAttendance();
  }
  if (user.role === 'renter') {
    document.getElementById('renter-section').classList.remove('hidden');
    await loadMyBookings();
  }
  if (user.role === 'choreographer') {
    document.getElementById('choreo-section').classList.remove('hidden');
    await loadMyClasses();
  }
  if (user.role === 'admin') {
    document.getElementById('admin-section').classList.remove('hidden');
  }
  document.getElementById('nav-logout').onclick = logout;
});
async function loadMySubscriptions() {
  const el = document.getElementById('my-subscriptions');
  try {
    const subs = await apiFetch('/subscriptions/my');
    if (!subs.length) { el.innerHTML = '<p class="empty-state">Немає активних абонементів</p>'; return; }
    el.innerHTML = subs.map(s => {
      const remaining = s.type === 'unlimited' ? '∞' : (s.total_classes - s.used_classes);
      const paidBadge = s.paid ? '<span class="badge badge-green">Оплачено</span>' : '<span class="badge badge-red">Не оплачено</span>';
      const typeLabel = { single: 'Разовий', '8': '8 занять', '16': '16 занять', unlimited: 'Безліміт' }[s.type] || s.type;
      return `
        <div class="sub-card ${!s.paid ? 'sub-unpaid' : ''}">
          <div class="sub-header">
            <strong>${typeLabel}</strong> ${paidBadge}
          </div>
          <div class="sub-body">
            ${s.type !== 'unlimited' ? `<div class="sub-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width:${Math.min(100, (s.used_classes/s.total_classes)*100)}%"></div>
              </div>
              <span>${s.used_classes} / ${s.total_classes} занять використано</span>
            </div>` : '<p>Необмежена кількість занять</p>'}
            <p>Дійсний: ${formatDate(s.valid_from)} — ${formatDate(s.valid_to)}</p>
          </div>
          ${!s.paid ? `<button class="btn-primary btn-sm" onclick="paySubscription(${s.id})">💳 Оплатити онлайн</button>` : ''}
        </div>
      `;
    }).join('');
  } catch { el.innerHTML = '<p class="empty-state">Помилка завантаження</p>'; }
}
async function loadMyAttendance() {
  const el = document.getElementById('my-attendance');
  try {
    const user = getUser();
    const all = await apiFetch('/journal');
    const mine = all.filter(a => a.user_id == user.id).slice(0, 10);
    if (!mine.length) { el.innerHTML = '<p class="empty-state">Немає записів</p>'; return; }
    el.innerHTML = `<table class="data-table">
      <thead><tr><th>Дата</th><th>Заняття</th><th>Зал</th><th>Присутній</th></tr></thead>
      <tbody>${mine.map(a => `
        <tr>
          <td>${formatDate(a.date)}</td>
          <td>${a.class_title}</td>
          <td>${a.hall_name}</td>
          <td>${a.present ? '✅' : '❌'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch { el.innerHTML = '<p class="empty-state">Помилка завантаження</p>'; }
}
async function loadMyBookings() {
  const el = document.getElementById('my-bookings');
  try {
    const bookings = await apiFetch('/bookings/my');
    if (!bookings.length) { el.innerHTML = '<p class="empty-state">Немає бронювань</p>'; return; }
    el.innerHTML = `<table class="data-table">
      <thead><tr><th>Зал</th><th>Дата</th><th>Час</th><th>Статус</th><th>Оплата</th></tr></thead>
      <tbody>${bookings.map(b => `
        <tr>
          <td>${b.hall_name}</td>
          <td>${formatDate(b.date)}</td>
          <td>${b.start_time}–${b.end_time}</td>
          <td>${statusLabel(b.status)}</td>
          <td>${b.paid ? '✅' : b.status === 'confirmed' ? `<button class="btn-sm btn-primary" onclick="payBooking(${b.id})">💳 Сплатити</button>` : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch { el.innerHTML = '<p class="empty-state">Помилка завантаження</p>'; }
}
async function loadMyClasses() {
  const el = document.getElementById('my-classes');
  try {
    const schedule = await apiFetch('/schedule');
    const user = getUser();
    const mine = schedule.filter(s => s.choreographer_id == user.id);
    if (!mine.length) { el.innerHTML = '<p class="empty-state">Немає занять</p>'; return; }
    el.innerHTML = mine.map(s =>
      `<div class="class-item">
        <strong>${s.title}</strong> — ${s.hall_name}
        <span>${DAYS[s.day_of_week]} ${s.start_time}–${s.end_time}</span>
      </div>`
    ).join('');
  } catch { el.innerHTML = '<p class="empty-state">Помилка</p>'; }
}
async function paySubscription(id) {
  try {
    const { data, signature } = await apiFetch(`/subscriptions/${id}/pay`, { method: 'POST' });
    submitLiqPay(data, signature);
  } catch (err) { alert(err.message); }
}
async function payBooking(id) {
  try {
    const { data, signature } = await apiFetch(`/bookings/${id}/pay`, { method: 'POST' });
    submitLiqPay(data, signature);
  } catch (err) { alert(err.message); }
}
function submitLiqPay(data, signature) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '[liqpay.ua](https://www.liqpay.ua/api/3/checkout)';
  form.acceptCharset = 'utf-8';
  [['data', data], ['signature', signature]].forEach(([name, value]) => {
    const inp = document.createElement('input');
    inp.type = 'hidden'; inp.name = name; inp.value = value;
    form.appendChild(inp);
  });
  document.body.appendChild(form);
  form.submit();
}
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];