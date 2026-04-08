const express = require('express');
const router = express.Router();
const { getBalance, depositMock, requestWithdrawal, getTransactions } = require('../controllers/walletController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/balance', protect, getBalance);
router.post('/deposit', protect, depositMock);
router.post('/withdraw', protect, requestWithdrawal);
router.get('/transactions', protect, getTransactions);

module.exports = router;
