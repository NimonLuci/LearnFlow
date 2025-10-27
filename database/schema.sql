-- Online Learning Platform Database Schema
CREATE DATABASE IF NOT EXISTS online_learning;
USE online_learning;

-- Users table with proper indexing
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
);

-- Courses table with proper constraints
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    learning_objectives JSON,
    requirements TEXT,
    target_audience TEXT,
    instructor_id INT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00 CHECK (price >= 0),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    thumbnail_url VARCHAR(255),
    promotional_video_url VARCHAR(255),
    is_published BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    total_duration_minutes INT DEFAULT 0,
    total_lectures INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_instructor (instructor_id),
    INDEX idx_category (category),
    INDEX idx_published (is_published, is_approved),
    INDEX idx_slug (slug)
);

-- Course modules/lessons with content versioning
CREATE TABLE modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    content_type ENUM('video', 'article', 'quiz', 'assignment') DEFAULT 'video',
    video_url VARCHAR(255),
    video_duration_minutes INT DEFAULT 0,
    article_content LONGTEXT,
    is_preview BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_module_slug (course_id, slug),
    INDEX idx_course_order (course_id, order_index)
);

-- Enrollments with payment tracking
CREATE TABLE enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    payment_id VARCHAR(255),
    amount_paid DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    certificate_issued_at TIMESTAMP NULL,
    certificate_id VARCHAR(255),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, course_id),
    INDEX idx_student_progress (student_id, progress_percentage),
    INDEX idx_course_enrollments (course_id, enrolled_at)
);

-- User progress tracking with detailed analytics
CREATE TABLE user_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    module_id INT NOT NULL,
    course_id INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    time_spent_minutes INT DEFAULT 0,
    last_position_seconds INT DEFAULT 0,
    video_watch_percentage DECIMAL(5,2) DEFAULT 0.00,
    notes TEXT,
    bookmarked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_progress (user_id, module_id),
    INDEX idx_user_course_progress (user_id, course_id, is_completed)
);

-- AI Learning Assistant Sessions
CREATE TABLE ai_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NULL,
    session_type ENUM('tutor', 'career_advisor', 'study_planner', 'code_reviewer') DEFAULT 'tutor',
    title VARCHAR(200) NOT NULL,
    context_data JSON, -- Stores course context, learning goals, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    INDEX idx_user_sessions (user_id, is_active)
);

-- AI Messages with agent reasoning tracking
CREATE TABLE ai_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('question', 'explanation', 'exercise', 'feedback', 'guidance') DEFAULT 'question',
    metadata JSON, -- Stores AI reasoning, tools used, confidence scores
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_messages (session_id, created_at)
);

-- AI Learning Profiles for personalized tutoring
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
);

-- Course reviews and ratings
CREATE TABLE course_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (course_id, user_id),
    INDEX idx_course_ratings (course_id, rating)
);

-- AI Analytics and Monitoring
CREATE TABLE ai_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id INT,
    query TEXT,
    response TEXT,
    intent_analysis JSON,
    tools_used JSON,
    execution_time_ms INT,
    tokens_consumed INT,
    confidence_score DECIMAL(3,2),
    user_feedback ENUM('positive', 'negative', 'neutral'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE SET NULL,
    INDEX idx_analytics_user (user_id, created_at),
    INDEX idx_analytics_feedback (user_feedback, created_at)
);

-- Knowledge Base for AI (can store course-specific knowledge)
CREATE TABLE ai_knowledge_base (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT,
    topic VARCHAR(200) NOT NULL,
    content LONGTEXT,
    content_type ENUM('concept', 'example', 'exercise', 'faq'),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced'),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_knowledge_topic (topic),
    INDEX idx_knowledge_course (course_id, difficulty_level)
);

-- Add to existing schema.sql

-- Modules table (already exists, but ensure it has these fields)
CREATE TABLE IF NOT EXISTS modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    content_type ENUM('video', 'article', 'quiz') DEFAULT 'video',
    video_url VARCHAR(500),
    video_duration_minutes INT DEFAULT 0,
    article_content TEXT,
    is_preview BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course (course_id),
    INDEX idx_order (course_id, order_index)
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    module_id INT NOT NULL,
    course_id INT NOT NULL,
    time_spent_minutes INT DEFAULT 0,
    last_position_seconds INT DEFAULT 0,
    video_watch_percentage DECIMAL(5,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_module (user_id, module_id),
    INDEX idx_user_course (user_id, course_id)
);

-- Course reviews
CREATE TABLE IF NOT EXISTS course_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_course (user_id, course_id),
    INDEX idx_course (course_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('enrollment', 'progress', 'certificate', 'course_update', 'system') DEFAULT 'system',
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created (created_at)
);

-- Certificates
CREATE TABLE IF NOT EXISTS certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_course_cert (user_id, course_id),
    INDEX idx_certificate_number (certificate_number)
);
