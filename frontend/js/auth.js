// Use relative paths in production, full URLs in development
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Enhanced fetch function with better error handling
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include' // Important for CORS with credentials
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        // Handle HTTP errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        showAuthenticatedState(JSON.parse(user));
        showSection('dashboard');
        loadDashboardData();
        
        checkUserRole();
    } else {
        showUnauthenticatedState();
        showSection('login');
    }
}

function showAuthenticatedState(user) {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('userSection').classList.remove('hidden');
    document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;
}

function showUnauthenticatedState() {
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('userSection').classList.add('hidden');
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showAuthenticatedState(data.user);
        showSection('dashboard');
        loadDashboardData();
        checkUserRole();
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message || 'Login failed. Please try again.');
    }
}
function checkUserRole() {
    const user = getCurrentUser();
    if (user) {
        console.log('🔑 Current User Role:', user.role);
        console.log('👤 User Info:', user);
        return user.role;
    }
    return null;
}
async function handleRegister(event) {
    event.preventDefault();
    
    const formData = {
        username: document.getElementById('registerUsername').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        first_name: document.getElementById('registerFirstName').value,
        last_name: document.getElementById('registerLastName').value,
        role: document.getElementById('registerRole').value
    };
    
    try {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        alert('Registration successful! Please login.');
        showSection('login');
        document.getElementById('registerForm').reset();
        
        console.log('🎯 Registered with role:', formData.role);
        
    } catch (error) {
        console.error('Registration error:', error);
        alert(error.message || 'Registration failed. Please try again.');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showUnauthenticatedState();
    showSection('login');
}

function getAuthToken() {
    return localStorage.getItem('token');
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}