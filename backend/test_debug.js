console.log('Test start');
try {
    const db = require('./config/db');
    console.log('db.js loaded');
} catch (e) {
    console.error('Error loading db.js:', e);
}

try {
    require('./routes/authRoutes');
    console.log('authRoutes loaded');
    require('./routes/walletRoutes');
    console.log('walletRoutes loaded');
    require('./routes/betRoutes');
    console.log('betRoutes loaded');
    require('./routes/adminRoutes');
    console.log('adminRoutes loaded');
} catch (e) {
    console.error('Error loading routes:', e);
}
