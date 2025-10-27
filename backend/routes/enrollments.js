const express = require('express');
const Enrollment = require('../models/Enrollment');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Enroll in course
router.post('/enroll', authenticateToken, async (req, res) => {
    try {
        const { courseId } = req.body;
        
        if (!courseId) {
            return res.status(400).json({ error: 'Course ID is required' });
        }

        const enrollmentId = await Enrollment.enroll(req.user.userId, courseId);
        
        res.status(201).json({
            message: 'Successfully enrolled in course',
            enrollmentId
        });
    } catch (error) {
        console.error('Enrollment error:', error);
        
        if (error.message === 'Already enrolled in this course') {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Enrollment failed' });
    }
});

// Get user's enrolled courses
router.get('/my-courses', authenticateToken, async (req, res) => {
    try {
        const enrollments = await Enrollment.getEnrollments(req.user.userId);
        res.json(enrollments);
    } catch (error) {
        console.error('Enrollments fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
});

// Update progress
router.put('/progress', authenticateToken, async (req, res) => {
    try {
        const { courseId, moduleId, isCompleted, timeSpent } = req.body;
        
        const success = await Enrollment.updateModuleProgress(
            req.user.userId, 
            moduleId, 
            courseId, 
            isCompleted, 
            timeSpent
        );

        if (success) {
            res.json({ message: 'Progress updated successfully' });
        } else {
            res.status(400).json({ error: 'Failed to update progress' });
        }
    } catch (error) {
        console.error('Progress update error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

module.exports = router;