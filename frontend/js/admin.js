// admin.js - Handles Admin Panel logic

document.addEventListener('DOMContentLoaded', () => {
    requireAdmin();
    
    loadMetrics();
    loadUsers();
    loadEvents();
    
    document.getElementById('create-event-form').addEventListener('submit', createEvent);
});

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    document.querySelector(`.sidebar-menu a[onclick="showTab('${tabName}')"]`).classList.add('active');
}

function showAlert(message, type = 'success') {
    const container = document.getElementById('alert-container');
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 3000);
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
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-success'}">${u.role.toUpperCase()}</span></td>
                <td><span class="badge ${u.is_blocked ? 'badge-danger' : 'badge-success'}">${u.is_blocked ? 'Blocked' : 'Active'}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Events
async function loadEvents() {
    try {
        const response = await fetchAPI('/bet/events'); // Reuse public endpoint
        const tbody = document.getElementById('admin-events-body');
        
        const activeEvents = response.data.filter(e => e.status === 'active');
        
        if (activeEvents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No active events.</td></tr>';
            return;
        }

        tbody.innerHTML = activeEvents.map(e => `
            <tr>
                <td>#${e.id}</td>
                <td><strong>${e.title}</strong><br/>${e.category}</td>
                <td>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="openSettleModal(${e.id})">Settle Event</button>
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
    btn.disabled = true;

    try {
        // Create an arbitrary start time for now (tomorrow)
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

        showAlert('Event created successfully!');
        e.target.reset();
        loadEvents();
    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// Settle Event
function openSettleModal(eventId) {
    document.getElementById('settle-event-id').value = eventId;
    document.getElementById('settle-modal').style.display = 'block';
}

async function submitSettlement(result) {
    const eventId = document.getElementById('settle-event-id').value;
    try {
        await fetchAPI(`/admin/events/${eventId}/settle`, 'POST', { result });
        showAlert(`Event scheduled successfully as ${result.toUpperCase()}`);
        document.getElementById('settle-modal').style.display = 'none';
        
        loadEvents();
        loadMetrics(); // Update metrics as winnings might have changed
    } catch (error) {
        showAlert(error.message, 'error');
    }
}
