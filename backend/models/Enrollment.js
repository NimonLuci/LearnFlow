const db = require('../config/database');

class Enrollment {
    static async enroll(studentId, courseId) {
        try {
            const [result] = await db.execute(
                'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
                [studentId, courseId]
            );
            return result.insertId;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Already enrolled in this course');
            }
            throw error;
        }
    }

    static async getEnrollments(studentId) {
        const [rows] = await db.execute(
            `SELECT e.*, c.title, c.description, c.thumbnail_url, c.instructor_id,
                    u.first_name as instructor_first_name, u.last_name as instructor_last_name
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             JOIN users u ON c.instructor_id = u.id
             WHERE e.student_id = ?
             ORDER BY e.enrolled_at DESC`,
            [studentId]
        );
        return rows;
    }

    static async getEnrollment(studentId, courseId) {
        const [rows] = await db.execute(
            'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        return rows[0];
    }

    static async updateProgress(studentId, courseId, progressPercentage) {
        const [result] = await db.execute(
            'UPDATE enrollments SET progress_percentage = ? WHERE student_id = ? AND course_id = ?',
            [progressPercentage, studentId, courseId]
        );
        return result.affectedRows > 0;
    }

    static async markCompleted(studentId, courseId) {
        const [result] = await db.execute(
            'UPDATE enrollments SET progress_percentage = 100, completed_at = CURRENT_TIMESTAMP WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        return result.affectedRows > 0;
    }

    static async getStudentProgress(studentId, courseId) {
        const [rows] = await db.execute(
            `SELECT up.module_id, up.is_completed, up.completed_at, m.title as module_title
             FROM user_progress up
             JOIN modules m ON up.module_id = m.id
             WHERE up.user_id = ? AND up.course_id = ?`,
            [studentId, courseId]
        );
        return rows;
    }

    static async updateModuleProgress(userId, moduleId, courseId, isCompleted, timeSpent = 0) {
        const [result] = await db.execute(
            `INSERT INTO user_progress (user_id, module_id, course_id, is_completed, time_spent_minutes) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             is_completed = VALUES(is_completed), 
             time_spent_minutes = time_spent_minutes + VALUES(time_spent_minutes),
             completed_at = CASE WHEN VALUES(is_completed) = TRUE THEN CURRENT_TIMESTAMP ELSE completed_at END`,
            [userId, moduleId, courseId, isCompleted, timeSpent]
        );

        // Update overall course progress
        if (isCompleted) {
            const [progress] = await db.execute(
                `SELECT 
                    (SELECT COUNT(*) FROM modules WHERE course_id = ?) as total_modules,
                    (SELECT COUNT(*) FROM user_progress WHERE user_id = ? AND course_id = ? AND is_completed = TRUE) as completed_modules`,
                [courseId, userId, courseId]
            );
            
            if (progress[0].total_modules > 0) {
                const progressPercentage = (progress[0].completed_modules / progress[0].total_modules) * 100;
                await this.updateProgress(userId, courseId, progressPercentage);
            }
        }

        return result.affectedRows > 0;
    }
}

module.exports = Enrollment;