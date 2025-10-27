// Navigation and Section Management
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        section.classList.add('active');
        
        // Load section-specific data
        switch(sectionName) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'courses':
                loadCourses();
                break;
            case 'profile':
                loadProfileData();
                break;
            case 'ai-tutor':
                loadAISessions();
                break;
        }
    }
}

// Dashboard Functions
async function loadDashboardData() {
    const token = getAuthToken();
    if (!token) return;
    
    try {
        // Load enrolled courses
        const response = await fetch(`${API_BASE}/enrollments/my-courses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const courses = await response.json();
            displayEnrolledCourses(courses);
        }
    } catch (error) {
        console.error('Dashboard data loading error:', error);
    }
}

function displayEnrolledCourses(courses) {
    const container = document.getElementById('enrolledCoursesList');
    
    if (courses.length === 0) {
        container.innerHTML = '<p>You are not enrolled in any courses yet.</p>';
        return;
    }
    
    container.innerHTML = courses.map(course => `
        <div class="course-item">
            <h4>${course.title}</h4>
            <p>Progress: ${course.progress_percentage || 0}%</p>
        </div>
    `).join('');
}

// Profile Functions
async function loadProfileData() {
    const token = getAuthToken();
    const user = getCurrentUser();
    
    if (!token || !user) return;
    
    try {
        // Load user profile
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const profile = await response.json();
            document.getElementById('profileFirstName').value = profile.user.first_name;
            document.getElementById('profileLastName').value = profile.user.last_name;
            document.getElementById('profileBio').value = profile.user.bio || '';
        }
        
        // Load learning profile
        const learningResponse = await fetch(`${API_BASE}/ai/learning-profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (learningResponse.ok) {
            const learningProfile = await learningResponse.json();
            if (learningProfile.learning_style) {
                document.getElementById('learningStyle').value = learningProfile.learning_style;
            }
            if (learningProfile.proficiency_level) {
                document.getElementById('proficiencyLevel').value = learningProfile.proficiency_level;
            }
        }
    } catch (error) {
        console.error('Profile loading error:', error);
    }
}

async function updateProfile(event) {
    event.preventDefault();
    
    const token = getAuthToken();
    const formData = {
        first_name: document.getElementById('profileFirstName').value,
        last_name: document.getElementById('profileLastName').value,
        bio: document.getElementById('profileBio').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            alert('Profile updated successfully!');
            // Update local storage
            const user = getCurrentUser();
            user.first_name = formData.first_name;
            user.last_name = formData.last_name;
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;
        } else {
            alert('Failed to update profile');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        alert('Profile update failed');
    }
}

async function updateLearningProfile(event) {
    event.preventDefault();
    
    const token = getAuthToken();
    const formData = {
        learning_style: document.getElementById('learningStyle').value,
        proficiency_level: document.getElementById('proficiencyLevel').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/ai/learning-profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            alert('Learning preferences updated!');
        } else {
            alert('Failed to update learning preferences');
        }
    } catch (error) {
        console.error('Learning profile update error:', error);
        alert('Update failed');
    }
}