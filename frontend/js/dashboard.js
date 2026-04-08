// dashboard.js - Handles User Dashboard logic

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    if (getUserRole() === 'admin') {
        window.location.href = '/admin.html';
    }

    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('user-greeting').textContent = `Hello, ${user.name.split(' ')[0]}`;

    // Load initial data
    loadWallet();
    loadTransactions();
    loadEvents();
    loadBets();

    // Setup bet slip listeners
    document.getElementById('bet-amount').addEventListener('input', updatePotentialWin);
    document.getElementById('place-bet-btn').addEventListener('click', placeBet);
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

// ==========================================
// WALLET LOGIC
// ==========================================
async function loadWallet() {
    try {
        const response = await fetchAPI('/wallet/balance');
        document.getElementById('wallet-balance').textContent = `₦ ${parseFloat(response.data.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    } catch (error) {
        console.error('Failed to load wallet:', error);
    }
}

async function loadTransactions() {
    try {
        const response = await fetchAPI('/wallet/transactions');
        const tbody = document.getElementById('transactions-body');
        
        if (response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No transactions found.</td></tr>';
            return;
        }

        tbody.innerHTML = response.data.map(tx => `
            <tr>
                <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                <td><span class="badge ${tx.type === 'credit' ? 'badge-success' : 'badge-danger'}">${tx.type.toUpperCase()}</span></td>
                <td>₦ ${parseFloat(tx.amount).toLocaleString()}</td>
                <td><span class="badge badge-success">Completed</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load transactions:', error);
    }
}

// Modals
function openDepositModal() {
    document.getElementById('deposit-modal').style.display = 'block';
}

function closeModals() {
    document.getElementById('deposit-modal').style.display = 'none';
}

async function submitDeposit() {
    const amount = document.getElementById('deposit-amount').value;
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    
    try {
        await fetchAPI('/wallet/deposit', 'POST', { amount });
        showAlert('Deposit successful!');
        closeModals();
        loadWallet();
        loadTransactions();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function openWithdrawModal() {
    // Basic alert for now, can be expanded to full modal
    const amount = prompt("Enter amount to withdraw (Subject to Admin Approval):");
    if (amount && Number(amount) > 0) {
        submitWithdrawal(amount);
    }
}

async function submitWithdrawal(amount) {
    try {
        await fetchAPI('/wallet/withdraw', 'POST', { amount });
        showAlert('Withdrawal requested successfully! Waiting for admin approval.');
        // Balance is immediately deducted based on backend logic
        loadWallet();
        loadTransactions();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ==========================================
// BETTING LOGIC
// ==========================================
let allEvents = [];
let selectedEvent = null;
let selectedOutcome = null; // 'team_a', 'team_b', 'draw'

async function loadEvents() {
    try {
        const response = await fetchAPI('/bet/events');
        allEvents = response.data.filter(e => e.status === 'active');
        const container = document.getElementById('events-container');
        
        if (allEvents.length === 0) {
            container.innerHTML = '<p>No active betting events available right now.</p>';
            return;
        }

        container.innerHTML = allEvents.map(ev => `
            <div class="bet-card glass-panel" style="background: rgba(0,0,0,0.2);">
                <div class="bet-title">
                    <strong>${ev.category || 'Sports'}</strong><br/>
                    ${ev.title}
                </div>
                <div class="odds-container">
                    <button class="odd-btn" onclick="selectBet(${ev.id}, 'home')">1<br/>${ev.odds_home}</button>
                    <button class="odd-btn" onclick="selectBet(${ev.id}, 'draw')">X<br/>${ev.odds_draw}</button>
                    <button class="odd-btn" onclick="selectBet(${ev.id}, 'away')">2<br/>${ev.odds_away}</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load events:', error);
    }
}

function selectBet(eventId, outcome) {
    selectedEvent = allEvents.find(e => e.id === eventId);
    selectedOutcome = outcome;
    
    let oddValue = selectedEvent[`odds_${outcome}`];
    let teamName = outcome === 'home' ? 'Home' : outcome === 'away' ? 'Away' : 'Draw';

    document.getElementById('bet-slip-container').style.display = 'block';
    document.getElementById('bet-slip-details').innerHTML = `
        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
            <p style="margin-bottom: 0.5rem"><strong>${selectedEvent.title}</strong></p>
            <p style="display: flex; justify-content: space-between;">
                <span>Pick: ${teamName}</span>
                <span style="color: var(--accent-primary); font-weight: bold;">@ ${oddValue}</span>
            </p>
        </div>
    `;
    updatePotentialWin();
    
    // UI update for selections
    document.querySelectorAll('.odd-btn').forEach(b => b.classList.remove('selected'));
    // Could do exact button highlighting but kept simple here
}

function updatePotentialWin() {
    if (!selectedEvent || !selectedOutcome) return;
    const amount = Number(document.getElementById('bet-amount').value) || 0;
    const oddValue = Number(selectedEvent[`odds_${selectedOutcome}`]);
    const win = amount * oddValue;
    document.getElementById('potential-win').textContent = `₦ ${win.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

async function placeBet() {
    const amount = Number(document.getElementById('bet-amount').value);
    if (!amount || amount < 100) return showAlert('Minimum stake is ₦100', 'error');

    const btn = document.getElementById('place-bet-btn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        await fetchAPI('/bet/place', 'POST', {
            event_id: selectedEvent.id,
            amount: amount,
            prediction: selectedOutcome
        });

        showAlert('Bet placed successfully!');
        document.getElementById('bet-slip-container').style.display = 'none';
        document.getElementById('bet-amount').value = '';
        
        loadWallet(); // Update wallet balance
        loadTransactions();
        loadBets(); // Update history
    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Place Bet';
    }
}

async function loadBets() {
    try {
        const response = await fetchAPI('/bet/history');
        const tbody = document.getElementById('bets-body');
        
        if (response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No bets placed yet.</td></tr>';
            return;
        }

        tbody.innerHTML = response.data.map(bet => {
            let statusBadge = 'badge-warning';
            let statusTxt = 'Pending';
            if (bet.status === 'won') { statusBadge = 'badge-success'; statusTxt = 'Won'; }
            if (bet.status === 'lost') { statusBadge = 'badge-danger'; statusTxt = 'Lost'; }
            
            return `
            <tr>
                <td><strong>${bet.title}</strong><br/><small>Pick: ${bet.prediction}</small></td>
                <td>₦ ${parseFloat(bet.amount).toLocaleString()}</td>
                <td>${bet.odds}</td>
                <td>₦ ${parseFloat(bet.potential_win).toLocaleString()}</td>
                <td><span class="badge ${statusBadge}">${statusTxt}</span></td>
            </tr>
        `}).join('');
    } catch (error) {
        console.error('Failed to load bets:', error);
    }
}
