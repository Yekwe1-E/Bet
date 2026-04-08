const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const adminEmail = 'emmanuelwilson630@gmail.com';
const adminPass = 'Doubra18me';
const adminName = 'Admin Emma';
const adminPhone = '0700ADMIN01'; // Dummy phone

async function setupAdmin() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database.');

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPass, salt);

        // Check if exists
        const [rows] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
        
        if (rows.length > 0) {
            console.log('Admin already exists. Updating password and role...');
            await connection.query(
                'UPDATE users SET password_hash = ?, role = "admin" WHERE email = ?',
                [hashedPassword, adminEmail]
            );
            console.log('Admin updated successfully.');
        } else {
            console.log('Inserting new admin user...');
            const [result] = await connection.query(
                'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, "admin")',
                [adminName, adminEmail, adminPhone, hashedPassword]
            );
            
            const userId = result.insertId;
            // Create wallet
            await connection.query('INSERT INTO wallets (user_id, balance) VALUES (?, 0.00)', [userId]);
            console.log('Admin created successfully with wallet.');
        }

    } catch (err) {
        console.error('Failed to setup admin:', err);
    } finally {
        if (connection) await connection.end();
    }
}

setupAdmin();
