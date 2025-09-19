// Backend API configuration
const API_BASE_URL = window.location.origin; // Use same origin as the frontend

// Modal message system for login page
function showLoginMessage(message, type = 'error') {
    // Remove existing message modal if any
    const existingModal = document.querySelector('.login-message-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'login-message-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.3s;
    `;
    
    // Determine icon and colors based on type
    let icon, bgColor, textColor;
    switch(type) {
        case 'success':
            icon = '✓';
            bgColor = '#d4edda';
            textColor = '#155724';
            break;
        case 'error':
            icon = '⚠';
            bgColor = '#f8d7da';
            textColor = '#721c24';
            break;
        case 'info':
            icon = 'ℹ';
            bgColor = '#d1ecf1';
            textColor = '#0c5460';
            break;
        default:
            icon = 'ℹ';
            bgColor = '#d1ecf1';
            textColor = '#0c5460';
    }
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 0;
            border-radius: 10px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s;
        ">
            <div style="
                background: ${bgColor};
                color: ${textColor};
                padding: 20px;
                border-radius: 10px 10px 0 0;
                text-align: center;
                font-weight: bold;
                font-size: 18px;
            ">
                <span style="font-size: 24px; margin-right: 10px;">${icon}</span>
                ${type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            <div style="padding: 20px; text-align: center;">
                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">${message}</p>
                <button type="button" style="
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    background-color: #2b6777;
                    color: white;
                    font-weight: 500;
                    cursor: pointer;
                    font-size: 14px;
                " onclick="this.closest('.login-message-modal').remove()">OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    if (!document.querySelector('style[data-login-animations]')) {
        style.setAttribute('data-login-animations', 'true');
        document.head.appendChild(style);
    }
    
    return modal;
}

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
        showLoginMessage('Please enter both username and password.', 'error');
        return;
    }
    
    if (username.length < 3) {
        showLoginMessage('Username must be at least 3 characters long.', 'error');
        return;
    }
    
    // Show loading state
    showLoading(submitButton);
    
    try {
        // Authenticate with backend
        const result = await authenticateUser(username, password);
        
        if (result.success) {
            showLoginMessage('Login successful! Redirecting...', 'success');
            // Small delay to show success message before redirect
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 1000);
        } else {
            showLoginMessage(result.error || 'Login failed. Please try again.', 'error');
        }
    } catch (error) {
        showLoginMessage('An unexpected error occurred. Please try again.', 'error');
    } finally {
        // Hide loading state
        hideLoading(submitButton);
    }
});

// Fetch server status and log to console
async function fetchServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        if (response.ok) {
            const data = await response.json();
            console.log(`%c[Server Status: ${data.status}]`, 'color: #28a745; font-weight: bold;', data.message);
        } else {
            console.error('Failed to fetch server status.');
        }
    } catch (error) {
        console.error('Error fetching server status:', error);
    }
}

// Check if user is already authenticated
window.addEventListener('load', async function() {
    fetchServerStatus(); // Fetch and log server status
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