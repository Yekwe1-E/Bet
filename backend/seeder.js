const db = require('./config/db');

const events = [
    { title: 'Arsenal vs Chelsea', category: 'Premier League', odds_home: 1.85, odds_draw: 3.40, odds_away: 4.20, start_time: '2026-04-12 15:00:00' },
    { title: 'Real Madrid vs Barcelona', category: 'La Liga', odds_home: 2.10, odds_draw: 3.60, odds_away: 3.20, start_time: '2026-04-12 20:00:00' },
    { title: 'Liverpool vs Man City', category: 'Premier League', odds_home: 2.50, odds_draw: 3.50, odds_away: 2.60, start_time: '2026-04-13 19:45:00' },
    { title: 'Bayern Munich vs Dortmund', category: 'Bundesliga', odds_home: 1.45, odds_draw: 4.80, odds_away: 6.50, start_time: '2026-04-14 17:30:00' },
    { title: 'Inter Milan vs AC Milan', category: 'Serie A', odds_home: 2.05, odds_draw: 3.20, odds_away: 3.80, start_time: '2026-04-14 19:45:00' },
    { title: 'PSG vs Marseille', category: 'Ligue 1', odds_home: 1.30, odds_draw: 5.50, odds_away: 9.00, start_time: '2026-04-15 20:00:00' },
];

async function seed() {
    console.log('Starting Seeder...');
    try {
        for (const event of events) {
            // Check if event already exists
            const [existing] = await db.query('SELECT id FROM betting_events WHERE title = ? AND start_time = ?', [event.title, event.start_time]);
            if (existing.length === 0) {
                await db.query(
                    'INSERT INTO betting_events (title, category, odds_home, odds_draw, odds_away, start_time) VALUES (?, ?, ?, ?, ?, ?)',
                    [event.title, event.category, event.odds_home, event.odds_draw, event.odds_away, event.start_time]
                );
                console.log(`Seeded: ${event.title}`);
            } else {
                console.log(`Skipped (already exists): ${event.title}`);
            }
        }
        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        process.exit();
    }
}

seed();
