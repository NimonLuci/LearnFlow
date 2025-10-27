const mysql = require('mysql2');
require('dotenv').config();

console.log('🔧 Checking environment variables...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : '(empty)');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT || 3306);

async function initializeDatabase() {
    console.log('\n🚀 Initializing LearnFlow Database...');
    
    // Create connection without database first
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
    });

    const promiseConnection = connection.promise();

    try {
        console.log('🔌 Testing database connection...');
        
        // Test basic connection
        await promiseConnection.execute('SELECT 1 as test');
        console.log('✅ Basic connection test passed');
        
        // Create database using regular query (not prepared statement)
        console.log('📦 Creating database...');
        await promiseConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log('✅ Database created/verified');
        
        // Switch to the database
        await promiseConnection.query(`USE \`${process.env.DB_NAME}\``);
        console.log('✅ Database selected');
        
        // Create tables
        console.log('🗂️ Creating tables...');
        
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_username (username)
            )`,
            
            `CREATE TABLE IF NOT EXISTS courses (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS modules (
                id INT PRIMARY KEY AUTO_INCREMENT,
                course_id INT NOT NULL,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                order_index INT NOT NULL,
                content_type ENUM('video', 'article', 'quiz', 'assignment') DEFAULT 'video',
                video_url VARCHAR(255),
                video_duration_minutes INT DEFAULT 0,
                article_content LONGTEXT,
                is_preview BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                INDEX idx_course_order (course_id, order_index)
            )`,
            
            `CREATE TABLE IF NOT EXISTS enrollments (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS user_progress (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                module_id INT NOT NULL,
                course_id INT NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP NULL,
                time_spent_minutes INT DEFAULT 0,
                last_position_seconds INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                UNIQUE KEY unique_progress (user_id, module_id),
                INDEX idx_user_course_progress (user_id, course_id, is_completed)
            )`,
            
            `CREATE TABLE IF NOT EXISTS ai_sessions (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS ai_messages (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS ai_learning_profiles (
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
            )`
        ];

        for (let i = 0; i < tables.length; i++) {
            await promiseConnection.query(tables[i]);
            console.log(`✅ Table ${i + 1} created`);
        }

        console.log('\n🎉 Database initialization completed successfully!');
        console.log('📊 Tables created: users, courses, modules, enrollments, user_progress, ai_sessions, ai_messages, ai_learning_profiles');
        
        // Add test data
        console.log('\n🎯 Adding test data...');
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        // Add test instructor
        await promiseConnection.query(
            'INSERT IGNORE INTO users (username, email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
            ['test_instructor', 'instructor@learnflow.com', hashedPassword, 'John', 'Instructor', 'instructor']
        );
        
        // Add test course
        await promiseConnection.query(
            'INSERT IGNORE INTO courses (title, description, instructor_id, category, difficulty_level, is_published) VALUES (?, ?, 1, ?, ?, TRUE)',
            ['Web Development Basics', 'Learn HTML, CSS, and JavaScript from scratch', 'Programming', 'beginner']
        );
        
        // Add test module
        await promiseConnection.query(
            'INSERT IGNORE INTO modules (course_id, title, description, order_index, content_type) VALUES (?, ?, ?, 1, ?)',
            [1, 'Introduction to HTML', 'Learn the basics of HTML structure', 'video']
        );

        console.log('✅ Test data added');
        console.log('\n🔑 Test instructor account:');
        console.log('   Email: instructor@learnflow.com');
        console.log('   Password: password123');
        console.log('\n🚀 You can now start the server with: npm run dev');

    } catch (error) {
        console.error('\n❌ Database initialization failed:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n🔑 ACCESS DENIED - Check your MySQL credentials in .env file');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n🔌 CONNECTION REFUSED - Make sure MySQL is running in XAMPP');
        } else {
            console.log('🔧 Error code:', error.code);
        }
    } finally {
        connection.end();
    }
}

// Only run if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };