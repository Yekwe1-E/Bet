const db = require('../config/db');

// @desc    Get all active betting events
// @route   GET /api/bet/events
// @access  Public (or Private if you prefer only logged-in users see odds)
const getEvents = async (req, res) => {
    try {
        const [events] = await db.query('SELECT * FROM betting_events WHERE status = "active" ORDER BY start_time ASC');
        res.json({ success: true, data: events });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error retrieving events' });
    }
};

// @desc    Place a bet
// @route   POST /api/bet/place
// @access  Private
const placeBet = async (req, res) => {
    const { event_id, amount, prediction } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid bet amount' });
    }

    if (!['home', 'away', 'draw'].includes(prediction)) {
        return res.status(400).json({ success: false, message: 'Invalid prediction type' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check if event is active
        const [events] = await connection.query('SELECT * FROM betting_events WHERE id = ? AND status = "active"', [event_id]);
        if (events.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Event is not active or does not exist' });
        }

        const event = events[0];

        // 2. Determine odds based on prediction
        let odds = 0;
        if (prediction === 'home') odds = event.odds_home;
        else if (prediction === 'away') odds = event.odds_away;
        else if (prediction === 'draw') odds = event.odds_draw;

        const potentialWin = parseFloat((amount * odds).toFixed(2));

        // 3. Check wallet balance with lock
        const [wallets] = await connection.query('SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [req.user.id]);
        if (wallets.length === 0 || wallets[0].balance < amount) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Insufficient funds' });
        }

        // 4. Deduct amount from wallet
        await connection.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [amount, req.user.id]);

        // 5. Insert bet into bets table
        await connection.query(
            'INSERT INTO bets (user_id, event_id, amount, prediction, odds, potential_win) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, event_id, amount, prediction, odds, potentialWin]
        );

        // 6. Log in transactions
        const reference = 'BET_' + Date.now();
        await connection.query(
            'INSERT INTO transactions (user_id, type, amount, status, reference) VALUES (?, "bet_placed", ?, "completed", ?)',
            [req.user.id, amount, reference]
        );

        await connection.commit();
        res.json({ success: true, message: 'Bet placed successfully', data: { potential_win: potentialWin } });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error placing bet' });
    } finally {
        connection.release();
    }
};

// @desc    Get user bet history
// @route   GET /api/bet/history
// @access  Private
const getBetHistory = async (req, res) => {
    try {
        const query = `
            SELECT b.*, e.title, e.result as event_result, e.status as event_status
            FROM bets b
            JOIN betting_events e ON b.event_id = e.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `;
        const [bets] = await db.query(query, [req.user.id]);
        res.json({ success: true, data: bets });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error retrieving bet history' });
    }
};

module.exports = { getEvents, placeBet, getBetHistory };
