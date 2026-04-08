const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTables() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database:', process.env.DB_NAME);

        // Compatible with MySQL 5.5
        const queries = [
            `CREATE TABLE IF NOT EXISTS wallets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                balance DECIMAL(15, 2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type ENUM('deposit', 'withdrawal', 'bet_placed', 'bet_won') NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
                reference VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS betting_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                odds_home DECIMAL(5, 2) NOT NULL,
                odds_away DECIMAL(5, 2) NOT NULL,
                odds_draw DECIMAL(5, 2) NOT NULL,
                status ENUM('active', 'closed', 'settled') DEFAULT 'active',
                result ENUM('home', 'away', 'draw') NULL,
                start_time DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS bets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                event_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                prediction ENUM('home', 'away', 'draw') NOT NULL,
                odds DECIMAL(5, 2) NOT NULL,
                potential_win DECIMAL(15, 2) NOT NULL,
                status ENUM('pending', 'won', 'lost') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (event_id) REFERENCES betting_events(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                processed_by INT NULL,
                created_at DATETIME NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS deposit_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                reference VARCHAR(255) NOT NULL UNIQUE,
                gateway VARCHAR(50) DEFAULT 'mock_paystack',
                status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`
        ];

        for (const query of queries) {
            console.log('Executing query...');
            await connection.query(query);
            console.log('Query successful.');
        }

        console.log('All tables created successfully.');

    } catch (err) {
        console.error('Failed to create tables:', err);
    } finally {
        if (connection) await connection.end();
    }
}

fixTables();
