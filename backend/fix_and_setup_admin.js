const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const adminEmail = 'emmanuelwilson630@gmail.com';
const adminPass = 'Doubra18me';
const adminName = 'Admin Emma';
const adminPhone = '0700ADMIN01';

async function fixAndSetup() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database.');

        // 1. Fix users table schema
        console.log('Checking users table columns...');
        const [cols] = await connection.query('DESCRIBE users');
        const colNames = cols.map(c => c.Field);

        if (colNames.includes('password') && !colNames.includes('password_hash')) {
            console.log('Renaming password to password_hash...');
            await connection.query('ALTER TABLE users CHANGE password password_hash VARCHAR(255) NOT NULL');
        }

        if (!colNames.includes('phone')) {
            console.log('Adding phone column...');
            await connection.query('ALTER TABLE users ADD COLUMN phone VARCHAR(20) UNIQUE AFTER email');
        }

        if (!colNames.includes('is_blocked')) {
            console.log('Adding is_blocked column...');
            await connection.query('ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE AFTER role');
        }

        console.log('Users table schema updated.');

        // 2. Setup Admin User
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPass, salt);

        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
        
        if (existing.length > 0) {
            console.log('Updating existing user to admin...');
            await connection.query(
                'UPDATE users SET password_hash = ?, role = "admin", name = ?, phone = ? WHERE email = ?',
                [hashedPassword, adminName, adminPhone, adminEmail]
            );
        } else {
            console.log('Creating new admin user...');
            const [result] = await connection.query(
                'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, "admin")',
                [adminName, adminEmail, adminPhone, hashedPassword]
            );
            
            const userId = result.insertId;
            // Ensure wallet exists
            const [wallets] = await connection.query('SELECT id FROM wallets WHERE user_id = ?', [userId]);
            if (wallets.length === 0) {
                await connection.query('INSERT INTO wallets (user_id, balance) VALUES (?, 0.00)', [userId]);
            }
        }

        console.log('Admin user setup successfully.');

    } catch (err) {
        console.error('Operation failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

fixAndSetup();
