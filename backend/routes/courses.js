const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all published courses
router.get('/', async (req, res) => {
    try {
        const [courses] = await db.execute(
            `SELECT c.*, 
                    u.first_name as instructor_first_name, 
                    u.last_name as instructor_last_name,
                    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_students
             FROM courses c
             JOIN users u ON c.instructor_id = u.id
             WHERE c.is_published = TRUE
             ORDER BY c.created_at DESC`
        );
        
        res.json({ success: true, courses });
    } catch (error) {
        console.error('Courses fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Get instructor's courses
router.get('/my-courses', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching courses for instructor:', req.user.userId);
        
        const [courses] = await db.execute(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_students
             FROM courses c
             WHERE c.instructor_id = ?
             ORDER BY c.created_at DESC`,
            [req.user.userId]
        );
        
        console.log(`Found ${courses.length} courses for instructor ${req.user.userId}`);
        res.json({ success: true, courses });
    } catch (error) {
        console.error('My courses fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch your courses' });
    }
});

// Create new course
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('Creating course with data:', req.body);
        console.log('Instructor ID:', req.user.userId);
        
        const { title, description, category, difficulty_level, price } = req.body;
        
        // Validate required fields
        if (!title || !description || !category || !difficulty_level || price === undefined) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['title', 'description', 'category', 'difficulty_level', 'price']
            });
        }
        
        // Generate slug from title
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const [result] = await db.execute(
            `INSERT INTO courses (
                instructor_id, title, slug, description, category, 
                difficulty_level, price, is_published, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
            [
                req.user.userId,
                title,
                slug,
                description,
                category,
                difficulty_level,
                parseFloat(price)
            ]
        );
        
        console.log('Course created successfully with ID:', result.insertId);
        
        res.status(201).json({
            success: true,
            courseId: result.insertId,
            message: 'Course created successfully'
        });
    } catch (error) {
        console.error('Course creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create course',
            details: error.message 
        });
    }
});

// Get single course
router.get('/:id', async (req, res) => {
    try {
        const [courses] = await db.execute(
            `SELECT c.*, 
                    u.first_name as instructor_first_name, 
                    u.last_name as instructor_last_name,
                    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_students
             FROM courses c
             JOIN users u ON c.instructor_id = u.id
             WHERE c.id = ?`,
            [req.params.id]
        );
        
        if (courses.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        
        res.json({ success: true, course: courses[0] });
    } catch (error) {
        console.error('Course fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch course' });
    }
});

// Update course
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description, category, difficulty_level, price } = req.body;
        
        // Verify ownership
        const [courses] = await db.execute(
            'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
            [req.params.id, req.user.userId]
        );
        
        if (courses.length === 0) {
            return res.status(403).json({ error: 'Unauthorized or course not found' });
        }
        
        await db.execute(
            `UPDATE courses 
             SET title = ?, description = ?, category = ?, difficulty_level = ?, price = ?
             WHERE id = ?`,
            [title, description, category, difficulty_level, price, req.params.id]
        );
        
        res.json({ success: true, message: 'Course updated successfully' });
    } catch (error) {
        console.error('Course update error:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

// Delete course
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Verify ownership
        const [courses] = await db.execute(
            'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
            [req.params.id, req.user.userId]
        );
        
        if (courses.length === 0) {
            return res.status(403).json({ error: 'Unauthorized or course not found' });
        }
        
        await db.execute('DELETE FROM courses WHERE id = ?', [req.params.id]);
        
        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Course deletion error:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

module.exports = router;
