const express = require('express');
const router = express.Router();
const { getUsers, createEvent, settleEvent, handleWithdrawal, getAdminMetrics, getWithdrawals } = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');

// All admin routes are protected by auth and admin role
router.get('/users', protect, admin, getUsers);
router.post('/events', protect, admin, createEvent);
router.post('/events/:id/settle', protect, admin, settleEvent);
router.get('/withdrawals', protect, admin, getWithdrawals);
router.post('/withdrawals/:id', protect, admin, handleWithdrawal);
router.get('/metrics', protect, admin, getAdminMetrics);

module.exports = router;