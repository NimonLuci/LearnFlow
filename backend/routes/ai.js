const express = require('express');
const router = express.Router();
const AIService = require('../services/freeAIService');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

// Main AI query endpoint with enhanced debugging
router.post('/query', authenticateToken, async (req, res) => {
    try {
        const { query, courseId, sessionType = 'tutor', sessionId } = req.body;
        
        if (!query || query.trim() === '') {
            return res.status(400).json({ error: 'Query is required' });
        }

        console.log(`\n📨 AI REQUEST from user ${req.user.userId}: "${query}"`);

        const context = {
            userId: req.user.userId,
            courseId,
            sessionType,
            sessionId,
            userRole: req.user.role
        };

        const response = await AIService.processQuery(req.user.userId, query, context);

        console.log(`✅ AI RESPONSE: ${response.metadata.provider} | ${response.type}`);
        console.log(`   Preview: ${response.content.substring(0, 100)}...`);

        // Save to database if sessionId is provided
        if (sessionId) {
            try {
                await db.execute(
                    `INSERT INTO ai_messages (session_id, user_id, role, content, provider) 
                     VALUES (?, ?, 'user', ?, NULL)`,
                    [sessionId, req.user.userId, query]
                );
                
                await db.execute(
                    `INSERT INTO ai_messages (session_id, user_id, role, content, provider) 
                     VALUES (?, ?, 'assistant', ?, ?)`,
                    [sessionId, req.user.userId, response.content, response.metadata.provider]
                );
            } catch (dbError) {
                console.error('⚠️ Message save error:', dbError.message);
                // Continue anyway - don't fail the request
            }
        }

        res.json({
            success: true,
            response: response.content,
            metadata: response.metadata,
            type: response.type
        });

    } catch (error) {
        console.error('💥 AI Query error:', error);
        
        // Even if everything fails, return a working response
        res.json({
            success: true,
            response: "I'm here to help you learn! I can explain concepts, help with coding, create study plans, or provide career guidance. What would you like to know?",
            metadata: { 
                provider: "emergency_fallback",
                error: error.message 
            },
            type: "emergency"
        });
    }
});

// Create new AI session
router.post('/sessions', authenticateToken, async (req, res) => {
    try {
        const { courseId, sessionType, title } = req.body;
        
        const [result] = await db.execute(
            `INSERT INTO ai_sessions (user_id, course_id, session_type, title) 
             VALUES (?, ?, ?, ?)`,
            [req.user.userId, courseId || null, sessionType || 'tutor', title || 'AI Learning Session']
        );

        res.status(201).json({
            success: true,
            sessionId: result.insertId,
            message: 'AI session created successfully'
        });

    } catch (error) {
        console.error('Session creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create AI session',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get user's AI sessions
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const [sessions] = await db.execute(
            `SELECT id, course_id, session_type, title, created_at, updated_at 
             FROM ai_sessions 
             WHERE user_id = ? 
             ORDER BY updated_at DESC`,
            [req.user.userId]
        );
        
        res.json({
            success: true,
            sessions: sessions || []
        });
    } catch (error) {
        console.error('Sessions fetch error:', error);
        // Return empty array instead of error
        res.json({
            success: true,
            sessions: []
        });
    }
});

// Get session messages
router.get('/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Verify session belongs to user
        const [sessions] = await db.execute(
            'SELECT * FROM ai_sessions WHERE id = ? AND user_id = ?',
            [sessionId, req.user.userId]
        );

        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const [messages] = await db.execute(
            `SELECT id, role, content, provider, created_at 
             FROM ai_messages 
             WHERE session_id = ? 
             ORDER BY created_at ASC`,
            [sessionId]
        );
        
        res.json({
            success: true,
            messages: messages || []
        });

    } catch (error) {
        console.error('Message retrieval error:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve messages',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete AI session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Verify session belongs to user
        const [sessions] = await db.execute(
            'SELECT * FROM ai_sessions WHERE id = ? AND user_id = ?',
            [sessionId, req.user.userId]
        );

        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Delete messages first (foreign key constraint)
        await db.execute('DELETE FROM ai_messages WHERE session_id = ?', [sessionId]);
        
        // Delete session
        await db.execute('DELETE FROM ai_sessions WHERE id = ?', [sessionId]);

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });

    } catch (error) {
        console.error('Session deletion error:', error);
        res.status(500).json({ 
            error: 'Failed to delete session',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update learning profile
router.put('/learning-profile', authenticateToken, async (req, res) => {
    try {
        const { learning_style, proficiency_level, learning_goals, preferred_language } = req.body;
        
        // Check if profile exists
        const [existing] = await db.execute(
            'SELECT * FROM ai_learning_profiles WHERE user_id = ?',
            [req.user.userId]
        );

        let success;
        if (existing.length > 0) {
            // Update existing
            const [result] = await db.execute(
                `UPDATE ai_learning_profiles 
                 SET learning_style = ?, proficiency_level = ?, learning_goals = ?, preferred_language = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE user_id = ?`,
                [
                    learning_style || existing[0].learning_style, 
                    proficiency_level || existing[0].proficiency_level, 
                    learning_goals ? JSON.stringify(learning_goals) : existing[0].learning_goals, 
                    preferred_language || existing[0].preferred_language, 
                    req.user.userId
                ]
            );
            success = result.affectedRows > 0;
        } else {
            // Create new
            const [result] = await db.execute(
                `INSERT INTO ai_learning_profiles (user_id, learning_style, proficiency_level, learning_goals, preferred_language) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    req.user.userId, 
                    learning_style || 'visual', 
                    proficiency_level || 'intermediate', 
                    learning_goals ? JSON.stringify(learning_goals) : JSON.stringify([]), 
                    preferred_language || 'en'
                ]
            );
            success = result.affectedRows > 0;
        }

        if (success) {
            res.json({ 
                success: true, 
                message: 'Learning profile updated successfully' 
            });
        } else {
            res.status(400).json({ error: 'Failed to update learning profile' });
        }

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get learning profile
router.get('/learning-profile', authenticateToken, async (req, res) => {
    try {
        const [profile] = await db.execute(
            'SELECT * FROM ai_learning_profiles WHERE user_id = ?',
            [req.user.userId]
        );
        
        if (profile.length > 0) {
            // Parse JSON fields safely
            const userProfile = {
                ...profile[0],
                learning_goals: profile[0].learning_goals ? 
                    (typeof profile[0].learning_goals === 'string' ? 
                        JSON.parse(profile[0].learning_goals) : 
                        profile[0].learning_goals) : []
            };
            res.json({ 
                success: true, 
                profile: userProfile 
            });
        } else {
            res.json({ 
                success: true, 
                profile: null 
            });
        }

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch learning profile',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// AI Service status endpoint (for debugging)
router.get('/status', authenticateToken, (req, res) => {
    try {
        const status = AIService.getStatus();
        res.json({
            success: true,
            status: status,
            message: `AI Service Status: ${status.status}`
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.json({
            success: true,
            status: { error: error.message },
            message: 'AI Service status check failed'
        });
    }
});

// Test AI endpoint (for development)
router.post('/test', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required for test' });
        }

        console.log(`🧪 AI TEST: "${query}"`);
        
        const response = await AIService.processQuery(999, query, { test: true });
        
        res.json({
            success: true,
            test_query: query,
            response: response.content,
            metadata: response.metadata
        });

    } catch (error) {
        console.error('AI Test error:', error);
        res.status(500).json({ 
            error: 'AI test failed',
            details: error.message
        });
    }
});

module.exports = router;
