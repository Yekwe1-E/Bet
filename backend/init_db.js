const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true
        });

        console.log('Connected to database.');

        const schemaSql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
        
        // Remove CREATE DATABASE and USE statements as we are already connected to the database
        const filteredSql = schemaSql
            .split(';')
            .filter(stmt => !stmt.trim().toUpperCase().startsWith('CREATE DATABASE') && !stmt.trim().toUpperCase().startsWith('USE'))
            .join(';');

        console.log('Applying schema...');
        await connection.query(filteredSql);
        console.log('Schema applied successfully.');

    } catch (err) {
        console.error('Database initialization failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

initDB();
