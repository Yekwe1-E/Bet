// admin.js - Handles Admin Panel logic for premium UI

document.addEventListener('DOMContentLoaded', () => {
    requireAdmin();
    
    loadMetrics();
    loadUsers();
    loadEvents();
    loadWithdrawals();
    
    document.getElementById('create-event-form').addEventListener('submit', createEvent);
});

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(link => {
        if (link.getAttribute('onclick').includes(tabName)) {
            link.classList.add('active');
        }
    });

    if (tabName === 'dashboard') loadMetrics();
    if (tabName === 'users') loadUsers();
    if (tabName === 'events') loadEvents();
    if (tabName === 'withdrawals') loadWithdrawals();
}

function showAlert(message, type = 'success') {
    const container = document.getElementById('alert-container');
    const badgeClass = type === 'success' ? 'badge-won' : 'badge-lost';
    container.innerHTML = `<div class="badge ${badgeClass}" style="width: 100%; text-align: center; padding: 1rem; margin-bottom: 1.5rem; font-size: 1rem; display: block;">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// Metrics
async function loadMetrics() {
    try {
        const response = await fetchAPI('/admin/metrics');
        const data = response.data;
        document.getElementById('metric-users').textContent = data.total_users;
        document.getElementById('metric-deposits').textContent = `₦ ${parseFloat(data.total_deposits).toLocaleString()}`;
        document.getElementById('metric-withdrawals').textContent = `₦ ${parseFloat(data.total_withdraws).toLocaleString()}`;
        document.getElementById('metric-bets').textContent = data.active_bets;
    } catch (error) {
        console.error('Failed to load metrics:', error);
    }
}

// Users
async function loadUsers() {
    try {
        const response = await fetchAPI('/admin/users');
        const tbody = document.getElementById('users-body');
        
        tbody.innerHTML = response.data.map(u => `
            <tr>
                <td>#${u.id}</td>
                <td>
                    <div style="font-weight: 700;">${u.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${u.email}</div>
                </td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-pending' : 'badge-won'}">${u.role.toUpperCase()}</span></td>
                <td><span class="badge ${u.is_blocked ? 'badge-lost' : 'badge-won'}">${u.is_blocked ? 'BLOCKED' : 'ACTIVE'}</span></td>
                <td style="color: var(--text-dim);">${new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Events
async function loadEvents() {
    try {
        const response = await fetchAPI('/bet/events'); 
        const tbody = document.getElementById('admin-events-body');
        
        const activeEvents = response.data.filter(e => e.status === 'active');
        
        if (activeEvents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">No active betting markets found.</td></tr>';
            return;
        }

        tbody.innerHTML = activeEvents.map(e => `
            <tr>
                <td style="font-family: monospace; color: var(--text-dim);">#${e.id}</td>
                <td>
                    <div style="font-weight: 700;">${e.title}</div>
                    <div style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">${e.category.toUpperCase()}</div>
                </td>
                <td><span class="badge badge-won">LIVE / OPEN</span></td>
                <td>
                    <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="openSettleModal(${e.id})">DECLARE RESULT</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load events:', error);
    }
}

async function createEvent(e) {
    e.preventDefault();
    const btn = document.getElementById('ev-submit-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'PUBLISHING...';

    try {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        const startTime = date.toISOString().slice(0, 19).replace('T', ' ');

        await fetchAPI('/admin/events', 'POST', {
            title: document.getElementById('ev-title').value,
            category: document.getElementById('ev-category').value,
            odds_home: document.getElementById('ev-odds-home').value,
            odds_draw: document.getElementById('ev-odds-draw').value,
            odds_away: document.getElementById('ev-odds-away').value,
            start_time: startTime
        });

        showAlert('New market published successfully!');
        e.target.reset();
        loadEvents();
        loadMetrics();
    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Settle Event
function openSettleModal(eventId) {
    document.getElementById('settle-event-id').value = eventId;
    document.getElementById('settle-modal').style.display = 'flex';
}

async function submitSettlement(result) {
    const eventId = document.getElementById('settle-event-id').value;
    try {
        await fetchAPI(`/admin/events/${eventId}/settle`, 'POST', { result });
        showAlert(`Market settled as ${result.toUpperCase()}. Winnings distributed.`);
        document.getElementById('settle-modal').style.display = 'none';
        
        loadEvents();
        loadMetrics(); 
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// Withdrawals
async function loadWithdrawals() {
    try {
        // We'll need to check if this endpoint exists in adminController.js
        // If not, we'll need to add it.
        const response = await fetchAPI('/admin/withdrawals');
        const tbody = document.getElementById('withdrawals-body');
        
        if (response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No pending withdrawal requests.</td></tr>';
            return;
        }

        tbody.innerHTML = response.data.map(w => `
            <tr>
                <td>#${w.id}</td>
                <td>${w.user_name || 'User #' + w.user_id}</td>
                <td style="font-weight: 700;">₦ ${parseFloat(w.amount).toLocaleString()}</td>
                <td style="color: var(--text-dim);">${new Date(w.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="handleWithdrawal(${w.id}, 'approved')">Approve</button>
                    <button class="btn btn-ghost" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="handleWithdrawal(${w.id}, 'rejected')">Reject</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load withdrawals:', error);
    }
}

async function handleWithdrawal(id, status) {
    try {
        await fetchAPI(`/admin/withdrawals/${id}`, 'POST', { status });
        showAlert(`Withdrawal ${status} successfully.`);
        loadWithdrawals();
        loadMetrics();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}
