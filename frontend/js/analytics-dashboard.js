async function loadAnalyticsDashboard() {
    try {
        const response = await apiCall('/analytics/my-progress');
        const { stats, category_progress, recent_activity } = response;
        
        displayAnalytics(stats, category_progress, recent_activity);
        loadWeeklyChart();
    } catch (error) {
        console.error('Analytics load error:', error);
    }
}

function displayAnalytics(stats, categoryProgress, recentActivity) {
    const analyticsHTML = `
        <div class="analytics-dashboard">
            <h2>Your Learning Analytics</h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📚</div>
                    <div class="stat-value">${stats.total_enrolled}</div>
                    <div class="stat-label">Courses Enrolled</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${stats.completed_courses}</div>
                    <div class="stat-label">Completed</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-value">${stats.total_learning_hours}h</div>
                    <div class="stat-label">Learning Time</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">${Math.round(stats.avg_progress)}%</div>
                    <div class="stat-label">Avg Progress</div>
                </div>
            </div>
            
            <div class="analytics-row">
                <div class="chart-container">
                    <h3>Weekly Learning Activity</h3>
                    <canvas id="weeklyChart"></canvas>
                </div>
                
                <div class="category-progress">
                    <h3>Progress by Category</h3>
                    ${categoryProgress.map(cat => `
                        <div class="category-item">
                            <div class="category-header">
                                <span>${cat.category}</span>
                                <span>${Math.round(cat.avg_progress)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${cat.avg_progress}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="recent-activity">
                <h3>Recent Activity</h3>
                <div class="activity-list">
                    ${recentActivity.map(activity => `
                        <div class="activity-item">
                            <div class="activity-icon">${getCategoryIcon(activity.category)}</div>
                            <div class="activity-details">
                                <h4>${activity.title}</h4>
                                <p>${activity.category} • ${Math.round(activity.progress_percentage)}% complete</p>
                                <span class="activity-time">${formatTimeAgo(activity.last_accessed_at)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('analytics-section').innerHTML = analyticsHTML;
}

async function loadWeeklyChart() {
    try {
        const response = await apiCall('/analytics/weekly-progress');
        const weeklyData = response.data;
        
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weeklyData.map(d => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })),
                datasets: [{
                    label: 'Learning Time (minutes)',
                    data: weeklyData.map(d => d.minutes),
                    backgroundColor: '#3b82f6',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => `${value} min`
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Weekly chart load error:', error);
    }
}

function getCategoryIcon(category) {
    const icons = {
        'Programming': '💻',
        'Database': '🗄️',
        'Design': '🎨',
        'Business': '💼',
        'Marketing': '📊'
    };
    return icons[category] || '📚';
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}
