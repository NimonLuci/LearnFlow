async function loadInstructorDashboard() {
    try {
        const response = await apiCall('/courses/my-courses');
        const courses = response.courses || [];
        
        displayInstructorDashboard(courses);
    } catch (error) {
        console.error('Instructor dashboard error:', error);
    }
}

function displayInstructorDashboard(courses) {
    const dashboardHTML = `
        <div class="instructor-dashboard">
            <div class="dashboard-header">
                <h2>Instructor Dashboard</h2>
                <button onclick="showCreateCourseForm()" class="btn-primary">
                    + Create New Course
                </button>
            </div>
            
            <div class="instructor-stats">
                <div class="stat-card">
                    <div class="stat-value">${courses.length}</div>
                    <div class="stat-label">Total Courses</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${courses.reduce((sum, c) => sum + (c.total_students || 0), 0)}</div>
                    <div class="stat-label">Total Students</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${courses.filter(c => c.is_published).length}</div>
                    <div class="stat-label">Published</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(courses.reduce((sum, c) => sum + (c.rating || 0), 0) / courses.length || 0).toFixed(1)}</div>
                    <div class="stat-label">Avg Rating</div>
                </div>
            </div>
            
            <div class="courses-table">
                <h3>Your Courses</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Course</th>
                            <th>Students</th>
                            <th>Rating</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${courses.map(course => `
                            <tr>
                                <td>
                                    <div class="course-info">
                                        <img src="${course.thumbnail_url || '/assets/default-course.png'}" alt="${course.title}">
                                        <div>
                                            <strong>${course.title}</strong>
                                            <p>${course.category}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>${course.total_students || 0}</td>
                                <td>⭐ ${course.rating || 0}</td>
                                <td>
                                    <span class="badge ${course.is_published ? 'badge-success' : 'badge-warning'}">
                                        ${course.is_published ? 'Published' : 'Draft'}
                                    </span>
                                </td>
                                <td>
                                    <button onclick="editCourse(${course.id})" class="btn-icon" title="Edit">✏️</button>
                                    <button onclick="manageCourseContent(${course.id})" class="btn-icon" title="Manage Content">📚</button>
                                    <button onclick="viewCourseAnalytics(${course.id})" class="btn-icon" title="Analytics">📊</button>
                                    <button onclick="deleteCourse(${course.id})" class="btn-icon btn-danger" title="Delete">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('instructor-section').innerHTML = dashboardHTML;
}

function showCreateCourseForm() {
    const formHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h2>Create New Course</h2>
                <form onsubmit="createCourse(event)" id="createCourseForm">
                    <div class="form-group">
                        <label>Course Title *</label>
                        <input type="text" name="title" required placeholder="e.g., Complete JavaScript Masterclass">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Category *</label>
                            <select name="category" required>
                                <option value="">Select Category</option>
                                <option value="Programming">Programming</option>
                                <option value="Database">Database</option>
                                <option value="Design">Design</option>
                                <option value="Business">Business</option>
                                <option value="Marketing">Marketing</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Difficulty Level *</label>
                            <select name="difficulty_level" required>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Description *</label>
                        <textarea name="description" rows="4" required placeholder="Describe what students will learn..."></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Price ($) *</label>
                            <input type="number" name="price" required min="0" step="0.01" placeholder="49.99">
                        </div>
                        
                        <div class="form-group">
                            <label>Thumbnail URL</label>
                            <input type="url" name="thumbnail_url" placeholder="https://example.com/image.jpg">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>What You'll Learn (one per line)</label>
                        <textarea name="what_you_will_learn" rows="3" placeholder="Master JavaScript fundamentals&#10;Build real-world projects&#10;Understand async programming"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Requirements (one per line)</label>
                        <textarea name="requirements" rows="2" placeholder="Basic HTML/CSS knowledge&#10;A computer with internet"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="closeModal()" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Create Course</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHTML);
}

async function createCourse(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const courseData = {
        title: formData.get('title'),
        category: formData.get('category'),
        difficulty_level: formData.get('difficulty_level'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        thumbnail_url: formData.get('thumbnail_url'),
        what_you_will_learn: formData.get('what_you_will_learn')?.split('\n').filter(x => x.trim()),
        requirements: formData.get('requirements')?.split('\n').filter(x => x.trim())
    };
    
    try {
        const response = await apiCall('/courses', {
            method: 'POST',
            body: JSON.stringify(courseData)
        });
        
        if (response.success) {
            showNotification('Course created successfully! 🎉', 'success');
            closeModal();
            loadInstructorDashboard();
        }
    } catch (error) {
        console.error('Course creation error:', error);
        showNotification('Failed to create course', 'error');
    }
}

async function manageCourseContent(courseId) {
    try {
        const response = await fetch(`${API_BASE}/modules/course/${courseId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const { modules } = await response.json();
        
        displayCourseContentManager(courseId, modules);
    } catch (error) {
        console.error('Content manager error:', error);
    }
}

function displayCourseContentManager(courseId, modules) {
    const contentHTML = `
        <div class="content-manager">
            <div class="manager-header">
                <h2>Manage Course Content</h2>
                <button onclick="showAddModuleForm(${courseId})" class="btn-primary">+ Add Module</button>
            </div>
            
            <div class="modules-manager">
                ${modules.length === 0 ? `
                    <div class="empty-state">
                        <p>No modules yet. Add your first module to get started!</p>
                    </div>
                ` : modules.map((module, idx) => `
                    <div class="module-card" data-module-id="${module.id}">
                        <div class="module-header">
                            <span class="module-number">${idx + 1}</span>
                            <h3>${module.title}</h3>
                            <div class="module-actions">
                                <button onclick="editModule(${module.id})" class="btn-icon">✏️</button>
                                <button onclick="deleteModule(${module.id})" class="btn-icon btn-danger">🗑️</button>
                            </div>
                        </div>
                        <div class="module-meta">
                            <span>${module.content_type}</span>
                            <span>${module.video_duration_minutes || 0} min</span>
                            <span class="badge ${module.is_published ? 'badge-success' : 'badge-warning'}">
                                ${module.is_published ? 'Published' : 'Draft'}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('content-manager-section').innerHTML = contentHTML;
    showSection('content-manager');
}

function showAddModuleForm(courseId) {
    const formHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h2>Add New Module</h2>
                <form onsubmit="createModule(event, ${courseId})" id="createModuleForm">
                    <div class="form-group">
                        <label>Module Title *</label>
                        <input type="text" name="title" required placeholder="e.g., Introduction to Variables">
                    </div>
                    
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" rows="3" placeholder="Brief description of this module..."></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Content Type *</label>
                            <select name="content_type" required onchange="toggleContentFields(this.value)">
                                <option value="video">Video</option>
                                <option value="article">Article</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Order</label>
                            <input type="number" name="order_index" value="0" min="0">
                        </div>
                    </div>
                    
                    <div id="videoFields">
                        <div class="form-group">
                            <label>Video URL *</label>
                            <input type="url" name="video_url" placeholder="https://example.com/video.mp4">
                        </div>
                        
                        <div class="form-group">
                            <label>Video Duration (minutes)</label>
                            <input type="number" name="video_duration_minutes" value="10" min="1">
                        </div>
                    </div>
                    
                    <div id="articleFields" style="display:none;">
                        <div class="form-group">
                            <label>Article Content</label>
                            <textarea name="article_content" rows="8" placeholder="Write your article content here (HTML supported)..."></textarea>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="is_preview" value="true">
                            Make this module a free preview
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="closeModal()" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Add Module</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHTML);
}

function toggleContentFields(contentType) {
    document.getElementById('videoFields').style.display = contentType === 'video' ? 'block' : 'none';
    document.getElementById('articleFields').style.display = contentType === 'article' ? 'block' : 'none';
}

async function createModule(event, courseId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const moduleData = {
        course_id: courseId,
        title: formData.get('title'),
        description: formData.get('description'),
        order_index: parseInt(formData.get('order_index')),
        content_type: formData.get('content_type'),
        video_url: formData.get('video_url'),
        video_duration_minutes: parseInt(formData.get('video_duration_minutes')) || 0,
        article_content: formData.get('article_content'),
        is_preview: formData.get('is_preview') === 'true'
    };
    
    try {
        const response = await fetch(`${API_BASE}/modules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(moduleData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Module added successfully! 🎉', 'success');
            closeModal();
            manageCourseContent(courseId);
        }
    } catch (error) {
        console.error('Module creation error:', error);
        showNotification('Failed to add module', 'error');
    }
}

async function deleteModule(moduleId) {
    if (!confirm('Are you sure you want to delete this module?')) return;
    
    try {
        await fetch(`${API_BASE}/modules/${moduleId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        showNotification('Module deleted', 'success');
        location.reload();
    } catch (error) {
        console.error('Module deletion error:', error);
        showNotification('Failed to delete module', 'error');
    }
}
