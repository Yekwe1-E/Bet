console.log('Testing each route one by one...');

try {
    console.log('Requiring authRoutes...');
    require('./routes/authRoutes');
    console.log('authRoutes loaded OK');
} catch (e) {
    console.error('FAILED to load authRoutes:', e);
}

try {
    console.log('Requiring walletRoutes...');
    require('./routes/walletRoutes');
    console.log('walletRoutes loaded OK');
} catch (e) {
    console.error('FAILED to load walletRoutes:', e);
}

try {
    console.log('Requiring betRoutes...');
    require('./routes/betRoutes');
    console.log('betRoutes loaded OK');
} catch (e) {
    console.error('FAILED to load betRoutes:', e);
}

try {
    console.log('Requiring adminRoutes...');
    require('./routes/adminRoutes');
    console.log('adminRoutes loaded OK');
} catch (e) {
    console.error('FAILED to load adminRoutes:', e);
}
