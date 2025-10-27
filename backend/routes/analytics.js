const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get user learning analytics
router.get('/my-progress', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Total courses enrolled
        const [enrollmentStats] = await db.execute(
            `SELECT 
                COUNT(*) as total_enrolled,
                COUNT(CASE WHEN progress_percentage = 100 THEN 1 END) as completed_courses,
                AVG(progress_percentage) as avg_progress
             FROM enrollments
             WHERE student_id = ?`,
            [userId]
        );
        
        // Total learning time
        const [timeStats] = await db.execute(
            `SELECT SUM(time_spent_minutes) as total_minutes
             FROM user_progress
             WHERE user_id = ?`,
            [userId]
        );
        
        // Progress by category
        const [categoryProgress] = await db.execute(
            `SELECT c.category, 
                    COUNT(DISTINCT e.course_id) as courses_enrolled,
                    AVG(e.progress_percentage) as avg_progress
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.student_id = ?
             GROUP BY c.category`,
            [userId]
        );
        
        // Recent activity
        const [recentActivity] = await db.execute(
            `SELECT c.title, c.category, e.progress_percentage, e.last_accessed_at
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.student_id = ?
             ORDER BY e.last_accessed_at DESC
             LIMIT 5`,
            [userId]
        );
        
        res.json({
            success: true,
            stats: {
                total_enrolled: enrollmentStats[0].total_enrolled || 0,
                completed_courses: enrollmentStats[0].completed_courses || 0,
                avg_progress: enrollmentStats[0].avg_progress || 0,
                total_learning_hours: Math.round((timeStats[0].total_minutes || 0) / 60)
            },
            category_progress: categoryProgress,
            recent_activity: recentActivity
        });
    } catch (error) {
        console.error('Analytics fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get weekly progress chart data
router.get('/weekly-progress', authenticateToken, async (req, res) => {
    try {
        const [weeklyData] = await db.execute(
            `SELECT DATE(updated_at) as date, SUM(time_spent_minutes) as minutes
             FROM user_progress
             WHERE user_id = ? AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(updated_at)
             ORDER BY date ASC`,
            [req.user.userId]
        );
        
        res.json({ success: true, data: weeklyData });
    } catch (error) {
        console.error('Weekly progress fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch weekly progress' });
    }
});

module.exports = router;
