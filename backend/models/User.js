const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    static async create(userData) {
        try {
            const { username, email, password, first_name, last_name, role = 'student' } = userData;
            
            // Validate required fields
            if (!username || !email || !password || !first_name || !last_name) {
                throw new Error('All fields are required');
            }

            // Check if user already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Simplified INSERT without verification_token
            const [result] = await db.execute(
                `INSERT INTO users (username, email, password, first_name, last_name, role) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [username, email, hashedPassword, first_name, last_name, role]
            );

            return result.insertId;

        } catch (error) {
            console.error('User creation error:', error.message);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            return rows[0];
        } catch (error) {
            console.error('Find user by email error:', error.message);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await db.execute(
                'SELECT id, username, email, first_name, last_name, role, created_at FROM users WHERE id = ?',
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Find user by ID error:', error.message);
            throw error;
        }
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            console.error('Password verification error:', error.message);
            throw error;
        }
    }
}

module.exports = User;