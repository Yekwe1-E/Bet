const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, phone, password } = req.body;

    try {
        // Check if user exists
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ? OR phone = ?', [email, phone]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists with that email or phone' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const [result] = await db.query(
            'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
            [name, email, phone, hashedPassword]
        );

        const userId = result.insertId;

        // Create wallet for user
        await db.query('INSERT INTO wallets (user_id, balance) VALUES (?, 0.00)', [userId]);

        // Generate token
        const token = generateToken(userId, 'user');

        res.status(201).json({
            success: true,
            data: { id: userId, name, email, role: 'user', token }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.is_blocked) {
            return res.status(403).json({ success: false, message: 'Your account has been blocked.' });
        }

        const token = generateToken(user.id, user.role);

        res.json({
            success: true,
            data: { id: user.id, name: user.name, email: user.email, role: user.role, token }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: users[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error retrieving profile' });
    }
};

module.exports = { registerUser, loginUser, getUserProfile };
