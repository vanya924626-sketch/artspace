javascript


const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
const HOURS = Array.from({length: 14}, (_, i) => `${String(i + 8).padStart(2,'0')}:00`);
let currentWeekOffset = 0;
let allSchedule = [];
let halls = [];
document.addEventListener('DOMContentLoaded', async () => {
  updateNav();
  await loadHalls();
  renderWeekHeader();
  await loadSchedule();
  checkAdminPanel();
});
function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
function renderWeekHeader() {
  const dates = getWeekDates(currentWeekOffset);
  const label = `${dates[0].toLocaleDateString('uk-UA')} — ${dates[6].toLocaleDateString('uk-UA')}`;
  document.getElementById('week-label').textContent = label;
  DAYS.forEach((d, i) => {
    const el = document.getElementById(`day-${i}`);
    if (el) el.textContent = `${d} ${dates[i].getDate()}`;
  });
}
async function loadHalls() {
  halls = await apiFetch('/halls');
  const sel = document.getElementById('hall-select');
  halls.forEach(h => {
    const o = document.createElement('option');
    o.value = h.id; o.textContent = h.name;
    sel.appendChild(o);
  });
  const classHall = document.getElementById('class-hall');
  if (classHall) halls.forEach(h => {
    const o = document.createElement('option');
    o.value = h.id; o.textContent = h.name;
    classHall.appendChild(o);
  });
}
async function loadSchedule() {
  const hallId = document.getElementById('hall-select').value;
  const params = hallId ? `?hall_id=${hallId}` : '';
  allSchedule = await apiFetch(`/schedule${params}`);
  renderSchedule();
}
function renderSchedule() {
  const tbody = document.getElementById('schedule-body');
  const dates = getWeekDates(currentWeekOffset);
  const hallId = document.getElementById('hall-select').value;
  tbody.innerHTML = '';
  HOURS.forEach(hour => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="time-col">${hour}</td>`;
    dates.forEach((date, dayIdx) => {
      const dateStr = date.toISOString().split('T')[0];
      const dow = dayIdx; // 0=Пн
      const classes = allSchedule.filter(s =>
        (s.is_recurring && s.day_of_week == dow) ||
        (!s.is_recurring && s.date_specific === dateStr)
      ).filter(s => s.start_time <= hour && s.end_time > hour);
      const td = document.createElement('td');
      if (classes.length) {
        td.className = 'cell-class';
        td.innerHTML = classes.map(c =>
          `<div class="cell-event" title="${c.choreographer_name || ''}">
            <strong>${c.title}</strong>
            <small>${c.hall_name}</small>
            <small>${c.start_time}–${c.end_time}</small>
            ${getUser()?.role === 'admin' ? `<button onclick="editClass(${c.id})" class="cell-edit-btn">✏️</button>` : ''}
          </div>`
        ).join('');
      } else {
        td.className = 'cell-free';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}
function changeWeek(dir) {
  currentWeekOffset += dir;
  renderWeekHeader();
  renderSchedule();
}
function checkAdminPanel() {
  const user = getUser();
  if (user?.role === 'admin') {
    document.getElementById('admin-panel')?.classList.remove('hidden');
    loadChoreos();
  }
}
async function loadChoreos() {
  try {
    const users = await apiFetch('/users');
    const sel = document.getElementById('class-choreo');
    if (!sel) return;
    sel.innerHTML = '<option value="">— без хореографа —</option>';
    users.filter(u => u.role === 'choreographer').forEach(u => {
      const o = document.createElement('option');
      o.value = u.id; o.textContent = u.name;
      sel.appendChild(o);
    });
  } catch {}
}
function openAddClass() {
  document.getElementById('class-id').value = '';
  document.getElementById('class-form').reset();
  document.getElementById('class-modal-title').textContent = 'Додати заняття';
  openModal('add-class-modal');
}
async function editClass(id) {
  const cls = allSchedule.find(s => s.id == id);
  if (!cls) return;
  document.getElementById('class-id').value = cls.id;
  document.getElementById('class-hall').value = cls.hall_id;
  document.getElementById('class-choreo').value = cls.choreographer_id || '';
  document.getElementById('class-title').value = cls.title;
  document.getElementById('class-start').value = cls.start_time;
  document.getElementById('class-end').value = cls.end_time;
  document.getElementById('class-recurring').value = cls.is_recurring;
  document.getElementById('class-day').value = cls.day_of_week;
  document.getElementById('class-modal-title').textContent = 'Редагувати заняття';
  toggleDateField();
  openModal('add-class-modal');
}
function toggleDateField() {
  const recurring = document.getElementById('class-recurring').value === '1';
  document.getElementById('day-group').classList.toggle('hidden', !recurring);
  document.getElementById('date-group').classList.toggle('hidden', recurring);
}
async function saveClass(e) {
  e.preventDefault();
  const id = document.getElementById('class-id').value;
  const body = {
    hall_id:          document.getElementById('class-hall').value,
    choreographer_id: document.getElementById('class-choreo').value || null,
    title:            document.getElementById('class-title').value,
    start_time:       document.getElementById('class-start').value,
    end_time:         document.getElementById('class-end').value,
    is_recurring:     parseInt(document.getElementById('class-recurring').value),
    day_of_week:      parseInt(document.getElementById('class-day').value),
    date_specific:    document.getElementById('class-date').value || null
  };
  try {
    if (id) {
      await apiFetch(`/schedule/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/schedule', { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal('add-class-modal');
    await loadSchedule();
  } catch (err) {
    alert(err.message);
  }
}