const mysql = require('mysql2');
require('dotenv').config();

async function resetDatabase() {
    console.log('🔄 Resetting LearnFlow Database...');
    
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
    });

    const promiseConnection = connection.promise();

    try {
        console.log('🗑️ Dropping existing database...');
        await promiseConnection.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\``);
        
        console.log('📦 Creating new database...');
        await promiseConnection.query(`CREATE DATABASE \`${process.env.DB_NAME}\``);
        await promiseConnection.query(`USE \`${process.env.DB_NAME}\``);
        
        console.log('🗂️ Creating tables with correct schema...');
        
        // Create users table with all required columns
        await promiseConnection.query(`
            CREATE TABLE users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                role ENUM('student', 'instructor', 'admin') DEFAULT 'student',
                avatar_url VARCHAR(255),
                bio TEXT,
                email_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                reset_token VARCHAR(255),
                reset_token_expiry TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_username (username)
            )
        `);

        await promiseConnection.query(`
            CREATE TABLE courses (
                id INT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                instructor_id INT NOT NULL,
                price DECIMAL(10,2) DEFAULT 0.00,
                category VARCHAR(100),
                difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
                thumbnail_url VARCHAR(255),
                is_published BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_instructor (instructor_id),
                INDEX idx_category (category)
            )
        `);

        await promiseConnection.query(`
            CREATE TABLE enrollments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                course_id INT NOT NULL,
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                progress_percentage DECIMAL(5,2) DEFAULT 0.00,
                completed_at TIMESTAMP NULL,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                UNIQUE KEY unique_enrollment (student_id, course_id),
                INDEX idx_student_progress (student_id, progress_percentage)
            )
        `);

        await promiseConnection.query(`
            CREATE TABLE ai_sessions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                course_id INT NULL,
                session_type ENUM('tutor', 'career_advisor', 'study_planner', 'code_reviewer') DEFAULT 'tutor',
                title VARCHAR(200) NOT NULL,
                context_data JSON,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
                INDEX idx_user_sessions (user_id, is_active)
            )
        `);

        await promiseConnection.query(`
            CREATE TABLE ai_messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                session_id INT NOT NULL,
                role ENUM('user', 'assistant', 'system') NOT NULL,
                content TEXT NOT NULL,
                message_type ENUM('question', 'explanation', 'exercise', 'feedback', 'guidance') DEFAULT 'question',
                metadata JSON,
                tokens_used INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE,
                INDEX idx_session_messages (session_id, created_at)
            )
        `);

        await promiseConnection.query(`
            CREATE TABLE ai_learning_profiles (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                learning_style ENUM('visual', 'auditory', 'kinesthetic', 'reading_writing') DEFAULT 'visual',
                proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
                preferred_language VARCHAR(10) DEFAULT 'en',
                learning_goals JSON,
                knowledge_gaps JSON,
                strengths JSON,
                last_assessment_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_profile (user_id)
            )
        `);

        console.log('✅ All tables created successfully!');
        
        // Add test data
        console.log('🎯 Adding test data...');
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        await promiseConnection.query(
            'INSERT INTO users (username, email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
            ['test_instructor', 'instructor@learnflow.com', hashedPassword, 'John', 'Instructor', 'instructor']
        );
        
        await promiseConnection.query(
            'INSERT INTO courses (title, description, instructor_id, category, difficulty_level, is_published) VALUES (?, ?, 1, ?, ?, TRUE)',
            ['Web Development Basics', 'Learn HTML, CSS, and JavaScript from scratch', 'Programming', 'beginner']
        );

        console.log('✅ Test data added');
        console.log('\n🔑 Test instructor account:');
        console.log('   Email: instructor@learnflow.com');
        console.log('   Password: password123');
        console.log('\n🎉 Database reset completed!');

    } catch (error) {
        console.error('❌ Database reset failed:', error.message);
    } finally {
        connection.end();
    }
}

resetDatabase();