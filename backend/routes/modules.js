const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all modules for a course
router.get('/course/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const [modules] = await db.execute(
            `SELECT m.*, 
                    (SELECT COUNT(*) FROM user_progress 
                     WHERE module_id = m.id AND user_id = ? AND is_completed = TRUE) as is_user_completed
             FROM modules m
             WHERE m.course_id = ?
             ORDER BY m.order_index ASC`,
            [req.user?.userId || 0, courseId]
        );
        
        res.json({ success: true, modules });
    } catch (error) {
        console.error('Modules fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
});

// Create new module (Instructor only)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { course_id, title, description, order_index, content_type, video_url, video_duration_minutes, article_content, is_preview } = req.body;
        
        // Verify user is instructor of this course
        const [courses] = await db.execute(
            'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
            [course_id, req.user.userId]
        );
        
        if (courses.length === 0) {
            return res.status(403).json({ error: 'You are not authorized to add modules to this course' });
        }
        
        // Generate slug
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const [result] = await db.execute(
            `INSERT INTO modules (course_id, title, slug, description, order_index, content_type, video_url, video_duration_minutes, article_content, is_preview)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [course_id, title, slug, description, order_index, content_type, video_url, video_duration_minutes, article_content, is_preview || false]
        );
        
        // Update course total_lectures and duration
        await db.execute(
            `UPDATE courses 
             SET total_lectures = (SELECT COUNT(*) FROM modules WHERE course_id = ?),
                 total_duration_minutes = (SELECT SUM(video_duration_minutes) FROM modules WHERE course_id = ?)
             WHERE id = ?`,
            [course_id, course_id, course_id]
        );
        
        res.status(201).json({
            success: true,
            moduleId: result.insertId,
            message: 'Module created successfully'
        });
    } catch (error) {
        console.error('Module creation error:', error);
        res.status(500).json({ error: 'Failed to create module' });
    }
});

// Update module
router.put('/:moduleId', authenticateToken, async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { title, description, order_index, content_type, video_url, video_duration_minutes, article_content, is_preview, is_published } = req.body;
        
        // Verify ownership
        const [modules] = await db.execute(
            `SELECT m.*, c.instructor_id 
             FROM modules m
             JOIN courses c ON m.course_id = c.id
             WHERE m.id = ?`,
            [moduleId]
        );
        
        if (modules.length === 0 || modules[0].instructor_id !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        await db.execute(
            `UPDATE modules 
             SET title = ?, description = ?, order_index = ?, content_type = ?, 
                 video_url = ?, video_duration_minutes = ?, article_content = ?, 
                 is_preview = ?, is_published = ?
             WHERE id = ?`,
            [title, description, order_index, content_type, video_url, video_duration_minutes, article_content, is_preview, is_published, moduleId]
        );
        
        // Update course totals
        await db.execute(
            `UPDATE courses 
             SET total_lectures = (SELECT COUNT(*) FROM modules WHERE course_id = ?),
                 total_duration_minutes = (SELECT SUM(video_duration_minutes) FROM modules WHERE course_id = ?)
             WHERE id = ?`,
            [modules[0].course_id, modules[0].course_id, modules[0].course_id]
        );
        
        res.json({ success: true, message: 'Module updated successfully' });
    } catch (error) {
        console.error('Module update error:', error);
        res.status(500).json({ error: 'Failed to update module' });
    }
});

// Delete module
router.delete('/:moduleId', authenticateToken, async (req, res) => {
    try {
        const { moduleId } = req.params;
        
        // Verify ownership
        const [modules] = await db.execute(
            `SELECT m.*, c.instructor_id 
             FROM modules m
             JOIN courses c ON m.course_id = c.id
             WHERE m.id = ?`,
            [moduleId]
        );
        
        if (modules.length === 0 || modules[0].instructor_id !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const courseId = modules[0].course_id;
        
        await db.execute('DELETE FROM modules WHERE id = ?', [moduleId]);
        
        // Update course totals
        await db.execute(
            `UPDATE courses 
             SET total_lectures = (SELECT COUNT(*) FROM modules WHERE course_id = ?),
                 total_duration_minutes = (SELECT SUM(video_duration_minutes) FROM modules WHERE course_id = ?)
             WHERE id = ?`,
            [courseId, courseId, courseId]
        );
        
        res.json({ success: true, message: 'Module deleted successfully' });
    } catch (error) {
        console.error('Module deletion error:', error);
        res.status(500).json({ error: 'Failed to delete module' });
    }
});

// Track video progress
router.post('/:moduleId/progress', authenticateToken, async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { time_spent_minutes, last_position_seconds, video_watch_percentage, is_completed } = req.body;
        
        // Get course_id
        const [modules] = await db.execute('SELECT course_id FROM modules WHERE id = ?', [moduleId]);
        if (modules.length === 0) {
            return res.status(404).json({ error: 'Module not found' });
        }
        
        const courseId = modules[0].course_id;
        
        // Upsert progress
        await db.execute(
            `INSERT INTO user_progress (user_id, module_id, course_id, time_spent_minutes, last_position_seconds, video_watch_percentage, is_completed, completed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                time_spent_minutes = time_spent_minutes + VALUES(time_spent_minutes),
                last_position_seconds = VALUES(last_position_seconds),
                video_watch_percentage = VALUES(video_watch_percentage),
                is_completed = VALUES(is_completed),
                completed_at = IF(VALUES(is_completed) = TRUE AND completed_at IS NULL, NOW(), completed_at)`,
            [req.user.userId, moduleId, courseId, time_spent_minutes, last_position_seconds, video_watch_percentage, is_completed, is_completed ? new Date() : null]
        );
        
        // Update enrollment progress
        const [progress] = await db.execute(
            `SELECT 
                (COUNT(CASE WHEN is_completed = TRUE THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage
             FROM user_progress
             WHERE user_id = ? AND course_id = ?`,
            [req.user.userId, courseId]
        );
        
        await db.execute(
            `UPDATE enrollments 
             SET progress_percentage = ?, last_accessed_at = NOW()
             WHERE student_id = ? AND course_id = ?`,
            [progress[0].progress_percentage || 0, req.user.userId, courseId]
        );
        
        res.json({ success: true, progress: progress[0].progress_percentage });
    } catch (error) {
        console.error('Progress tracking error:', error);
        res.status(500).json({ error: 'Failed to track progress' });
    }
});

module.exports = router;
