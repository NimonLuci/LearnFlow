const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Generate certificate for completed course
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { course_id } = req.body;
        
        // Check if course is completed
        const [enrollment] = await db.execute(
            `SELECT e.*, c.title, c.category, u.first_name, u.last_name
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             JOIN users u ON c.instructor_id = u.id
             WHERE e.student_id = ? AND e.course_id = ? AND e.progress_percentage = 100`,
            [req.user.userId, course_id]
        );
        
        if (enrollment.length === 0) {
            return res.status(400).json({ error: 'Course not completed yet' });
        }
        
        // Check if certificate already exists
        const [existing] = await db.execute(
            'SELECT * FROM certificates WHERE user_id = ? AND course_id = ?',
            [req.user.userId, course_id]
        );
        
        if (existing.length > 0) {
            return res.json({ success: true, certificate: existing[0] });
        }
        
        // Generate unique certificate number
        const certificateNumber = `LF-${Date.now()}-${req.user.userId}-${course_id}`;
        
        // Insert certificate
        const [result] = await db.execute(
            `INSERT INTO certificates (user_id, course_id, certificate_number, issue_date)
             VALUES (?, ?, ?, NOW())`,
            [req.user.userId, course_id, certificateNumber]
        );
        
        // Create notification
        await db.execute(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES (?, 'certificate', 'Certificate Earned!', ?, ?)`,
            [req.user.userId, `You've earned a certificate for completing "${enrollment[0].title}"`, `/certificates/${result.insertId}`]
        );
        
        res.json({ 
            success: true, 
            certificate: {
                id: result.insertId,
                certificate_number: certificateNumber,
                course_title: enrollment[0].title,
                issue_date: new Date()
            }
        });
    } catch (error) {
        console.error('Certificate generation error:', error);
        res.status(500).json({ error: 'Failed to generate certificate' });
    }
});

// Get user certificates
router.get('/my-certificates', authenticateToken, async (req, res) => {
    try {
        const [certificates] = await db.execute(
            `SELECT cert.*, c.title, c.category, c.thumbnail_url,
                    u.first_name as instructor_first_name, u.last_name as instructor_last_name
             FROM certificates cert
             JOIN courses c ON cert.course_id = c.id
             JOIN users u ON c.instructor_id = u.id
             WHERE cert.user_id = ?
             ORDER BY cert.issue_date DESC`,
            [req.user.userId]
        );
        
        res.json({ success: true, certificates });
    } catch (error) {
        console.error('Certificates fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch certificates' });
    }
});

// Verify certificate by number (public endpoint)
router.get('/verify/:certificateNumber', async (req, res) => {
    try {
        const [certificate] = await db.execute(
            `SELECT cert.*, 
                    u.first_name as student_first_name, u.last_name as student_last_name,
                    c.title as course_title, c.category,
                    inst.first_name as instructor_first_name, inst.last_name as instructor_last_name
             FROM certificates cert
             JOIN users u ON cert.user_id = u.id
             JOIN courses c ON cert.course_id = c.id
             JOIN users inst ON c.instructor_id = inst.id
             WHERE cert.certificate_number = ?`,
            [req.params.certificateNumber]
        );
        
        if (certificate.length === 0) {
            return res.status(404).json({ error: 'Certificate not found' });
        }
        
        res.json({ success: true, certificate: certificate[0], verified: true });
    } catch (error) {
        console.error('Certificate verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

module.exports = router;
