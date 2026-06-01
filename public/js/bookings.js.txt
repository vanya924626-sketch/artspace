javascript


let hallsData = [];
let currentHallPrice = 0;
document.addEventListener('DOMContentLoaded', async () => {
  updateNav();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('book-date').value = today;
  document.getElementById('book-date').min = today;
  await loadHallsList();
  checkBookingAccess();
  if (new URLSearchParams(location.search).get('paid') === '1') {
    alert('✅ Оплату отримано! Дякуємо.');
  }
});
async function loadHallsList() {
  hallsData = await apiFetch('/halls');
  const sel  = document.getElementById('book-hall');
  const list = document.getElementById('halls-list');
  list.innerHTML = '';
  hallsData.forEach(h => {
    const o = document.createElement('option');
    o.value = h.id; o.textContent = h.name;
    sel.appendChild(o);
    const card = document.createElement('div');
    card.className = 'hall-card';
    card.onclick = () => selectHall(h.id);
    card.innerHTML = `
      <strong>${h.name}</strong>
      <p>${h.description || ''}</p>
      <p class="price-tag">₴${h.price_per_hour}/год · до ${h.capacity} осіб</p>`;
    list.appendChild(card);
  });
}
function selectHall(id) {
  document.getElementById('book-hall').value = id;
  loadAvailability();
}
async function loadAvailability() {
  const hallId = document.getElementById('book-hall').value;
  const date   = document.getElementById('book-date').value;
  const grid   = document.getElementById('availability-grid');
  if (!hallId || !date) {
    grid.innerHTML = '<p class="empty-state">Оберіть зал та дату</p>';
    return;
  }
  const hall = hallsData.find(h => h.id == hallId);
  currentHallPrice = hall?.price_per_hour || 0;
  const info = document.getElementById('hall-info');
  document.getElementById('hall-desc').textContent  = hall?.description || '';
  document.getElementById('hall-price').textContent = `₴${currentHallPrice} / год`;
  info.classList.remove('hidden');
  try {
    const { classes, bookings } = await apiFetch(`/schedule/availability?hall_id=${hallId}&date=${date}`);
    renderAvailabilityGrid(classes, bookings);
  } catch { grid.innerHTML = '<p class="empty-state">Помилка завантаження</p>'; }
}
function renderAvailabilityGrid(classes, bookings) {
  const grid = document.getElementById('availability-grid');
  grid.innerHTML = '';
  for (let h = 8; h < 22; h++) {
    const timeStr = `${String(h).padStart(2,'0')}:00`;
    const inClass   = classes.find(c  => c.start_time <= timeStr && c.end_time > timeStr);
    const inBooking = bookings.find(b => b.start_time <= timeStr && b.end_time > timeStr);
    const slot = document.createElement('div');
    slot.className = 'time-slot ' + (inClass ? 'slot-class' : inBooking ? 'slot-booked' : 'slot-free');
    slot.innerHTML = `
      <span class="slot-time">${timeStr}</span>
      <span class="slot-label">${inClass ? inClass.title : inBooking ? 'Орендовано' : 'Вільно'}</span>`;
    grid.appendChild(slot);
  }
}
function calcPrice() {
  const start = document.getElementById('book-start').value;
  const end   = document.getElementById('book-end').value;
  const prev  = document.getElementById('price-preview');
  const val   = document.getElementById('price-value');
  if (start && end && end > start) {
    const hours = (new Date(`2000-01-01T${end}`) - new Date(`2000-01-01T${start}`)) / 3600000;
    val.textContent = (hours * currentHallPrice).toFixed(0);
    prev.classList.remove('hidden');
  } else {
    prev.classList.add('hidden');
  }
}
function checkBookingAccess() {
  const user = getUser();
  const formSection  = document.getElementById('booking-form-section');
  const loginPrompt  = document.getElementById('login-prompt');
  const mySection    = document.getElementById('my-bookings-section');
  if (user?.role === 'renter' || user?.role === 'admin') {
    formSection.classList.remove('hidden');
    loginPrompt.classList.add('hidden');
    mySection.classList.remove('hidden');
    loadMyBookingsTable();
  } else if (user) {
    loginPrompt.querySelector('p').textContent = 'Для бронювання залу потрібен акаунт орендаря.';
  }
}
async function loadMyBookingsTable() {
  const tbody = document.getElementById('my-bookings-body');
  try {
    const bookings = await apiFetch('/bookings/my');
    if (!bookings.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Немає бронювань</td></tr>';
      return;
    }
    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td>${b.hall_name}</td>
        <td>${formatDate(b.date)}</td>
        <td>${b.start_time}–${b.end_time}</td>
        <td>${b.total_price} грн</td>
        <td>${statusLabel(b.status)}</td>
        <td>${b.paid
          ? '<span class="badge badge-green">Оплачено</span>'
          : b.status === 'confirmed'
            ? `<button class="btn-sm btn-primary" onclick="payBookingFromList(${b.id})">💳 Сплатити</button>`
            : '—'}</td>
        <td>${b.admin_note ? `<span title="${b.admin_note}">💬</span>` : '—'}</td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Помилка</td></tr>';
  }
}
async function submitBooking(e) {
  e.preventDefault();
  const errEl  = document.getElementById('book-error');
  const succEl = document.getElementById('book-success');
  errEl.classList.add('hidden');
  succEl.classList.add('hidden');
  try {
    await apiFetch('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        hall_id:    document.getElementById('book-hall').value,
        date:       document.getElementById('book-date').value,
        start_time: document.getElementById('book-start').value,
        end_time:   document.getElementById('book-end').value
      })
    });
    showEl(succEl, '✅ Заявку надіслано! Очікуйте підтвердження адміністратора.');
    succEl.className = 'form-success';
    succEl.classList.remove('hidden');
    document.getElementById('booking-form').reset();
    document.getElementById('price-preview').classList.add('hidden');
    await loadMyBookingsTable();
    await loadAvailability();
  } catch (err) {
    showEl(errEl, err.message);
  }
}
async function payBookingFromList(id) {
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