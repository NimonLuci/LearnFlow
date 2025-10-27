async function loadCourses() {
    try {
        const courses = await apiCall('/courses');
        displayCourses(courses);
    } catch (error) {
        console.error('Courses loading error:', error);
        document.getElementById('coursesList').innerHTML = '<p>Error loading courses. Please try again.</p>';
    }
}

function displayCourses(courses) {
    const container = document.getElementById('coursesList');
    
    if (courses.length === 0) {
        container.innerHTML = '<p>No courses available at the moment.</p>';
        return;
    }
    
    container.innerHTML = courses.map(course => `
        <div class="course-card">
            <div class="course-image">
                ${course.category || 'Course'}
            </div>
            <div class="course-content">
                <h3 class="course-title">${course.title}</h3>
                <p class="course-description">${course.description || 'No description available'}</p>
                <div class="course-meta">
                    <span>${course.difficulty_level}</span>
                    <span>$${course.price || 'Free'}</span>
                </div>
                <div class="course-actions">
                    <button onclick="viewCourse(${course.id})" class="btn-primary">View Course</button>
                    <button onclick="enrollInCourse(${course.id})" class="btn-secondary">Enroll</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function enrollInCourse(courseId) {
    const token = getAuthToken();
    if (!token) {
        alert('Please login to enroll in courses');
        showSection('login');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/enrollments/enroll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ courseId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Successfully enrolled in the course!');
            showSection('dashboard');
            loadDashboardData();
        } else {
            alert(data.error || 'Enrollment failed');
        }
    } catch (error) {
        console.error('Enrollment error:', error);
        alert('Enrollment failed');
    }
}

function viewCourse(courseId) {
    // In a real app, this would show course details
    alert(`View course ${courseId} - This would show course details in a real implementation`);
}