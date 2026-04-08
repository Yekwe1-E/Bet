const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDB() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0
        });

        console.log('Attempting to connect to database...');
        const [rows] = await pool.query('SHOW TABLES');
        console.log('Tables in database:', rows.map(r => Object.values(r)[0]));
        
        const [userCols] = await pool.query('DESCRIBE users');
        console.log('Columns in users table:', userCols.map(c => c.Field));

        const [walletCols] = await pool.query('DESCRIBE wallets');
        console.log('Columns in wallets table:', walletCols.map(c => c.Field));

        await pool.end();
    } catch (err) {
        console.error('Database test failed:', err);
    }
}

testDB();
