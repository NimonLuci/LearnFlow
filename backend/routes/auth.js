const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, first_name, last_name, role } = req.body;
        
        console.log('Registration attempt:', { username, email, role });
        
        // Validate required fields
        if (!username || !email || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check if user already exists
        const [existingUsers] = await db.execute(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        
        if (existingUsers.length > 0) {
            if (existingUsers[0].email === email) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await db.execute(
            `INSERT INTO users (username, email, password, first_name, last_name, role, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [username, email, hashedPassword, first_name, last_name, role || 'student']
        );
        
        console.log('User registered successfully:', result.insertId);
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            userId: result.insertId
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt for email:', email);
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = users[0];
        console.log('User found:', user.id, user.email, user.role);
        
        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log('Login successful for user:', user.id);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const [users] = await db.execute(
            'SELECT id, username, email, first_name, last_name, role FROM users WHERE id = ?',
            [decoded.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ success: true, user: users[0] });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
