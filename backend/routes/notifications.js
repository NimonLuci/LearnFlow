const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [notifications] = await db.execute(
            `SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [req.user.userId]
        );
        
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
    try {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [req.params.notificationId, req.user.userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Notification update error:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [req.user.userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Notifications update error:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [req.user.userId]
        );
        
        res.json({ success: true, count: result[0].count });
    } catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

module.exports = router;
