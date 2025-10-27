let notificationInterval = null;

async function initializeNotifications() {
    await loadNotifications();
    
    // Poll for new notifications every 30 seconds
    notificationInterval = setInterval(loadNotifications, 30000);
}

async function loadNotifications() {
    try {
        const response = await apiCall('/notifications');
        const notifications = response.notifications || [];
        
        updateNotificationBadge(notifications);
        displayNotifications(notifications);
    } catch (error) {
        console.error('Notifications load error:', error);
    }
}

function updateNotificationBadge(notifications) {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationBadge');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function displayNotifications(notifications) {
    const notificationsHTML = `
        <div class="notifications-panel">
            <div class="notifications-header">
                <h3>Notifications</h3>
                <button onclick="markAllAsRead()" class="btn-link">Mark all as read</button>
            </div>
            
            <div class="notifications-list">
                ${notifications.length === 0 ? `
                    <div class="empty-state">
                        <p>No notifications yet</p>
                    </div>
                ` : notifications.map(notif => `
                    <div class="notification-item ${notif.is_read ? 'read' : 'unread'}" 
                         onclick="markAsRead(${notif.id}, '${notif.link || '#'}')">
                        <div class="notification-icon">${getNotificationIcon(notif.type)}</div>
                        <div class="notification-content">
                            <h4>${notif.title}</h4>
                            <p>${notif.message}</p>
                            <span class="notification-time">${formatTimeAgo(notif.created_at)}</span>
                        </div>
                        ${!notif.is_read ? '<div class="unread-dot"></div>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('notifications-dropdown').innerHTML = notificationsHTML;
}

function getNotificationIcon(type) {
    const icons = {
        'enrollment': '📚',
        'progress': '📈',
        'certificate': '🎓',
        'course_update': '🔔',
        'system': 'ℹ️'
    };
    return icons[type] || '🔔';
}

async function markAsRead(notificationId, link) {
    try {
        await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (link && link !== '#') {
            window.location.href = link;
        } else {
            loadNotifications();
        }
    } catch (error) {
        console.error('Mark as read error:', error);
    }
}

async function markAllAsRead() {
    try {
        await fetch(`${API_BASE}/notifications/mark-all-read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        loadNotifications();
    } catch (error) {
        console.error('Mark all as read error:', error);
    }
}

function toggleNotificationsDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('notifications-dropdown');
    const bell = document.getElementById('notificationBell');
    
    if (dropdown && bell && !dropdown.contains(event.target) && !bell.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});
