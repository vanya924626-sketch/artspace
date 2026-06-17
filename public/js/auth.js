javascript


const API = '/api';
function getToken() { return localStorage.getItem('token'); }
function getUser()  { return JSON.parse(localStorage.getItem('user') || 'null'); }
function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, { headers: authHeaders(), ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Помилка запиту');
  return data;
}
async function handleLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email:    document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      })
    });
    saveAuth(data.token, data.user);
    closeModal('login-modal');
    updateNav();
    window.location.href = '/dashboard.html';
  } catch (err) {
    showEl(errEl, err.message);
  }
}
async function handleRegister(e) {
  e.preventDefault();
  const errEl  = document.getElementById('reg-error');
  const succEl = document.getElementById('reg-success');
  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name:     document.getElementById('reg-name').value,
        email:    document.getElementById('reg-email').value,
        phone:    document.getElementById('reg-phone')?.value || '',
        role:     document.getElementById('reg-role').value,
        password: document.getElementById('reg-password').value
      })
    });
    hideEl(errEl);
    showEl(succEl, '✅ Реєстрація успішна! Тепер увійдіть.');
    setTimeout(() => switchTab('login'), 2000);
  } catch (err) {
    showEl(errEl, err.message);
  }
}
async function changePassword(e) {
  e.preventDefault();
  const msgEl = document.getElementById('pass-msg');
  try {
    await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        oldPassword: document.getElementById('old-pass').value,
        newPassword: document.getElementById('new-pass').value
      })
    });
    msgEl.className = 'form-success';
    msgEl.textContent = '✅ Пароль змінено';
    msgEl.classList.remove('hidden');
    e.target.reset();
  } catch (err) {
    msgEl.className = 'form-error';
    msgEl.textContent = err.message;
    msgEl.classList.remove('hidden');
  }
}
function logout() {
  clearAuth();
  window.location.href = '/';
}
function updateNav() {
  const user      = getUser();
  const loginBtn  = document.getElementById('nav-login');
  const logoutBtn = document.getElementById('nav-logout');
  const cabinet   = document.getElementById('nav-cabinet');
  if (user) {
    loginBtn  && (loginBtn.style.display  = 'none');
    logoutBtn && (logoutBtn.style.display = 'inline-block');
    cabinet   && (cabinet.style.display   = 'inline-block');
    if (logoutBtn) logoutBtn.onclick = logout;
  } else {
    loginBtn  && (loginBtn.style.display  = 'inline-block');
    logoutBtn && (logoutBtn.style.display = 'none');
    cabinet   && (cabinet.style.display   = 'none');
  }
}
// ── Модальні вікна ────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
  document.body.style.overflow = '';
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
    document.body.style.overflow = '';
  }
});
function switchTab(tab) {
  document.getElementById('login-form')?.classList.toggle('hidden',    tab !== 'login');
  document.getElementById('register-form')?.classList.toggle('hidden', tab !== 'register');
  document.querySelectorAll('.modal-tabs .tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
}
// ── DOM хелпери ───────────────────────────────────
function showEl(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideEl(el) {
  el?.classList.add('hidden');
}
function requireAuth(allowedRoles = []) {
  const user = getUser();
  if (!user) { window.location.href = '/'; return null; }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    window.location.href = '/dashboard.html';
    return null;
  }
  return user;
}
function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('uk-UA');
}
function formatDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('uk-UA');
}
function roleLabel(role) {
  return { admin: 'Адмін', choreographer: 'Хореограф', dancer: 'Танцівник', renter: 'Орендар' }[role] || role;
}
function statusLabel(status) {
  return { pending: '⏳ Очікує', confirmed: '✅ Підтверджено', rejected: '❌ Відхилено', cancelled: '🚫 Скасовано' }[status] || status;
}
// ── Ініціалізація ─────────────────────────────────
document.addEventListener('DOMContentLoaded', updateNav);