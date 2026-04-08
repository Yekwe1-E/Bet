const db = require('../config/db');

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
const getBalance = async (req, res) => {
    try {
        const [wallets] = await db.query('SELECT balance FROM wallets WHERE user_id = ?', [req.user.id]);
        if (wallets.length === 0) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        res.json({ success: true, data: { balance: wallets[0].balance } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error retrieving balance' });
    }
};

// @desc    Mock Deposit
// @route   POST /api/wallet/deposit
// @access  Private
const depositMock = async (req, res) => {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update wallet balance
        await connection.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, req.user.id]);

        // 2. Generate Reference
        const reference = 'DEP_' + Date.now();

        // 3. Log in transactions
        await connection.query(
            'INSERT INTO transactions (user_id, type, amount, status, reference) VALUES (?, "deposit", ?, "completed", ?)',
            [req.user.id, amount, reference]
        );

        // 4. Log in deposit_records
        await connection.query(
            'INSERT INTO deposit_records (user_id, amount, reference, gateway, status) VALUES (?, ?, ?, "mock_paystack", "success")',
            [req.user.id, amount, reference]
        );

        await connection.commit();
        
        // Get new balance
        const [wallets] = await connection.query('SELECT balance FROM wallets WHERE user_id = ?', [req.user.id]);
        
        res.json({ success: true, message: 'Deposit successful', data: { balance: wallets[0].balance } });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during deposit processing' });
    } finally {
        connection.release();
    }
};

// @desc    Request Withdrawal
// @route   POST /api/wallet/withdraw
// @access  Private
const requestWithdrawal = async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check balance with lock
        const [wallets] = await connection.query('SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [req.user.id]);
        if (wallets[0].balance < amount) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Insufficient funds' });
        }

        // Deduct from wallet immediately to prevent double spending
        await connection.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [amount, req.user.id]);

        // Create transaction history record
        const reference = 'W_REQ_' + Date.now();
        await connection.query(
            'INSERT INTO transactions (user_id, type, amount, status, reference) VALUES (?, "withdrawal", ?, "pending", ?)',
            [req.user.id, amount, reference]
        );

        // Create withdrawal request for admin to approve
        await connection.query(
            'INSERT INTO withdrawal_requests (user_id, amount, status) VALUES (?, ?, "pending")',
            [req.user.id, amount]
        );

        await connection.commit();
        res.json({ success: true, message: 'Withdrawal requested successfully' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during withdrawal request' });
    } finally {
        connection.release();
    }
};

// @desc    Get Transaction History
// @route   GET /api/wallet/transactions
// @access  Private
const getTransactions = async (req, res) => {
    try {
        const [transactions] = await db.query(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC', 
            [req.user.id]
        );
        res.json({ success: true, data: transactions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error retrieving transactions' });
    }
};

module.exports = { getBalance, depositMock, requestWithdrawal, getTransactions };
