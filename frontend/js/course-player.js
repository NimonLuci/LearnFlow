let currentModule = null;
let videoProgressInterval = null;

async function loadCoursePlayer(courseId) {
    try {
        // Load course details
        const courseResponse = await apiCall(`/courses/${courseId}`);
        const course = courseResponse.course;
        
        // Load modules
        const modulesResponse = await fetch(`${API_BASE}/modules/course/${courseId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const { modules } = await modulesResponse.json();
        
        displayCoursePlayer(course, modules);
    } catch (error) {
        console.error('Course player load error:', error);
    }
}

function displayCoursePlayer(course, modules) {
    const playerHTML = `
        <div class="course-player">
            <div class="player-sidebar">
                <h3>${course.title}</h3>
                <div class="course-progress-bar">
                    <div class="progress-fill" style="width: ${course.enrollment_progress || 0}%"></div>
                </div>
                <p class="progress-text">${Math.round(course.enrollment_progress || 0)}% Complete</p>
                
                <div class="modules-list">
                    ${modules.map((module, idx) => `
                        <div class="module-item ${module.is_user_completed ? 'completed' : ''}" 
                             onclick="playModule(${module.id}, '${module.content_type}')">
                            <div class="module-number">${idx + 1}</div>
                            <div class="module-info">
                                <h4>${module.title}</h4>
                                <p>${module.video_duration_minutes || 0} min</p>
                            </div>
                            ${module.is_user_completed ? '<span class="check-icon">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="player-main">
                <div id="videoContainer" class="video-container">
                    <p class="select-module-prompt">Select a module to begin learning</p>
                </div>
                
                <div class="module-details">
                    <h2 id="moduleTitle">Welcome to ${course.title}</h2>
                    <div id="moduleDescription"></div>
                </div>
                
                <div class="player-actions">
                    <button onclick="markModuleComplete()" id="completeBtn" class="btn-primary" disabled>
                        Mark as Complete
                    </button>
                    <button onclick="nextModule()" id="nextBtn" class="btn-secondary" disabled>
                        Next Module →
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('course-player-section').innerHTML = playerHTML;
}

async function playModule(moduleId, contentType) {
    try {
        currentModule = moduleId;
        
        // Fetch module details
        const response = await fetch(`${API_BASE}/modules/${moduleId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const { module } = await response.json();
        
        // Update UI
        document.getElementById('moduleTitle').textContent = module.title;
        document.getElementById('moduleDescription').innerHTML = module.description || '';
        document.getElementById('completeBtn').disabled = false;
        
        // Load content
        const videoContainer = document.getElementById('videoContainer');
        
        if (contentType === 'video' && module.video_url) {
            videoContainer.innerHTML = `
                <video id="moduleVideo" controls width="100%" onloadedmetadata="videoLoaded()">
                    <source src="${module.video_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
            
            // Track video progress
            const video = document.getElementById('moduleVideo');
            video.addEventListener('timeupdate', trackVideoProgress);
            
        } else if (contentType === 'article') {
            videoContainer.innerHTML = `
                <div class="article-content">
                    ${module.article_content || '<p>Article content not available.</p>'}
                </div>
            `;
        }
        
        // Highlight current module
        document.querySelectorAll('.module-item').forEach(item => item.classList.remove('active'));
        event.target.closest('.module-item').classList.add('active');
        
    } catch (error) {
        console.error('Module play error:', error);
    }
}

function trackVideoProgress() {
    const video = document.getElementById('moduleVideo');
    if (!video || !currentModule) return;
    
    const watchPercentage = (video.currentTime / video.duration) * 100;
    
    // Auto-mark complete at 90%
    if (watchPercentage >= 90) {
        markModuleComplete();
    }
    
    // Update progress every 10 seconds
    if (videoProgressInterval) clearInterval(videoProgressInterval);
    
    videoProgressInterval = setInterval(async () => {
        await fetch(`${API_BASE}/modules/${currentModule}/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                time_spent_minutes: Math.floor(video.currentTime / 60),
                last_position_seconds: Math.floor(video.currentTime),
                video_watch_percentage: watchPercentage,
                is_completed: watchPercentage >= 90
            })
        });
    }, 10000);
}

async function markModuleComplete() {
    if (!currentModule) return;
    
    try {
        const response = await fetch(`${API_BASE}/modules/${currentModule}/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                time_spent_minutes: 1,
                is_completed: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Module completed! 🎉');
            
            // Update UI
            document.querySelector('.module-item.active')?.classList.add('completed');
            document.getElementById('nextBtn').disabled = false;
            
            // Check for certificate
            if (data.progress >= 100) {
                generateCertificate();
            }
        }
    } catch (error) {
        console.error('Complete module error:', error);
    }
}

async function generateCertificate() {
    // Get current course ID from URL or state
    const courseId = new URLSearchParams(window.location.search).get('courseId');
    
    try {
        const response = await apiCall('/certificates/generate', {
            method: 'POST',
            body: JSON.stringify({ course_id: courseId })
        });
        
        if (response.success) {
            showNotification('🎓 Congratulations! You earned a certificate!', 'success');
            setTimeout(() => {
                window.location.href = `/certificates.html?id=${response.certificate.id}`;
            }, 2000);
        }
    } catch (error) {
        console.error('Certificate generation error:', error);
    }
}
