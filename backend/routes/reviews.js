const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get reviews for a course
router.get('/course/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const [reviews] = await db.execute(
            `SELECT r.*, u.first_name, u.last_name, u.avatar_url
             FROM course_reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.course_id = ? AND r.is_approved = TRUE
             ORDER BY r.created_at DESC`,
            [courseId]
        );
        
        res.json({ success: true, reviews });
    } catch (error) {
        console.error('Reviews fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Submit a review
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { course_id, rating, title, comment } = req.body;
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        
        // Check if user is enrolled
        const [enrollments] = await db.execute(
            'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
            [req.user.userId, course_id]
        );
        
        if (enrollments.length === 0) {
            return res.status(403).json({ error: 'You must be enrolled to review this course' });
        }
        
        // Insert or update review
        await db.execute(
            `INSERT INTO course_reviews (course_id, user_id, rating, title, comment)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE rating = VALUES(rating), title = VALUES(title), comment = VALUES(comment)`,
            [course_id, req.user.userId, rating, title, comment]
        );
        
        // Update course rating
        const [avgRating] = await db.execute(
            `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
             FROM course_reviews
             WHERE course_id = ? AND is_approved = TRUE`,
            [course_id]
        );
        
        await db.execute(
            'UPDATE courses SET rating = ?, total_reviews = ? WHERE id = ?',
            [avgRating[0].avg_rating || 0, avgRating[0].total_reviews || 0, course_id]
        );
        
        res.json({ success: true, message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

module.exports = router;
