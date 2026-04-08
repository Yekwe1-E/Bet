const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkVersion() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await connection.query('SELECT VERSION() as version');
        console.log('MySQL Version:', rows[0].version);

    } catch (err) {
        console.error('Failed to check version:', err);
    } finally {
        if (connection) await connection.end();
    }
}

checkVersion();
