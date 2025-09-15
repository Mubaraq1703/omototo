// Backend API configuration
const API_BASE_URL = window.location.origin; // Use same origin as the frontend

// DOM elements
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Show loading state
function showLoading(button) {
    button.disabled = true;
    button.textContent = 'Logging in...';
}

// Hide loading state
function hideLoading(button) {
    button.disabled = false;
    button.textContent = 'Login';
}

// Show error message
function showError(message) {
    // Remove existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create and show new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #dc3545;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 15px;
        font-size: 14px;
    `;
    
    loginForm.insertBefore(errorDiv, loginForm.firstChild);
    
    // Auto-remove error after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Authenticate user with backend
async function authenticateUser(username, password) {
    try {
        const response = await fetch(`/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for session management
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store user info in sessionStorage for app use
            sessionStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('isAuthenticated', 'true');
            
            console.log('Login successful:', data.message);
            return { success: true, user: data.user };
        } else {
            console.error('Login failed:', data.error);
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Network error during login:', error);
        return { 
            success: false, 
            error: 'Network error. Please check your connection and try again.' 
        };
    }
}

// Handle form submission
loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    // Basic client-side validation
    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }
    
    if (username.length < 3) {
        showError('Username must be at least 3 characters long.');
        return;
    }
    
    // Show loading state
    showLoading(submitButton);
    
    try {
        // Authenticate with backend
        const result = await authenticateUser(username, password);
        
        if (result.success) {
            // Redirect to main application
            window.location.href = 'app.html';
        } else {
            showError(result.error || 'Login failed. Please try again.');
        }
    } catch (error) {
        showError('An unexpected error occurred. Please try again.');
    } finally {
        // Hide loading state
        hideLoading(submitButton);
    }
});

// Check if user is already authenticated
window.addEventListener('load', async function() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            // User is already authenticated, redirect to app
            window.location.href = 'app.html';
        }
    } catch (error) {
        // User not authenticated or network error, stay on login page
        console.log('User not authenticated');
    }
});