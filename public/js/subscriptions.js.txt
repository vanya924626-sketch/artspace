javascript


let allSubs = [];
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth(['admin', 'choreographer']);
  if (!user) return;
  document.getElementById('nav-logout').onclick = logout;
  if (user.role === 'admin' || user.role === 'choreographer') {
    document.getElementById('add-sub-btn').style.display = 'inline-block';
  }
  await loadSubs();
  await loadDancersSelect();
});
async function loadSubs() {
  try {
    allSubs = await apiFetch('/subscriptions');
    renderSubs(allSubs);
  } catch { document.getElementById('subs-body').innerHTML = '<tr><td colspan="7" class="empty-state">Помилка</td></tr>'; }
}
function renderSubs(subs) {
  const tbody = document.getElementById('subs-body');
  if (!subs.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Абонементів не знайдено</td></tr>';
    return;
  }
  const typeLabel = { single:'Разовий', '8':'8 занять', '16':'16 занять', unlimited:'Безліміт' };
  tbody.innerHTML = subs.map(s => {
    const remaining = s.type === 'unlimited' ? '∞' : (s.total_classes - s.used_classes);
    const lowAlert  = s.type !== 'unlimited' && remaining <= 2 && s.paid
      ? '<span class="badge badge-yellow">⚠️ Мало</span>' : '';
    return `
      <tr class="${!s.paid ? 'row-unpaid' : ''}">
        <td>${s.name}<br><small>${s.email}</small></td>
        <td>${typeLabel[s.type] || s.type}</td>
        <td>${s.used_classes ?? 0}</td>
        <td>${remaining} ${lowAlert}</td>
        <td>${formatDate(s.valid_to)}</td>
        <td>${s.paid
          ? '<span class="badge badge-green">✅ Оплачено</span>'
          : '<span class="badge badge-red">❌ Не оплачено</span>'}</td>
        <td>
          <button class="btn-sm btn-outline" onclick="markPaid(${s.id}, ${s.paid})">
            ${s.paid ? 'Скасувати оплату' : '✅ Позначити оплаченим'}
          </button>
        </td>
      </tr>`;
  }).join('');
}
function filterSubs() {
  const search = document.getElementById('search-user').value.toLowerCase();
  const type   = document.getElementById('filter-type').value;
  const paid   = document.getElementById('filter-paid').value;
  const filtered = allSubs.filter(s => {
    const matchName = s.name?.toLowerCase().includes(search) || s.email?.toLowerCase().includes(search);
    const matchType = !type || s.type === type;
    const matchPaid = paid === '' || String(s.paid) === paid;
    return matchName && matchType && matchPaid;
  });
  renderSubs(filtered);
}
async function loadDancersSelect() {
  const sel = document.getElementById('sub-user');
  const users = await apiFetch('/users');
  users.filter(u => u.role === 'dancer').forEach(u => {
    const o = document.createElement('option');
    o.value = u.id; o.textContent = `${u.name} (${u.email})`;
    sel.appendChild(o);
  });
}
function openAddSub() {
  document.getElementById('sub-form').reset();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('sub-from').value = today;
  const monthLater = new Date();
  monthLater.setMonth(monthLater.getMonth() + 1);
  document.getElementById('sub-to').value = monthLater.toISOString().split('T')[0];
  openModal('add-sub-modal');
}
async function saveSub(e) {
  e.preventDefault();
  const errEl = document.getElementById('sub-error');
  try {
    await apiFetch('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        user_id:        document.getElementById('sub-user').value,
        type:           document.getElementById('sub-type').value,
        payment_method: document.getElementById('sub-payment').value,
        valid_from:     document.getElementById('sub-from').value,
        valid_to:       document.getElementById('sub-to').value
      })
    });
    closeModal('add-sub-modal');
    await loadSubs();
  } catch (err) { showEl(errEl, err.message); }
}
async function markPaid(id, currentPaid) {
  if (!confirm(currentPaid ? 'Скасувати оплату?' : 'Позначити як оплачений?')) return;
  try {
    await apiFetch(`/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ paid: currentPaid ? 0 : 1 })
    });
    await loadSubs();
  } catch (err) { alert(err.message); }
}