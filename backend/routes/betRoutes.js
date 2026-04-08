const express = require('express');
const router = express.Router();
const { getEvents, placeBet, getBetHistory } = require('../controllers/betController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/events', protect, getEvents); // You can make this public if needed by removing protect
router.post('/place', protect, placeBet);
router.get('/history', protect, getBetHistory);

module.exports = router;
