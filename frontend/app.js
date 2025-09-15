// Backend API configuration
const API_BASE_URL = window.location.origin; // Use same origin as the frontend

// Authentication state management
let currentUser = null;
let currentGoodsData = []; // Store all goods data for pagination
let currentPage = 1;
let rowsPerPage = 7;
let filteredData = []; // Store filtered data for pagination

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
        await loadDashboardData(); // Load dashboard data
        await loadGoodsInData(); // Load goods in data
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
    
    // Initialize pagination when data is loaded
    setupPagination();
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
    
    // Filter the data instead of hiding/showing rows
    filteredData = currentGoodsData.filter(item => {
        // Search filter
        const matchesSearch = !searchTerm || 
            item.name.toLowerCase().includes(searchTerm) ||
            item.acct_no.toLowerCase().includes(searchTerm) ||
            item.bank.toLowerCase().includes(searchTerm) ||
            item.status.toLowerCase().includes(searchTerm) ||
            item.weight.toString().includes(searchTerm) ||
            item.price_per_kg.toString().includes(searchTerm) ||
            item.amount.toString().includes(searchTerm);
        
        // Date filter
        let matchesDate = true;
        if (startDate || endDate) {
            const itemDate = formatDateForComparison(item.created_at);
            if (itemDate) {
                if (startDate && itemDate < startDate) {
                    matchesDate = false;
                }
                if (endDate && itemDate > endDate) {
                    matchesDate = false;
                }
            }
        }
        
        return matchesSearch && matchesDate;
    });
    
    // Reset to first page when filtering
    currentPage = 1;
    
    // Re-render table and pagination
    renderTablePage();
    updatePaginationControls();
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

// Format ISO date for comparison with date inputs
function formatDateForComparison(isoDateString) {
    if (!isoDateString) return null;
    
    const date = new Date(isoDateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Pagination Functions
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const paginationContainer = document.querySelector('#goods-in .pagination');
    
    if (!paginationContainer) return;
    
    // Clear existing pagination
    paginationContainer.innerHTML = '';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTablePage();
            updatePaginationControls();
        }
    });
    paginationContainer.appendChild(prevBtn);
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderTablePage();
            updatePaginationControls();
        });
        paginationContainer.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTablePage();
            updatePaginationControls();
        }
    });
    paginationContainer.appendChild(nextBtn);
    
    // Add page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'page-info';
    pageInfo.style.marginTop = '10px';
    pageInfo.style.textAlign = 'center';
    pageInfo.style.fontSize = '14px';
    pageInfo.style.color = '#666';
    
    const startRecord = totalPages === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const endRecord = Math.min(currentPage * rowsPerPage, filteredData.length);
    
    pageInfo.textContent = `Showing ${startRecord}-${endRecord} of ${filteredData.length} records`;
    paginationContainer.appendChild(pageInfo);
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
    
    // Reset filtered data to all data
    filteredData = currentGoodsData;
    currentPage = 1;
    
    // Re-render table and pagination
    renderTablePage();
    updatePaginationControls();
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

// View Receipt Function (will be updated by the new implementation below)
function viewReceipt(date, itemName, id = null) {
    alert(`Viewing receipt for:
${id ? `ID: ${id}
` : ''}Date: ${date}
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
async function submitGoodsIn(event) {
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
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/goods-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(goodsData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            alert('Goods In record saved successfully!');
            
            // Reset form and close modal
            closeGoodsInModal();
            
            // Reload data to show new record
            await loadGoodsInData();
            await loadDashboardData();
        } else {
            alert(result.message || 'Failed to save goods record.');
        }
    } catch (error) {
        console.error('Error submitting goods data:', error);
        alert('An error occurred while saving the record.');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('goodsInModal');
    if (event.target === modal) {
        closeGoodsInModal();
    }
});

// Data Loading Functions

// Load dashboard summary data
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard-summary`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateDashboardMetrics(result.data);
            }
        } else {
            console.error('Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update dashboard metrics with real data
function updateDashboardMetrics(data) {
    // Update Total Weight In
    const weightElement = document.querySelector('.metric-card:nth-child(1) .metric-value');
    if (weightElement) {
        weightElement.textContent = `${data.totalWeight.toLocaleString()} kg`;
    }
    
    // Update Amount Paid
    const paidElement = document.querySelector('.metric-card:nth-child(2) .metric-value');
    if (paidElement) {
        paidElement.textContent = `₦${data.amountPaid.toLocaleString()}`;
    }
    
    // Update Amount Due
    const dueElement = document.querySelector('.metric-card:nth-child(3) .metric-value');
    if (dueElement) {
        dueElement.textContent = `₦${data.amountDue.toLocaleString()}`;
    }
    
    // Update Debt
    const debtElement = document.querySelector('.metric-card:nth-child(4) .metric-value');
    if (debtElement) {
        debtElement.textContent = `₦${data.debt.toLocaleString()}`;
    }
}

// Load goods in data
async function loadGoodsInData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/goods-in`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateGoodsInTable(result.data);
                updateRecentActivitiesTable(result.data);
            }
        } else {
            console.error('Failed to load goods in data');
        }
    } catch (error) {
        console.error('Error loading goods in data:', error);
    }
}

// Update goods in table with real data
function updateGoodsInTable(data) {
    const tbody = document.querySelector('#goods-in tbody');
    if (!tbody) return;
    
    // Store data globally for pagination
    currentGoodsData = data;
    filteredData = data; // Initially, filtered data is same as all data
    currentPage = 1; // Reset to first page
    
    renderTablePage();
    updatePaginationControls();
}

// Render current page of table data
function renderTablePage() {
    const tbody = document.querySelector('#goods-in tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-box-open" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    No goods in records found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    // Sort data by created_at (newest first)
    const sortedPageData = pageData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    sortedPageData.forEach(item => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(item.created_at);
        const statusClass = item.status === 'completed' ? 'completed' : 'pending';
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.name}</td>
            <td>${item.weight.toLocaleString()}</td>
            <td>₦${item.price_per_kg.toFixed(2)}</td>
            <td>₦${item.amount.toLocaleString()}</td>
            <td>${item.acct_no}</td>
            <td>${item.bank}</td>
            <td><span class="status ${statusClass}">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span></td>
            <td>
                <button class="view-btn" data-id="${item.in_id}" data-date="${formattedDate}" data-item="${item.name}" title="View Receipt">
                    <i class="fas fa-eye"></i>
                    <span>View</span>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Re-attach event listeners for view buttons
    const viewButtons = tbody.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            const item = this.getAttribute('data-item');
            const id = this.getAttribute('data-id');
            viewReceipt(date, item, id);
        });
    });
}

// Update recent activities table with real data (showing latest 6 records)
function updateRecentActivitiesTable(data) {
    const tbody = document.querySelector('#dashboard .table-container tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    No recent activities found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort data by created_at (newest first) and take only first 6
    const recentData = data
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6);
    
    recentData.forEach(item => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(item.created_at);
        const statusClass = item.status === 'completed' ? 'completed' : 'pending';
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><span style="color: green;">In</span></td>
            <td>${item.weight.toLocaleString()}</td>
            <td>₦${item.amount.toLocaleString()}</td>
            <td><span class="status ${statusClass}">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update recent activities table with real data (showing latest 6 records)
function updateRecentActivitiesTable(data) {
    const tbody = document.querySelector('#dashboard .table-container tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    No recent activities found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort data by created_at (newest first) and take only first 6
    const recentData = data
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6);
    
    recentData.forEach(item => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(item.created_at);
        const statusClass = item.status === 'completed' ? 'completed' : 'pending';
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><span style="color: green;">In</span></td>
            <td>${item.weight.toLocaleString()}</td>
            <td>₦${item.amount.toLocaleString()}</td>
            <td><span class="status ${statusClass}">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Format date from ISO string to DD/MM/YYYY
function formatDate(isoDateString) {
    if (!isoDateString) return '';
    
    const date = new Date(isoDateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Setup pagination functionality
function setupPagination() {
    // Pagination functionality is handled by updatePaginationControls()
    // This function is called when data is loaded
}