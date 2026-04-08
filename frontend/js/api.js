const API_URL = '/api';

// Utility for fetching data from the API
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error.message);
        throw error;
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// Get logged in user's role
function getUserRole() {
    return localStorage.getItem('role'); // e.g., 'admin' or 'user'
}

// Redirect helpers
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
    }
}

function requireAdmin() {
    if (!isAuthenticated() || getUserRole() !== 'admin') {
        window.location.href = '/dashboard.html';
    }
}

function requireGuest() {
    if (isAuthenticated()) {
        if (getUserRole() === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/dashboard.html';
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}
