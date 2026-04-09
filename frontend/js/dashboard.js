// dashboard.js - Handles User Dashboard logic for the premium UI

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    if (getUserRole() === 'admin') {
        window.location.href = 'admin.html';
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
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    
    // Select the correct link even if it was clicked via icon
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(link => {
        if (link.getAttribute('onclick').includes(tabName)) {
            link.classList.add('active');
        }
    });

    if (tabName === 'history') loadBets();
    if (tabName === 'wallet') loadTransactions();
}

function showAlert(message, type = 'success') {
    const container = document.getElementById('alert-container');
    const badgeClass = type === 'success' ? 'badge-success' : 'badge-danger';
    container.innerHTML = `<div class="badge ${badgeClass}" style="width: 100%; text-align: center; padding: 1rem; margin-bottom: 1.5rem; font-size: 1rem; display: block;">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// ==========================================
// WALLET LOGIC
// ==========================================
async function loadWallet() {
    try {
        const response = await fetchAPI('/wallet/balance');
        const balance = parseFloat(response.data.balance).toLocaleString(undefined, {minimumFractionDigits: 2});
        
        const dbBalance = document.getElementById('dashboard-balance');
        const fullBalance = document.getElementById('wallet-balance-full');
        
        if (dbBalance) dbBalance.textContent = `₦ ${balance}`;
        if (fullBalance) fullBalance.textContent = `₦ ${balance}`;
    } catch (error) {
        console.error('Failed to load wallet:', error);
    }
}

async function loadTransactions() {
    try {
        const response = await fetchAPI('/wallet/transactions');
        const tbody = document.getElementById('transactions-body');
        
        if (response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No transactions found.</td></tr>';
            return;
        }

        tbody.innerHTML = response.data.map(tx => `
            <tr>
                <td style="color: var(--text-muted)">${new Date(tx.created_at).toLocaleDateString()}</td>
                <td><span style="font-weight: 600; color: ${tx.type.includes('bet') ? 'var(--secondary)' : 'var(--primary)'}">${tx.type.replace('_', ' ').toUpperCase()}</span></td>
                <td style="font-family: monospace; font-size: 0.8rem; color: var(--text-dim)">${tx.reference || 'N/A'}</td>
                <td style="font-weight: 700;">₦ ${parseFloat(tx.amount).toLocaleString()}</td>
                <td><span class="badge ${tx.status === 'completed' ? 'badge-won' : 'badge-pending'}">${tx.status.toUpperCase()}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load transactions:', error);
    }
}

// Modals
function openDepositModal() {
    document.getElementById('deposit-modal').style.display = 'flex';
}

function closeModals() {
    document.getElementById('deposit-modal').style.display = 'none';
}

async function submitDeposit() {
    const amount = document.getElementById('deposit-amount').value;
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    
    try {
        await fetchAPI('/wallet/deposit', 'POST', { amount });
        showAlert('Deposit successful! Your balance has been updated.');
        closeModals();
        loadWallet();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function openWithdrawModal() {
    const amount = prompt("Enter amount to withdraw (₦):");
    if (amount && Number(amount) > 0) {
        submitWithdrawal(amount);
    }
}

async function submitWithdrawal(amount) {
    try {
        await fetchAPI('/wallet/withdraw', 'POST', { amount });
        showAlert('Withdrawal request sent! Our team will process it shortly.', 'success');
        loadWallet();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ==========================================
// BETTING LOGIC
// ==========================================
let allEvents = [];
let selectedEvent = null;
let selectedOutcome = null;

async function loadEvents() {
    try {
        const response = await fetchAPI('/bet/events');
        allEvents = response.data.filter(e => e.status === 'active');
        const container = document.getElementById('events-container');
        
        if (allEvents.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;"><p style="color: var(--text-muted);">No active betting markets right now. Check back soon!</p></div>';
            return;
        }

        container.innerHTML = allEvents.map(ev => `
            <div class="bet-card animate-fade">
                <div class="event-category">${ev.category || 'Sports'}</div>
                <div class="event-title">${ev.title}</div>
                <div class="odds-row">
                    <button class="odds-btn" onclick="selectBet(${ev.id}, 'home', this)"><span>Home</span>${ev.odds_home}</button>
                    <button class="odds-btn" onclick="selectBet(${ev.id}, 'draw', this)"><span>Draw</span>${ev.odds_draw}</button>
                    <button class="odds-btn" onclick="selectBet(${ev.id}, 'away', this)"><span>Away</span>${ev.odds_away}</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load events:', error);
    }
}

function selectBet(eventId, outcome, btnElement) {
    selectedEvent = allEvents.find(e => e.id === eventId);
    selectedOutcome = outcome;
    
    // UI: Highlight selected button
    document.querySelectorAll('.odds-btn').forEach(b => b.classList.remove('selected'));
    btnElement.classList.add('selected');

    let oddValue = selectedEvent[`odds_${outcome}`];
    let teamName = outcome === 'home' ? 'Home Win' : outcome === 'away' ? 'Away Win' : 'Draw';

    document.getElementById('bet-slip-container').style.display = 'block';
    document.getElementById('bet-slip-details').innerHTML = `
        <div style="background: rgba(0,0,0,0.3); padding: 1.25rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
            <p style="font-weight: 700; margin-bottom: 0.5rem; font-size: 1.1rem;">${selectedEvent.title}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-muted);">${teamName}</span>
                <span style="color: var(--primary); font-weight: 800; font-size: 1.1rem;">@ ${oddValue}</span>
            </div>
        </div>
    `;
    updatePotentialWin();
}

function closeBetSlip() {
    document.getElementById('bet-slip-container').style.display = 'none';
    document.querySelectorAll('.odds-btn').forEach(b => b.classList.remove('selected'));
    selectedEvent = null;
    selectedOutcome = null;
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
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'PLACING BET...';

    try {
        await fetchAPI('/bet/place', 'POST', {
            event_id: selectedEvent.id,
            amount: amount,
            prediction: selectedOutcome
        });

        showAlert('Bet placed successfully! Good luck.');
        closeBetSlip();
        document.getElementById('bet-amount').value = '';
        
        loadWallet(); 
        loadBets(); 
    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function loadBets() {
    try {
        const response = await fetchAPI('/bet/history');
        const tbody = document.getElementById('bets-body');
        
        if (response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No bets placed yet.</td></tr>';
            return;
        }

        tbody.innerHTML = response.data.map(bet => {
            let statusBadge = 'badge-pending';
            if (bet.status === 'won') statusBadge = 'badge-won';
            if (bet.status === 'lost') statusBadge = 'badge-lost';
            
            return `
            <tr>
                <td>
                    <div style="font-weight: 700;">${bet.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Pick: ${bet.prediction.toUpperCase()}</div>
                </td>
                <td style="font-weight: 600;">₦ ${parseFloat(bet.amount).toLocaleString()}</td>
                <td style="color: var(--secondary); font-weight: 700;">${bet.odds}</td>
                <td style="font-weight: 800; color: var(--primary);">₦ ${parseFloat(bet.potential_win).toLocaleString()}</td>
                <td><span class="badge ${statusBadge}">${bet.status.toUpperCase()}</span></td>
            </tr>
        `}).join('');
    } catch (error) {
        console.error('Failed to load bets:', error);
    }
}
