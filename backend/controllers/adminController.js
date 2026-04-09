const db = require('../config/db');

// @desc    Get all users for admin
// @route   GET /api/admin/users
const getUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, email, role, is_blocked, created_at FROM users');
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create a betting event
// @route   POST /api/admin/events
const createEvent = async (req, res) => {
    const { title, category, odds_home, odds_away, odds_draw, start_time } = req.body;

    try {
        await db.query(
            'INSERT INTO betting_events (title, category, odds_home, odds_away, odds_draw, start_time) VALUES (?, ?, ?, ?, ?, ?)',
            [title, category, odds_home, odds_away, odds_draw, start_time]
        );
        res.json({ success: true, message: 'Event created' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Settle an event and distribute winnings
// @route   POST /api/admin/events/:id/settle
const settleEvent = async (req, res) => {
    const { result } = req.body; // 'home', 'away', or 'draw'
    const eventId = req.params.id;

    if (!['home', 'away', 'draw'].includes(result)) {
        return res.status(400).json({ success: false, message: 'Invalid result' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check if event can be settled
        const [events] = await connection.query('SELECT * FROM betting_events WHERE id = ? AND status = "active"', [eventId]);
        if (events.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Event not active or already settled' });
        }

        // 2. Update Event Status
        await connection.query('UPDATE betting_events SET status = "settled", result = ? WHERE id = ?', [result, eventId]);

        // 3. Mark all bets as won/lost
        await connection.query(
            'UPDATE bets SET status = CASE WHEN prediction = ? THEN "won" ELSE "lost" END WHERE event_id = ? AND status = "pending"',
            [result, eventId]
        );

        // 4. Distribute winnings to users who won
        const [winningBets] = await connection.query('SELECT * FROM bets WHERE event_id = ? AND status = "won"', [eventId]);

        for (const bet of winningBets) {
            // Add winnings to wallet
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [bet.potential_win, bet.user_id]);

            // Insert transaction record
            const reference = 'WIN_' + Date.now() + '_' + bet.id;
            await connection.query(
                'INSERT INTO transactions (user_id, type, amount, status, reference) VALUES (?, "bet_won", ?, "completed", ?)',
                [bet.user_id, bet.potential_win, reference]
            );
        }

        await connection.commit();
        res.json({ success: true, message: `Event settled as ${result}. Winnings distributed.` });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during settlement' });
    } finally {
        connection.release();
    }
};

// @desc    Approve/Reject withdrawal
// @route   POST /api/admin/withdrawals/:id
const handleWithdrawal = async (req, res) => {
    const { status } = req.body; // 'approved' or 'rejected'
    const reqId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status. Must be approved or rejected.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [requests] = await connection.query('SELECT * FROM withdrawal_requests WHERE id = ? AND status = "pending" FOR UPDATE', [reqId]);
        
        if (requests.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Withdrawal request not found or already processed' });
        }

        const request = requests[0];

        // Update request status
        await connection.query('UPDATE withdrawal_requests SET status = ?, processed_by = ? WHERE id = ?', [status, req.user.id, reqId]);

        if (status === 'rejected') {
            // Refund wallet
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [request.amount, request.user_id]);
            
            // Mark transaction as failed
            await connection.query('UPDATE transactions SET status = "failed" WHERE type = "withdrawal" AND user_id = ? AND status = "pending" ORDER BY created_at DESC LIMIT 1', [request.user_id]);
        } else {
             // Mark transaction as completed (assuming actual payment was sent manually)
             await connection.query('UPDATE transactions SET status = "completed" WHERE type = "withdrawal" AND user_id = ? AND status = "pending" ORDER BY created_at DESC LIMIT 1', [request.user_id]);
        }

        await connection.commit();
        res.json({ success: true, message: `Withdrawal request ${status}` });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error managing withdrawal' });
    } finally {
        connection.release();
    }
};


// @desc    Get all pending withdrawal requests
// @route   GET /api/admin/withdrawals
const getWithdrawals = async (req, res) => {
    try {
        const [requests] = await db.query(`
            SELECT wr.*, u.name as user_name, u.email as user_email 
            FROM withdrawal_requests wr 
            JOIN users u ON wr.user_id = u.id 
            WHERE wr.status = 'pending' 
            ORDER BY wr.created_at DESC
        `);
        res.json({ success: true, data: requests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error retrieving withdrawals' });
    }
};

// @desc    Get dashboard metrics
// @route   GET /api/admin/metrics
const getAdminMetrics = async (req, res) => {
    try {
        const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM users WHERE role = "user"');
        const [[{ total_deposits }]] = await db.query('SELECT COALESCE(SUM(amount), 0) as total_deposits FROM deposit_records WHERE status = "success"');
        const [[{ total_withdraws }]] = await db.query('SELECT COALESCE(SUM(amount), 0) as total_withdraws FROM withdrawal_requests WHERE status = "approved"');
        const [[{ active_bets }]] = await db.query('SELECT COUNT(*) as active_bets FROM bets WHERE status = "pending"');

        res.json({
            success: true,
            data: {
                total_users,
                total_deposits,
                total_withdraws,
                active_bets
            }
        });
    } catch (error) {
         res.status(500).json({ success: false, message: 'Server error getting metrics' });
    }
}

module.exports = { getUsers, createEvent, settleEvent, handleWithdrawal, getAdminMetrics, getWithdrawals };
