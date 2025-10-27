const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Advanced course search
router.get('/courses', async (req, res) => {
    try {
        const { q, category, level, min_price, max_price, sort_by, instructor } = req.query;
        
        let query = `
            SELECT c.*, 
                   u.first_name as instructor_first_name,
                   u.last_name as instructor_last_name,
                   (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_students
            FROM courses c
            JOIN users u ON c.instructor_id = u.id
            WHERE c.is_published = TRUE AND c.is_approved = TRUE
        `;
        
        const params = [];
        
        // Search query
        if (q) {
            query += ` AND (c.title LIKE ? OR c.description LIKE ? OR c.category LIKE ?)`;
            const searchTerm = `%${q}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Category filter
        if (category) {
            query += ` AND c.category = ?`;
            params.push(category);
        }
        
        // Level filter
        if (level) {
            query += ` AND c.difficulty_level = ?`;
            params.push(level);
        }
        
        // Price range
        if (min_price) {
            query += ` AND c.price >= ?`;
            params.push(parseFloat(min_price));
        }
        if (max_price) {
            query += ` AND c.price <= ?`;
            params.push(parseFloat(max_price));
        }
        
        // Instructor filter
        if (instructor) {
            query += ` AND c.instructor_id = ?`;
            params.push(instructor);
        }
        
        // Sorting
        switch (sort_by) {
            case 'popular':
                query += ` ORDER BY total_students DESC`;
                break;
            case 'rating':
                query += ` ORDER BY c.rating DESC`;
                break;
            case 'newest':
                query += ` ORDER BY c.created_at DESC`;
                break;
            case 'price_low':
                query += ` ORDER BY c.price ASC`;
                break;
            case 'price_high':
                query += ` ORDER BY c.price DESC`;
                break;
            default:
                query += ` ORDER BY c.created_at DESC`;
        }
        
        const [courses] = await db.execute(query, params);
        
        res.json({ success: true, courses, count: courses.length });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get unique categories
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await db.execute(
            `SELECT DISTINCT category, COUNT(*) as course_count 
             FROM courses 
             WHERE is_published = TRUE AND is_approved = TRUE
             GROUP BY category
             ORDER BY course_count DESC`
        );
        
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Categories fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

module.exports = router;
