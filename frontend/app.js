// Backend API configuration
const API_BASE_URL = window.location.origin; // Use same origin as the frontend

// Authentication state management
let currentUser = null;

// Check authentication status
async function checkAuthentication() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUserInterface();
            return true;
        } else {
            // Not authenticated, redirect to login
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        redirectToLogin();
        return false;
    }
}

// Update user interface with authenticated user info
function updateUserInterface() {
    if (currentUser) {
        // Update user display in header
        const userInfoSpan = document.querySelector('.user-info span');
        if (userInfoSpan) {
            userInfoSpan.textContent = `${currentUser.first_name} ${currentUser.surname}`;
        }
        
        // Update role-based access if needed
        console.log(`Welcome ${currentUser.first_name}! Role: ${currentUser.role}`);
    }
}

// Redirect to login page
function redirectToLogin() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// Logout function
async function logout() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log('Logout successful');
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Always redirect to login regardless of API response
        redirectToLogin();
    }
}

// Add logout functionality to user avatar
function setupLogoutHandler() {
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar) {
        userAvatar.style.cursor = 'pointer';
        userAvatar.title = 'Click to logout';
        userAvatar.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    }
}

// Initialize authentication on page load
window.addEventListener('load', async function() {
    const isAuthenticated = await checkAuthentication();
    if (isAuthenticated) {
        setupLogoutHandler();
        setupEventListeners();
        console.log('User authenticated successfully');
    }
});

// Setup all event listeners
function setupEventListeners() {
    // Logout button event listener
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    }
    
    // Add Goods In button event listener
    const addGoodsBtn = document.querySelector('.add-goods-btn');
    if (addGoodsBtn) {
        addGoodsBtn.addEventListener('click', openGoodsInModal);
    }
    
    // Modal close button event listener
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeGoodsInModal);
    }
    
    // Modal cancel button event listener
    const cancelBtn = document.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeGoodsInModal);
    }
    
    // Form submit event listener
    const goodsInForm = document.getElementById('goodsInForm');
    if (goodsInForm) {
        goodsInForm.addEventListener('submit', submitGoodsIn);
    }
    
    // View receipt buttons event listeners
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            const item = this.getAttribute('data-item');
            viewReceipt(date, item);
        });
    });
    
    // Search and filter functionality
    setupSearchAndFilter();
}

// Search and Filter Functions
function setupSearchAndFilter() {
    const searchInput = document.getElementById('goods-search');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const clearFiltersBtn = document.getElementById('clear-filters');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterTable);
    }
    
    if (startDateInput) {
        startDateInput.addEventListener('change', filterTable);
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', filterTable);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
}

function filterTable() {
    const searchTerm = document.getElementById('goods-search')?.value.toLowerCase() || '';
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    
    const goodsInTable = document.querySelector('#goods-in tbody');
    if (!goodsInTable) return;
    
    const rows = goodsInTable.querySelectorAll('tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 0) return;
        
        // Get row data
        const date = cells[0]?.textContent.trim() || '';
        const name = cells[1]?.textContent.toLowerCase() || '';
        const weight = cells[2]?.textContent.toLowerCase() || '';
        const price = cells[3]?.textContent.toLowerCase() || '';
        const amount = cells[4]?.textContent.toLowerCase() || '';
        const account = cells[5]?.textContent.toLowerCase() || '';
        const status = cells[6]?.textContent.toLowerCase() || '';
        
        // Search filter
        const matchesSearch = !searchTerm || 
            name.includes(searchTerm) ||
            account.includes(searchTerm) ||
            status.includes(searchTerm) ||
            weight.includes(searchTerm) ||
            price.includes(searchTerm) ||
            amount.includes(searchTerm);
        
        // Date filter
        let matchesDate = true;
        if (startDate || endDate) {
            const rowDate = convertDateFormat(date);
            if (rowDate) {
                if (startDate && rowDate < startDate) {
                    matchesDate = false;
                }
                if (endDate && rowDate > endDate) {
                    matchesDate = false;
                }
            }
        }
        
        // Show/hide row
        if (matchesSearch && matchesDate) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update table message if no results
    updateTableMessage(visibleCount, goodsInTable);
}

function convertDateFormat(dateStr) {
    // Convert "DD/MM/YYYY" to "YYYY-MM-DD" for comparison
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return null;
}

function updateTableMessage(visibleCount, tableBody) {
    // Remove existing message
    const existingMessage = tableBody.querySelector('.no-results-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Add message if no results
    if (visibleCount === 0) {
        const messageRow = document.createElement('tr');
        messageRow.className = 'no-results-message';
        messageRow.innerHTML = `
            <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                No goods found matching your search criteria.
            </td>
        `;
        tableBody.appendChild(messageRow);
    }
}

function clearAllFilters() {
    // Clear search input
    const searchInput = document.getElementById('goods-search');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Clear date inputs
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
        startDateInput.value = '';
    }
    
    const endDateInput = document.getElementById('end-date');
    if (endDateInput) {
        endDateInput.value = '';
    }
    
    // Show all rows
    const goodsInTable = document.querySelector('#goods-in tbody');
    if (goodsInTable) {
        const rows = goodsInTable.querySelectorAll('tr');
        rows.forEach(row => {
            if (!row.classList.contains('no-results-message')) {
                row.style.display = '';
            }
        });
        
        // Remove no results message
        const messageRow = goodsInTable.querySelector('.no-results-message');
        if (messageRow) {
            messageRow.remove();
        }
    }
}

// Tab Navigation
document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and content
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Show corresponding tab content
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Date filter buttons
document.querySelectorAll('.date-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// View Receipt Function
function viewReceipt(date, itemName) {
    alert(`Viewing receipt for:
Date: ${date}
Item: ${itemName}

Receipt functionality will be implemented here.`);
}

// Goods In Modal Functions
function openGoodsInModal() {
    document.getElementById('goodsInModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeGoodsInModal() {
    document.getElementById('goodsInModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
    document.getElementById('goodsInForm').reset(); // Clear form
}

// Submit Goods In Form
function submitGoodsIn(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const goodsData = {
        name: formData.get('name'),
        weight: parseFloat(formData.get('weight')),
        acct_no: formData.get('acct_no'),
        bank: formData.get('bank'),
        phone_no: formData.get('phone_no'),
        amount_paid: parseFloat(formData.get('amount_paid'))
    };
    
    // Validate required fields
    if (!goodsData.name || !goodsData.weight || !goodsData.acct_no || 
        !goodsData.bank || !goodsData.phone_no || !goodsData.amount_paid) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    // Simulate API call (replace with actual API call)
    setTimeout(() => {
        console.log('Goods In Data:', goodsData);
        alert('Goods In record saved successfully!');
        
        // Reset form and close modal
        closeGoodsInModal();
        
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // TODO: Add the new record to the table or refresh the data
    }, 1000);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('goodsInModal');
    if (event.target === modal) {
        closeGoodsInModal();
    }
});