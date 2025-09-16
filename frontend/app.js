// Backend API configuration
const API_BASE_URL = window.location.origin;

// Modal message system
function showModalMessage(message, type = 'info', title = '', actions = []) {
    // Remove existing message modal if any
    const existingModal = document.querySelector('.message-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal message-modal';
    modal.style.display = 'block';
    
    // Determine icon and colors based on type
    let icon, headerClass;
    switch(type) {
        case 'success':
            icon = 'fas fa-check-circle';
            headerClass = 'success';
            break;
        case 'error':
            icon = 'fas fa-exclamation-triangle';
            headerClass = 'error';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-circle';
            headerClass = 'warning';
            break;
        default:
            icon = 'fas fa-info-circle';
            headerClass = 'info';
    }
    
    // Create default title if not provided
    if (!title) {
        title = type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    // Create default actions if not provided
    if (actions.length === 0) {
        actions = [{
            text: 'OK',
            class: 'btn-primary',
            action: () => modal.remove()
        }];
    }
    
    // Create action buttons HTML
    const actionButtons = actions.map(action => 
        `<button type="button" class="btn ${action.class || 'btn-secondary'}" data-action="${actions.indexOf(action)}">
            ${action.icon ? `<i class="${action.icon}"></i> ` : ''}${action.text}
        </button>`
    ).join('');
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header ${headerClass}">
                <h2><i class="${icon}"></i> ${title}</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p class="message-text">${message}</p>
                <div class="form-actions">
                    ${actionButtons}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => modal.remove());
    
    // Handle action buttons
    const actionBtns = modal.querySelectorAll('[data-action]');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const actionIndex = parseInt(btn.getAttribute('data-action'));
            const action = actions[actionIndex];
            if (action.action) {
                action.action();
            } else {
                modal.remove();
            }
        });
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

// Convenience functions for different message types
function showSuccessMessage(message, title = 'Success') {
    return showModalMessage(message, 'success', title);
}

function showErrorMessage(message, title = 'Error') {
    return showModalMessage(message, 'error', title);
}

function showWarningMessage(message, title = 'Warning') {
    return showModalMessage(message, 'warning', title);
}

function showInfoMessage(message, title = 'Information') {
    return showModalMessage(message, 'info', title);
}

function showConfirmMessage(message, onConfirm, onCancel, title = 'Confirm') {
    const actions = [
        {
            text: 'Cancel',
            class: 'btn-secondary',
            action: () => {
                if (onCancel) onCancel();
                document.querySelector('.message-modal').remove();
            }
        },
        {
            text: 'Confirm',
            class: 'btn-primary',
            action: () => {
                if (onConfirm) onConfirm();
                document.querySelector('.message-modal').remove();
            }
        }
    ];
    return showModalMessage(message, 'warning', title, actions);
} // Use same origin as the frontend

// Authentication state management
let currentUser = null;
let currentGoodsData = []; // Store all goods data for pagination
let currentGoodsOutData = []; // Store all goods out data for pagination
let currentPage = 1;
let rowsPerPage = 7;
let filteredData = []; // Store filtered data for pagination
let filteredGoodsOutData = []; // Store filtered goods out data for pagination

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

        const settingsUsername = document.getElementById('settings-username');
        if (settingsUsername) {
            settingsUsername.textContent = `${currentUser.first_name} ${currentUser.surname}`;
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
            showConfirmMessage(
                'Are you sure you want to logout?',
                () => logout(), // onConfirm
                null, // onCancel (optional)
                'Confirm Logout'
            );
        });
    }
}

// Initialize authentication on page load
window.addEventListener('load', async function() {
    const isAuthenticated = await checkAuthentication();
    if (isAuthenticated) {
        setupLogoutHandler();
        setupEventListeners();
        setupDashboardDateFilter(); // Setup dashboard date filtering
        await loadDashboardStats(); // Load dashboard statistics
        await loadGoodsInData(); // Load goods in data
        await loadLatestPrice(); // Load latest price per kg
        console.log('User authenticated successfully');
    }
});

// Price display functionality
async function loadLatestPrice() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/latest-price`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Latest price response:', data);
            
            // Show debug info if available
            if (data.debug) {
                console.log('Debug info:', data.debug);
            }
            if (data.message) {
                console.log('Price message:', data.message);
            }
            if (data.latest_row) {
                console.log('Latest row from sheet:', data.latest_row);
            }
            
            const priceElement = document.getElementById('current-price-per-kg');
            if (priceElement) {
                if (data.price > 0) {
                    priceElement.textContent = `₦${data.price.toLocaleString()}`;
                } else {
                    priceElement.textContent = '₦1,000';
                }
            }
        } else {
            console.error('Failed to fetch latest price - HTTP error:', response.status);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            const priceElement = document.getElementById('current-price-per-kg');
            if (priceElement) {
                priceElement.textContent = '₦1,000';
            }
        }
    } catch (error) {
        console.error('Error loading latest price:', error);
        const priceElement = document.getElementById('current-price-per-kg');
        if (priceElement) {
            priceElement.textContent = '₦1,000';
        }
    }
}

// Auto-refresh price every 30 seconds
setInterval(loadLatestPrice, 30000);

// Setup all event listeners
function setupEventListeners() {
    // Logout button event listener
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            showConfirmMessage(
                'Are you sure you want to logout?',
                () => logout(), // onConfirm
                null, // onCancel (optional)
                'Confirm Logout'
            );
        });
    }
    
    // Add Goods In button event listeners (multiple buttons)
    const addGoodsBtns = document.querySelectorAll('.add-goods-btn');
    addGoodsBtns.forEach(btn => {
        btn.addEventListener('click', openGoodsInModal);
    });
    
    // Add Goods Out button event listeners (multiple buttons)
    const addGoodsOutBtns = document.querySelectorAll('.add-goods-out-btn');
    addGoodsOutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Switch to the "Goods Out" tab first
            const goodsOutTabButton = document.querySelector('[data-tab="goods-out"]');
            if (goodsOutTabButton && !goodsOutTabButton.classList.contains('active')) {
                goodsOutTabButton.click();
            }
            // Then open the modal
            openGoodsOutModal();
        });
    });
    
    // Modal close button event listener
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeGoodsInModal);
    }
    
    // Goods Out modal close button event listener
    const goodsOutCloseBtn = document.querySelector('#goodsOutModal .close');
    if (goodsOutCloseBtn) {
        goodsOutCloseBtn.addEventListener('click', closeGoodsOutModal);
    }
    
    // Modal cancel button event listener
    const cancelBtn = document.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeGoodsInModal);
    }
    
    // Goods Out modal cancel button event listener
    const cancelOutBtn = document.querySelector('.cancel-out-btn');
    if (cancelOutBtn) {
        cancelOutBtn.addEventListener('click', closeGoodsOutModal);
    }
    
    // Form submit event listener
    const goodsInForm = document.getElementById('goodsInForm');
    if (goodsInForm) {
        goodsInForm.addEventListener('submit', submitGoodsIn);
    }
    
    // Goods Out form submit event listener
    const goodsOutForm = document.getElementById('goodsOutForm');
    if (goodsOutForm) {
        goodsOutForm.addEventListener('submit', submitGoodsOut);
    }

    const setPriceForm = document.getElementById('set-price-form');
    if (setPriceForm) {
        setPriceForm.addEventListener('submit', submitNewPrice);
    }

    const settingsLogoutBtn = document.getElementById('settings-logout-btn');
    if (settingsLogoutBtn) {
        settingsLogoutBtn.addEventListener('click', logout);
    }

    // Settings navigation
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    settingsNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all items and panes
            settingsNavItems.forEach(navItem => navItem.classList.remove('active'));
            document.querySelectorAll('.settings-pane').forEach(pane => pane.classList.remove('active'));

            // Add active class to clicked item and corresponding pane
            item.classList.add('active');
            const targetPaneId = item.getAttribute('data-target');
            document.getElementById(targetPaneId).classList.add('active');
        });
    });

    // Print Goods Out button event listener
    const printGoodsOutBtn = document.getElementById('print-goods-out-btn');
    if (printGoodsOutBtn) {
        printGoodsOutBtn.addEventListener('click', printGoodsOutTable);
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
    setupGoodsOutSearchAndFilter(); // Add goods out search and filter setup
    
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
        // Search filter (now includes in_id)
        const matchesSearch = !searchTerm || 
            item.in_id.toLowerCase().includes(searchTerm) ||
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
        
        // Load data based on active tab
        if (tabId === 'goods-in') {
            loadGoodsInData();
        } else if (tabId === 'goods-out') {
            loadGoodsOutData();
        }
    });
});

// Date filter buttons
document.querySelectorAll('.date-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// Helper function to get CSS class for status
function getStatusClass(status) {
    switch(status) {
        case 'paid': return 'paid';
        case 'partial': return 'partial';
        case 'unpaid': return 'unpaid';
        case 'over-paid': return 'over-paid';
        // Legacy support
        case 'completed': return 'paid';
        case 'pending': return 'partial';
        default: return 'unpaid';
    }
}

// Print Item Details Function
async function printItemDetails(inId, itemName, date) {
    // Find the item data from currentGoodsData
    const itemData = currentGoodsData.find(item => item.in_id === inId);
    
    if (!itemData) {
        showErrorMessage('Item data not found for printing.');
        return;
    }
    
    // Fetch payment history for this item
    let paymentHistory = [];
    try {
        const response = await fetch(`${API_BASE_URL}/api/payments/${inId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                paymentHistory = result.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
        }
    } catch (error) {
        console.error('Error fetching payment history for print:', error);
    }
    
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
    
    // Generate payment transactions table
    const paymentRows = paymentHistory.length > 0 
        ? paymentHistory.map(payment => `
            <tr>
                <td style="padding: 4px 8px; border-bottom: 1px solid #eee;">${formatDate(payment.created_at)}</td>
                <td style="padding: 4px 8px; border-bottom: 1px solid #eee; text-align: right;">₦${payment.amount_paid.toLocaleString()}</td>
                <td style="padding: 4px 8px; border-bottom: 1px solid #eee; font-size: 10px;">${payment.created_by || 'Unknown'}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #666; font-style: italic;">No payment transactions recorded</td></tr>';
    
    const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount_paid, 0);
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Item Details - ${itemData.in_id}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #333;
                    background: white;
                }
                
                .details-container {
                    max-width: 700px;
                    margin: 15px auto;
                    padding: 20px;
                    border: 2px solid #2b6777;
                    height: auto;
                    page-break-inside: avoid;
                }
                
                .header {
                    text-align: center;
                    border-bottom: 2px solid #2b6777;
                    padding-bottom: 12px;
                    margin-bottom: 15px;
                }
                
                .company-name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #2b6777;
                    margin-bottom: 3px;
                }
                
                .details-title {
                    font-size: 14px;
                    font-weight: bold;
                    margin: 5px 0;
                    color: #155724;
                }
                
                .details-id {
                    font-family: monospace;
                    background: #f8f9fa;
                    padding: 3px 8px;
                    border-radius: 4px;
                    display: inline-block;
                    margin: 5px 0;
                    font-size: 11px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin: 15px 0;
                }
                
                .info-section {
                    border: 1px solid #ddd;
                    padding: 12px;
                    border-radius: 6px;
                    background: #fafafa;
                }
                
                .info-title {
                    font-weight: bold;
                    color: #2b6777;
                    margin-bottom: 8px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 4px;
                    font-size: 12px;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 6px 0;
                    padding: 2px 0;
                    font-size: 11px;
                }
                
                .info-label {
                    font-weight: 500;
                    color: #555;
                    flex: 0 0 45%;
                }
                
                .info-value {
                    font-weight: 600;
                    color: #333;
                    text-align: right;
                    flex: 1;
                }
                
                .amount-highlight {
                    color: #28a745;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                .status {
                    padding: 2px 6px;
                    border-radius: 8px;
                    font-size: 9px;
                    font-weight: 500;
                    display: inline-block;
                }
                
                .payment-history {
                    grid-column: 1 / -1;
                    border: 1px solid #2b6777;
                    border-radius: 6px;
                    padding: 12px;
                    margin-top: 10px;
                    background: #f8f9fa;
                }
                
                .payment-history-title {
                    font-weight: bold;
                    color: #2b6777;
                    margin-bottom: 8px;
                    font-size: 12px;
                }
                
                .payment-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10px;
                }
                
                .payment-table th {
                    background: #2b6777;
                    color: white;
                    padding: 6px 8px;
                    text-align: left;
                    font-size: 10px;
                }
                
                .payment-table td {
                    padding: 4px 8px;
                    border-bottom: 1px solid #eee;
                }
                
                .summary-row {
                    background: #e8f4f8;
                    border: 1px solid #2b6777;
                    border-radius: 4px;
                    padding: 8px;
                    margin-top: 8px;
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    font-size: 11px;
                }
                
                .footer {
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px solid #ddd;
                    text-align: center;
                    font-size: 9px;
                    color: #666;
                }
                
                @media print {
                    .details-container {
                        margin: 0;
                        padding: 15px;
                        border: 1px solid #2b6777;
                        box-shadow: none;
                        max-width: 100%;
                        width: 100%;
                        page-break-inside: avoid;
                    }
                    
                    body {
                        font-size: 10px;
                        margin: 0;
                        padding: 10px;
                    }
                    
                    .info-grid {
                        gap: 10px;
                    }
                    
                    .info-section {
                        padding: 8px;
                    }
                    
                    .payment-history {
                        padding: 8px;
                    }
                    
                    .footer {
                        margin-top: 10px;
                        font-size: 8px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="details-container">
                <div class="header">
                    <div class="company-name">Omototo Agro-Allied Services</div>
                    <div class="details-title">ITEM DETAILS & PAYMENT HISTORY</div>
                    <div class="details-id">Item ID: ${itemData.in_id}</div>
                </div>
                
                <div class="info-grid">
                    <div class="info-section">
                        <div class="info-title">Transaction Details</div>
                        <div class="info-row">
                            <span class="info-label">Date Created:</span>
                            <span class="info-value">${formatDate(itemData.created_at)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${itemData.name}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Weight:</span>
                            <span class="info-value">${itemData.weight.toLocaleString()} kg</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Price per kg:</span>
                            <span class="info-value">₦${itemData.price_per_kg.toFixed(2)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Created by:</span>
                            <span class="info-value">${itemData.created_by}</span>
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <div class="info-title">Contact & Banking</div>
                        <div class="info-row">
                            <span class="info-label">Account No:</span>
                            <span class="info-value">${itemData.acct_no}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Bank:</span>
                            <span class="info-value">${itemData.bank}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phone Number:</span>
                            <span class="info-value">${itemData.phone_no}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value"><span class="status ${itemData.status}">${itemData.status.charAt(0).toUpperCase() + itemData.status.slice(1)}</span></span>
                        </div>
                    </div>
                    
                    <div class="payment-history">
                        <div class="payment-history-title">Payment Transaction History</div>
                        <table class="payment-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount Paid</th>
                                    <th>Processed By</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${paymentRows}
                            </tbody>
                        </table>
                        
                        <div class="summary-row">
                            <span>Total Amount: ₦${itemData.amount.toLocaleString()}</span>
                            <span>Total Paid: ₦${totalPaid.toLocaleString()}</span>
                            <span>Balance Due: ₦${(itemData.amount - totalPaid).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Generated on: ${currentDate} at ${currentTime} | Omototo Agro-Allied Services</p>
                    <p style="margin-top: 5px; font-size: 8px; color: #888;">Powered by Hemdeeii Dev 08142263056</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };
}

// Print Goods Receipt Function
function printGoodsReceipt(goodsData) {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Goods In Receipt - ${goodsData.in_id}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #333;
                    background: white;
                }
                
                .receipt-container {
                    max-width: 650px;
                    margin: 30px auto;
                    padding: 30px;
                    border: 2px solid #2b6777;
                    min-height: calc(100vh - 60px);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                
                .receipt-content {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                
                .header {
                    text-align: center;
                    border-bottom: 2px solid #2b6777;
                    padding-bottom: 20px;
                    margin-bottom: 25px;
                }
                
                .company-name {
                    font-size: 18px;
                    font-weight: bold;
                    color: #2b6777;
                    margin-bottom: 5px;
                }
                
                .receipt-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 10px 0;
                    color: #155724;
                }
                
                .receipt-id {
                    font-family: monospace;
                    background: #f8f9fa;
                    padding: 5px 10px;
                    border-radius: 4px;
                    display: inline-block;
                    margin: 10px 0;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 25px;
                    margin: 25px 0;
                }
                
                .info-section {
                    border: 1px solid #ddd;
                    padding: 20px;
                    border-radius: 8px;
                    background: #fafafa;
                }
                
                .info-title {
                    font-weight: bold;
                    color: #2b6777;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                    padding: 3px 0;
                }
                
                .info-label {
                    font-weight: 500;
                    color: #555;
                }
                
                .info-value {
                    font-weight: 600;
                    color: #333;
                }
                
                .amount-highlight {
                    color: #28a745;
                    font-size: 14px;
                }
                
                .status {
                    padding: 3px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                }
                
                .status.paid {
                    background: #d4edda;
                    color: #155724;
                }
                
                .status.partial {
                    background: #fff3cd;
                    color: #856404;
                }
                
                .status.unpaid {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                }
                
                .signature-section {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                    padding-top: 20px;
                }
                
                .signature-box {
                    width: 200px;
                    text-align: center;
                }
                
                .signature-line {
                    border-top: 1px solid #333;
                    margin-top: 30px;
                    padding-top: 5px;
                    position: relative;
                }
                
                .authorized-signature {
                    font-family: 'Brush Script MT', 'Lucida Handwriting', 'Segoe Script', cursive;
                    font-size: 24px;
                    color: #2b6777;
                    font-weight: 400;
                    transform: rotate(-2deg);
                    display: inline-block;
                    position: absolute;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%) rotate(-2deg);
                    background: white;
                    padding: 0 10px;
                }
                
                @media print {
                    .receipt-container {
                        margin: 0;
                        padding: 40px;
                        border: none;
                        box-shadow: none;
                        min-height: auto;
                        max-width: none;
                        width: 100%;
                    }
                    
                    body {
                        font-size: 11px;
                        margin: 0;
                        padding: 20px;
                    }
                    
                    .receipt-content {
                        justify-content: flex-start;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="receipt-content">
                    <div class="header">
                        <div class="company-name">Omototo Agro-Allied Services</div>
                        <div class="receipt-title">GOODS IN RECEIPT</div>
                        <div class="receipt-id">Receipt ID: ${goodsData.in_id}</div>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-section">
                            <div class="info-title">Transaction Details</div>
                            <div class="info-row">
                                <span class="info-label">Date:</span>
                                <span class="info-value">${formatDate(goodsData.created_at)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Name:</span>
                                <span class="info-value">${goodsData.name}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Weight:</span>
                                <span class="info-value">${goodsData.weight.toLocaleString()} kg</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Price per kg:</span>
                                <span class="info-value">₦${goodsData.price_per_kg.toFixed(2)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Created by:</span>
                                <span class="info-value">${goodsData.created_by}</span>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <div class="info-title">Payment Information</div>
                            <div class="info-row">
                                <span class="info-label">Account No:</span>
                                <span class="info-value">${goodsData.acct_no}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Bank:</span>
                                <span class="info-value">${goodsData.bank}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Phone:</span>
                                <span class="info-value">${goodsData.phone_no}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Total Amount:</span>
                                <span class="info-value amount-highlight">₦${goodsData.amount.toLocaleString()}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Amount Paid:</span>
                                <span class="info-value amount-highlight">₦${goodsData.amount_paid.toLocaleString()}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Status:</span>
                                <span class="info-value"><span class="status ${goodsData.status}">${goodsData.status.charAt(0).toUpperCase() + goodsData.status.slice(1)}</span></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="signature-section">
                        <div class="signature-box">
                            <div class="signature-line">Customer Signature</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line">
                                <span class="authorized-signature">Omototo</span>
                                Authorized Signature
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is a computer-generated receipt.</p>
                    <p>Printed on: ${currentDate} at ${currentTime}</p>
                    <p>Thank you for your business!</p>
                    <p style="margin-top: 8px; font-size: 9px; color: #888;">Powered by Hemdeeii Dev 08142263056</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };
}

// Helper function to format status display
function formatStatusDisplay(status) {
    switch(status) {
        case 'paid': return 'Paid';
        case 'partial': return 'Partial';
        case 'unpaid': return 'Unpaid';
        case 'over-paid': return 'Over-paid';
        // Legacy support
        case 'completed': return 'Paid';
        case 'pending': return 'Partial';
        default: return 'Unpaid';
    }
}

// View Item Details Function (enhanced from viewReceipt)
function viewItemDetails(id, date, itemName) {
    // Show a detailed modal with payment information
    showItemDetailsModal(id, date, itemName);
}

// Open Payment Modal
function openPaymentModal(inId, totalAmount, paidAmount) {
    const remaining = totalAmount - paidAmount;
    
    if (remaining <= 0) {
        showInfoMessage('This item is already fully paid.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-credit-card"></i> Make Payment</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="paymentForm">
                    <div class="form-group">
                        <label>Total Amount: <strong>₦${totalAmount.toLocaleString()}</strong></label>
                    </div>
                    <div class="form-group">
                        <label>Already Paid: <strong>₦${paidAmount.toLocaleString()}</strong></label>
                    </div>
                    <div class="form-group">
                        <label>Remaining: <strong>₦${remaining.toLocaleString()}</strong></label>
                    </div>
                    <div class="form-group">
                        <label for="payment-amount">Payment Amount *</label>
                        <input type="number" id="payment-amount" name="amount_paid" required 
                               placeholder="Enter amount to pay" step="0.01" min="0.01" max="${remaining * 2}">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary cancel-payment-btn">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-credit-card"></i> Make Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for closing modal
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.cancel-payment-btn');
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Handle payment form submission
    const paymentForm = modal.querySelector('#paymentForm');
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(paymentForm);
        const paymentAmount = parseFloat(formData.get('amount_paid'));
        
        if (paymentAmount <= 0) {
            showErrorMessage('Payment amount must be greater than 0');
            return;
        }
        
        await submitPayment(inId, paymentAmount, modal);
    });
}

// Submit Payment
async function submitPayment(inId, amount, modal) {
    const submitBtn = modal.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                in_id: inId,
                amount_paid: amount
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showSuccessMessage('Payment recorded successfully!');
            modal.remove();
            
            // Reload data to show updated status
            await loadGoodsInData();
            await loadDashboardStats();
        } else {
            showErrorMessage(result.message || 'Failed to record payment.');
        }
    } catch (error) {
        console.error('Error submitting payment:', error);
        showErrorMessage('An error occurred while processing the payment.');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Show Item Details Modal with payment history
async function showItemDetailsModal(inId, date, itemName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-eye"></i> Item Details</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <h3>${itemName}</h3>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>ID:</strong> ${inId}</p>
                
                <h4 style="margin-top: 20px; margin-bottom: 10px;">Payment History</h4>
                <div id="payment-history">
                    <p>Loading payment history...</p>
                </div>
                
                <div class="form-actions" style="margin-top: 20px;">
                    <button type="button" class="btn btn-secondary print-details-btn">
                        <i class="fas fa-print"></i> Print Details
                    </button>
                    <button type="button" class="btn btn-secondary close-modal-btn">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for closing modal
    const closeBtn = modal.querySelector('.close');
    const closeModalBtn = modal.querySelector('.close-modal-btn');
    const printDetailsBtn = modal.querySelector('.print-details-btn');
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    closeModalBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    printDetailsBtn.addEventListener('click', () => {
        printItemDetails(inId, itemName, date);
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Load payment history
    await loadPaymentHistory(inId, modal.querySelector('#payment-history'));
}

// Load Payment History
async function loadPaymentHistory(inId, container) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/payments/${inId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                displayPaymentHistory(result.data, container);
            } else {
                container.innerHTML = '<p>Failed to load payment history.</p>';
            }
        } else {
            container.innerHTML = '<p>Failed to load payment history.</p>';
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
        container.innerHTML = '<p>Error loading payment history.</p>';
    }
}

// Display Payment History
function displayPaymentHistory(payments, container) {
    if (payments.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">No payments recorded yet.</p>';
        return;
    }
    
    let totalPaid = 0;
    const paymentRows = payments
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(payment => {
            totalPaid += payment.amount_paid;
            return `
                <tr>
                    <td>${formatDate(payment.created_at)}</td>
                    <td>₦${payment.amount_paid.toLocaleString()}</td>
                    <td>${payment.created_by || 'Unknown'}</td>
                </tr>
            `;
        }).join('');
    
    container.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong>Total Paid: ₦${totalPaid.toLocaleString()}</strong>
        </div>
        <div class="table-container">
            <table style="width: 100%;">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>By</th>
                    </tr>
                </thead>
                <tbody>
                    ${paymentRows}
                </tbody>
            </table>
        </div>
    `;
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

// Goods Out Modal Functions
function openGoodsOutModal() {
    document.getElementById('goodsOutModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeGoodsOutModal() {
    document.getElementById('goodsOutModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
    document.getElementById('goodsOutForm').reset(); // Clear form
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
        paid_amount: parseFloat(formData.get('paid_amount')) || 0
    };
    
    // Validate required fields (paid_amount is now optional)
    if (!goodsData.name || !goodsData.weight || !goodsData.acct_no || 
        !goodsData.bank || !goodsData.phone_no) {
        showErrorMessage('Please fill in all required fields.');
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
            const totalAmount = result.data.amount.toLocaleString();
            const paidAmount = result.data.amount_paid.toLocaleString();
            const status = result.data.status;
            const inId = result.data.in_id;
            
            // Create enhanced success message with styling
            const successMessage = `
                <div style="background: linear-gradient(135deg, #e8f5e8, #f0f9f0); padding: 20px; border-radius: 12px; border-left: 4px solid #28a745; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <i class="fas fa-check-circle" style="color: #28a745; font-size: 24px; margin-right: 12px;"></i>
                        <h3 style="margin: 0; color: #155724; font-size: 18px;">Goods Record Saved Successfully!</h3>
                    </div>
                    
                    <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 15px; font-size: 14px;">
                            <strong style="color: #2b6777;">Record ID:</strong>
                            <span style="font-family: monospace; background: #f8f9fa; padding: 2px 6px; border-radius: 4px; color: #495057;">${inId}</span>
                            
                            <strong style="color: #2b6777;">Total Amount:</strong>
                            <span style="color: #28a745; font-weight: 600;">₦${totalAmount}</span>
                            
                            <strong style="color: #2b6777;">Amount Paid:</strong>
                            <span style="color: #007bff; font-weight: 600;">₦${paidAmount}</span>
                            
                            <strong style="color: #2b6777;">Status:</strong>
                            <span class="status ${status}" style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px; padding: 10px; background: rgba(43, 103, 119, 0.1); border-radius: 6px; font-size: 13px; color: #2b6777;">
                        <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
                        <strong>Note:</strong> You can search for this record using the ID: <code style="background: #fff; padding: 1px 4px; border-radius: 3px;">${inId}</code>
                    </div>
                </div>
            `;
            
            const actions = [
                {
                    text: 'Print Receipt',
                    class: 'btn-secondary',
                    icon: 'fas fa-print',
                    action: () => {
                        printGoodsReceipt(result.data);
                        document.querySelector('.message-modal').remove();
                    }
                },
                {
                    text: 'OK',
                    class: 'btn-primary',
                    action: () => document.querySelector('.message-modal').remove()
                }
            ];
            
            showModalMessage(successMessage, 'success', 'Success', actions);
            
            // Reset form and close modal
            closeGoodsInModal();
            
            // Reload data to show new record
            await loadGoodsInData();
            await loadDashboardStats();
        } else {
            showErrorMessage(result.message || 'Failed to save goods record.');
        }
    } catch (error) {
        console.error('Error submitting goods data:', error);
        showErrorMessage('An error occurred while saving the record.');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Submit Goods Out Form
async function submitGoodsOut(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const goodsOutData = {
        loader: formData.get('loader'),
        company: formData.get('company'),
        weight: parseFloat(formData.get('weight')),
        truck_no: formData.get('truck_no'),
        driver_no: formData.get('driver_no'),
        delivered_weight: parseFloat(formData.get('delivered_weight'))
    };
    
    // Validate required fields
    if (!goodsOutData.loader || !goodsOutData.weight || !goodsOutData.truck_no || 
        !goodsOutData.driver_no || !goodsOutData.delivered_weight) {
        showErrorMessage('Please fill in all required fields.');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/goods-out`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(goodsOutData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            const weightDiff = goodsOutData.delivered_weight - goodsOutData.weight;
            const weightDiffText = weightDiff > 0 ? `+${weightDiff.toFixed(2)}` : weightDiff.toFixed(2);
            const weightDiffColor = weightDiff > 0 ? '#28a745' : (weightDiff < 0 ? '#dc3545' : '#6c757d');
            const weightDiffIcon = weightDiff > 0 ? 'fas fa-arrow-up' : (weightDiff < 0 ? 'fas fa-arrow-down' : 'fas fa-equals');
            
            const successMessage = `
                <div style="text-align: center; padding: 20px 0">
                    <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                        <i class="fas fa-truck-loading" style="font-size: 2.5em; margin-bottom: 10px; display: block;"></i>
                        <h3 style="margin: 0 0 5px 0; font-size: 1.4em;">🎉 Goods Out Record Created Successfully!</h3>
                        <p style="margin: 0; opacity: 0.9; font-size: 0.95em;">Your shipment has been logged and is ready for processing</p>
                    </div>
                    
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 15px 0; border-left: 4px solid #28a745;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left;">
                            <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="color: #6c757d; font-size: 0.85em; margin-bottom: 4px;">📋 RECORD ID</div>
                                <div style="font-weight: bold; color: #495057; font-family: monospace;">${result.data.out_id}</div>
                            </div>
                            <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="color: #6c757d; font-size: 0.85em; margin-bottom: 4px;">👤 LOADER</div>
                                <div style="font-weight: bold; color: #495057;">${result.data.loader}</div>
                            </div>
                            <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="color: #6c757d; font-size: 0.85em; margin-bottom: 4px;">⚖️ ORIGINAL WEIGHT</div>
                                <div style="font-weight: bold; color: #495057;">${result.data.weight.toLocaleString()} kg</div>
                            </div>
                            <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="color: #6c757d; font-size: 0.85em; margin-bottom: 4px;">📦 DELIVERED WEIGHT</div>
                                <div style="font-weight: bold; color: #495057;">${result.data.delivered_weight.toLocaleString()} kg</div>
                            </div>
                            <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="color: #6c757d; font-size: 0.85em; margin-bottom: 4px;">🚛 TRUCK NUMBER</div>
                                <div style="font-weight: bold; color: #495057;">${result.data.truck_no}</div>
                            </div>
                            <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="color: #6c757d; font-size: 0.85em; margin-bottom: 4px;">🚗 DRIVER NUMBER</div>
                                <div style="font-weight: bold; color: #495057;">${result.data.driver_no}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, ${weightDiffColor}, ${weightDiffColor}dd); color: white; padding: 15px; border-radius: 10px; margin: 15px 0; box-shadow: 0 3px 10px rgba(0,0,0,0.2);">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                            <i class="${weightDiffIcon}" style="font-size: 1.2em;"></i>
                            <span style="font-weight: bold; font-size: 1.1em;">Weight Difference: ${weightDiffText} kg</span>
                        </div>
                        <div style="opacity: 0.9; font-size: 0.9em; margin-top: 5px;">
                            ${weightDiff > 0 ? '✅ Delivered more than expected' : weightDiff < 0 ? '⚠️ Delivered less than expected' : '✅ Exact weight delivered'}
                        </div>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #2196f3;">
                        <div style="color: #1976d2; font-size: 0.9em; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-search" style="font-size: 1em;"></i>
                            <span><strong>Quick Tip:</strong> Use ID <code style="background: white; padding: 2px 6px; border-radius: 4px; color: #495057; font-family: monospace;">${result.data.out_id}</code> to search for this record</span>
                        </div>
                    </div>
                </div>
            `;
            
            const actions = [
                {
                    text: '🎯 View Records',
                    class: 'btn-secondary',
                    icon: 'fas fa-list',
                    action: () => {
                        document.querySelector('.message-modal').remove();
                        // Switch to goods out tab if not already there
                        const goodsOutTab = document.querySelector('[data-tab="goods-out"]');
                        if (goodsOutTab && !goodsOutTab.classList.contains('active')) {
                            goodsOutTab.click();
                        }
                    }
                },
                {
                    text: '✅ Perfect!',
                    class: 'btn-primary',
                    action: () => document.querySelector('.message-modal').remove()
                }
            ];
            
            showModalMessage(successMessage, 'success', 'Success', actions);
            
            // Reset form and close modal
            closeGoodsOutModal();
            
            // Reload data to show new record
            await loadGoodsOutData();
            await loadDashboardStats();
        } else {
            showErrorMessage(result.message || 'Failed to save goods out record.');
        }
    } catch (error) {
        console.error('Error submitting goods out data:', error);
        showErrorMessage('An error occurred while saving the record.');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('goodsInModal');
    const goodsOutModal = document.getElementById('goodsOutModal');
    if (event.target === modal) {
        closeGoodsInModal();
    }
    if (event.target === goodsOutModal) {
        closeGoodsOutModal();
    }
});

// Data Loading Functions

// Date filter state for dashboard
let currentDateFilter = {
    type: 'today',
    startDate: null,
    endDate: null
};

// Load dashboard summary data
async function loadDashboardData() {
    await loadDashboardStats();
}

// Load dashboard statistics with date filtering
async function loadDashboardStats() {
    try {
        // Build query parameters based on current filter
        const params = new URLSearchParams();
        
        if (currentDateFilter.startDate) {
            params.append('start_date', currentDateFilter.startDate);
        }
        
        if (currentDateFilter.endDate) {
            params.append('end_date', currentDateFilter.endDate);
        }
        
        const url = `${API_BASE_URL}/api/dashboard-stats${params.toString() ? '?' + params.toString() : ''}`;
        console.log('Loading dashboard stats from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateDashboardStatCards(result.data);
            } else {
                console.error('Failed to load dashboard stats:', result.message);
            }
        } else {
            console.error('Failed to load dashboard stats - HTTP error:', response.status);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Update dashboard stat cards with real data
function updateDashboardStatCards(data) {
    // Update Total Weight In
    const weightInElement = document.getElementById('total-weight-in');
    if (weightInElement) {
        weightInElement.textContent = `${data.totalWeightIn.toLocaleString()} kg`;
    }
    
    // Update Total Weight Out
    const weightOutElement = document.getElementById('total-weight-out');
    if (weightOutElement) {
        weightOutElement.textContent = `${data.totalWeightOut.toLocaleString()} kg`;
    }
    
    // Update Amount Paid
    const amountPaidElement = document.getElementById('amount-paid');
    if (amountPaidElement) {
        amountPaidElement.textContent = `₦${data.amountPaid.toLocaleString()}`;
    }
}

// Helper function to get date range based on filter type
function getDateRange(filterType) {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    switch (filterType) {
        case 'today':
            return {
                startDate: startOfToday.toISOString().split('T')[0],
                endDate: endOfToday.toISOString().split('T')[0]
            };
            
        case 'week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0);
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
            endOfWeek.setHours(23, 59, 59, 999);
            
            return {
                startDate: startOfWeek.toISOString().split('T')[0],
                endDate: endOfWeek.toISOString().split('T')[0]
            };
            
        case 'month':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            
            return {
                startDate: startOfMonth.toISOString().split('T')[0],
                endDate: endOfMonth.toISOString().split('T')[0]
            };
            
        default:
            return {
                startDate: null,
                endDate: null
            };
    }
}

// Setup dashboard date filter event listeners
function setupDashboardDateFilter() {
    // Date filter buttons
    const dateButtons = document.querySelectorAll('.date-btn');
    dateButtons.forEach(button => {
        button.addEventListener('click', async () => {
            // Remove active class from all buttons
            dateButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            const filterType = button.getAttribute('data-range');
            
            if (filterType === 'custom') {
                // Show custom date inputs
                const customInputs = document.getElementById('custom-date-inputs');
                if (customInputs) {
                    customInputs.style.display = 'block';
                }
                // Don't update filter yet, wait for Apply button
                return;
            } else {
                // Hide custom date inputs
                const customInputs = document.getElementById('custom-date-inputs');
                if (customInputs) {
                    customInputs.style.display = 'none';
                }
                
                // Update filter and reload data
                const dateRange = getDateRange(filterType);
                currentDateFilter = {
                    type: filterType,
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                };
                
                await loadDashboardStats();
            }
        });
    });
    
    // Apply custom filter button
    const applyCustomBtn = document.getElementById('apply-custom-filter');
    if (applyCustomBtn) {
        applyCustomBtn.addEventListener('click', async () => {
            const startDateInput = document.getElementById('dashboard-start-date');
            const endDateInput = document.getElementById('dashboard-end-date');
            
            const startDate = startDateInput ? startDateInput.value : null;
            const endDate = endDateInput ? endDateInput.value : null;
            
            if (!startDate && !endDate) {
                showWarningMessage('Please select at least one date.');
                return;
            }
            
            // Update filter and reload data
            currentDateFilter = {
                type: 'custom',
                startDate: startDate,
                endDate: endDate
            };
            
            await loadDashboardStats();
        });
    }
    
    // Reload app button
    const reloadBtn = document.getElementById('reload-app-btn');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            showConfirmMessage(
                'Are you sure you want to reload the application? Any unsaved changes will be lost.',
                () => window.location.reload(), // onConfirm
                null, // onCancel (optional)
                'Confirm Reload'
            );
        });
    }
    
    // Print dashboard button
    const printBtn = document.getElementById('print-dashboard-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            printDashboardReport();
        });
    }
    
    // Initialize with today's filter
    const todayRange = getDateRange('today');
    currentDateFilter = {
        type: 'today',
        startDate: todayRange.startDate,
        endDate: todayRange.endDate
    };
}

// Print Dashboard Report Function
async function printDashboardReport() {
    try {
        // Get current stats
        const statsResponse = await fetch(`${API_BASE_URL}/api/dashboard-stats${buildDateFilterParams()}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        let stats = {
            totalWeightIn: 0,
            totalWeightOut: 0,
            amountPaid: 0,
            amountGenerated: 0,
            profit: 0
        };
        
        if (statsResponse.ok) {
            const statsResult = await statsResponse.json();
            if (statsResult.success) {
                stats = statsResult.data;
            }
        }
        
        // Get filtered goods data
        const goodsResponse = await fetch(`${API_BASE_URL}/api/goods-in`, {
            method: 'GET',
            credentials: 'include'
        });
        
        let goodsData = [];
        if (goodsResponse.ok) {
            const goodsResult = await goodsResponse.json();
            if (goodsResult.success) {
                // Filter goods data by current date filter
                goodsData = filterGoodsDataByDate(goodsResult.data);
            }
        }
        
        // Generate and print the report
        generateDashboardPrintReport(stats, goodsData);
        
    } catch (error) {
        console.error('Error generating dashboard report:', error);
        showErrorMessage('Failed to generate dashboard report.');
    }
}

// Helper function to build date filter query parameters
function buildDateFilterParams() {
    const params = new URLSearchParams();
    
    if (currentDateFilter.startDate) {
        params.append('start_date', currentDateFilter.startDate);
    }
    
    if (currentDateFilter.endDate) {
        params.append('end_date', currentDateFilter.endDate);
    }
    
    return params.toString() ? '?' + params.toString() : '';
}

// Helper function to filter goods data by current date filter
function filterGoodsDataByDate(data) {
    if (!currentDateFilter.startDate && !currentDateFilter.endDate) {
        return data;
    }
    
    const startDate = currentDateFilter.startDate ? new Date(currentDateFilter.startDate) : null;
    const endDate = currentDateFilter.endDate ? new Date(currentDateFilter.endDate) : null;
    
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);
    
    return data.filter(item => {
        if (!item.created_at) return false;
        
        const itemDate = new Date(item.created_at);
        if (isNaN(itemDate.getTime())) return false;
        
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        
        return true;
    });
}

// Generate and print dashboard report
function generateDashboardPrintReport(stats, goodsData) {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
    
    // Format date range for display
    let dateRangeText = 'All Records';
    if (currentDateFilter.startDate || currentDateFilter.endDate) {
        const startText = currentDateFilter.startDate ? formatDateForDisplay(currentDateFilter.startDate) : 'Beginning';
        const endText = currentDateFilter.endDate ? formatDateForDisplay(currentDateFilter.endDate) : 'Present';
        
        if (currentDateFilter.startDate && currentDateFilter.endDate) {
            // Both dates available
            if (currentDateFilter.startDate === currentDateFilter.endDate) {
                dateRangeText = startText; // Single date
            } else {
                dateRangeText = `${startText} to ${endText}`;
            }
        } else if (currentDateFilter.startDate) {
            dateRangeText = `From ${startText}`;
        } else if (currentDateFilter.endDate) {
            dateRangeText = `Until ${endText}`;
        }
    }
    
    // Generate goods table rows
    const goodsRows = goodsData.length > 0 
        ? goodsData.map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px;">${formatDate(item.created_at)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px;">${item.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 11px;">${item.weight.toLocaleString()} kg</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 11px;">₦${item.price_per_kg.toFixed(2)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 11px;">₦${item.amount.toLocaleString()}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 11px;">₦${(item.pay_made || 0).toLocaleString()}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">${item.acct_no}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">${item.bank}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 10px;">
                    <span style="padding: 2px 6px; border-radius: 8px; font-size: 9px; background: ${getStatusColor(item.status)}; color: white;">
                        ${formatStatusDisplay(item.status)}
                    </span>
                </td>
            </tr>
        `).join('')
        : '<tr><td colspan="9" style="padding: 20px; text-align: center; color: #666; font-style: italic;">No records found for the selected date range</td></tr>';
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dashboard Report - ${dateRangeText}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #333;
                    background: white;
                    margin: 20px;
                }
                
                .report-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                }
                
                .header {
                    text-align: center;
                    border-bottom: 2px solid #2b6777;
                    padding-bottom: 20px;
                    margin-bottom: 25px;
                }
                
                .company-name {
                    font-size: 20px;
                    font-weight: bold;
                    color: #2b6777;
                    margin-bottom: 5px;
                }
                
                .report-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 10px 0;
                    color: #155724;
                }
                
                .date-range {
                    font-size: 14px;
                    color: #666;
                    margin: 5px 0;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin: 25px 0;
                }
                
                .stat-card {
                    background: linear-gradient(135deg, #2b6777, #52ab98);
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                }
                
                .stat-value {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .stat-label {
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                .profit-positive {
                    background: linear-gradient(135deg, #28a745, #20c997) !important;
                }
                
                .profit-negative {
                    background: linear-gradient(135deg, #dc3545, #e74c3c) !important;
                }
                
                .goods-section {
                    margin-top: 30px;
                }
                
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #2b6777;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 8px;
                }
                
                .goods-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                }
                
                .goods-table th {
                    background: #2b6777;
                    color: white;
                    padding: 10px 8px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: 600;
                }
                
                .goods-table td {
                    padding: 8px;
                    border-bottom: 1px solid #eee;
                    font-size: 11px;
                }
                
                .goods-table tr:nth-child(even) {
                    background: #f8f9fa;
                }
                
                .summary {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 20px;
                    border-left: 4px solid #2b6777;
                }
                
                .summary-title {
                    font-weight: bold;
                    color: #2b6777;
                    margin-bottom: 10px;
                }
                
                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                    font-size: 12px;
                }
                
                .footer {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid #ddd;
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                }
                
                @media print {
                    body {
                        margin: 0;
                        font-size: 10px;
                    }
                    
                    .report-container {
                        padding: 15px;
                        max-width: 100%;
                    }
                    
                    .stats-grid {
                        grid-template-columns: repeat(5, 1fr);
                        gap: 10px;
                    }
                    
                    .stat-card {
                        padding: 10px;
                    }
                    
                    .goods-table th,
                    .goods-table td {
                        padding: 6px 4px;
                        font-size: 9px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <div class="company-name">Omototo Agro-Allied Services</div>
                    <div class="report-title">DASHBOARD REPORT</div>
                    <div class="date-range">Period: ${dateRangeText}</div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalWeightIn.toLocaleString()} kg</div>
                        <div class="stat-label">Total Weight In</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalWeightOut.toLocaleString()} kg</div>
                        <div class="stat-label">Total Weight Out</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">₦${stats.amountPaid.toLocaleString()}</div>
                        <div class="stat-label">Amount Paid</div>
                    </div>
                </div>
                
                <div class="goods-section">
                    <div class="section-title">Goods In Records (${goodsData.length} records)</div>
                    <table class="goods-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Name</th>
                                <th>Weight</th>
                                <th>Price/kg</th>
                                <th>Amount</th>
                                <th>Paid</th>
                                <th>Account</th>
                                <th>Bank</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${goodsRows}
                        </tbody>
                    </table>
                </div>
                
                <div class="summary">
                    <div class="summary-title">Summary</div>
                    <div class="summary-item">
                        <span>Total Records:</span>
                        <strong>${goodsData.length}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Total Weight:</span>
                        <strong>${goodsData.reduce((sum, item) => sum + item.weight, 0).toLocaleString()} kg</strong>
                    </div>
                    <div class="summary-item">
                        <span>Total Amount:</span>
                        <strong>₦${goodsData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Total Paid:</span>
                        <strong>₦${goodsData.reduce((sum, item) => sum + (item.pay_made || 0), 0).toLocaleString()}</strong>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Generated on: ${currentDate} at ${currentTime}</p>
                    <p style="margin-top: 5px; font-size: 9px; color: #888;">Powered by Hemdeeii Dev 08142263056</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };
}

// Helper function to get status color for print
function getStatusColor(status) {
    switch(status) {
        case 'paid': return '#28a745';
        case 'partial': return '#ffc107';
        case 'unpaid': return '#dc3545';
        case 'over-paid': return '#17a2b8';
        default: return '#6c757d';
    }
}

// Helper function to format date for display (DD/MM/YYYY)
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
    
    // Update Total Amount (replacing Debt with Total Amount)
    const totalElement = document.querySelector('.metric-card:nth-child(4) .metric-value');
    if (totalElement) {
        totalElement.textContent = `₦${(data.totalAmount || 0).toLocaleString()}`;
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
    
    // Store data globally for pagination and sort by created_at (newest first)
    currentGoodsData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    filteredData = currentGoodsData; // Initially, filtered data is same as all data
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
                <td colspan="10" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-box-open" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    No transaction in records found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    // Use pageData directly since sorting is already done at the data level
    pageData.forEach(item => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(item.created_at);
        const statusClass = getStatusClass(item.status);
        
        // Store in_id as data attribute for reference but don't display it
        row.setAttribute('data-in-id', item.in_id);
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.name}</td>
            <td>${item.weight.toLocaleString()}</td>
            <td>₦${item.price_per_kg.toFixed(2)}</td>
            <td>₦${item.amount.toLocaleString()}</td>
            <td>₦${(item.pay_made || 0).toLocaleString()}</td>
            <td>${item.acct_no}</td>
            <td>${item.bank}</td>
            <td><span class="status ${statusClass}">${formatStatusDisplay(item.status)}</span></td>
            <td>
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="view-btn" data-id="${item.in_id}" data-date="${formattedDate}" data-item="${item.name}" title="View Details">
                        <i class="fas fa-eye"></i>
                        <span>View</span>
                    </button>
                    ${item.status !== 'paid' && item.status !== 'over-paid' ? 
                        `<button class="pay-btn" data-id="${item.in_id}" data-amount="${item.amount}" data-paid="${item.pay_made || 0}" title="Make Payment">
                            <i class="fas fa-credit-card"></i>
                            <span>Pay</span>
                        </button>` : ''}
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Re-attach event listeners for action buttons
    const viewButtons = tbody.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            const item = this.getAttribute('data-item');
            const id = this.getAttribute('data-id');
            viewItemDetails(id, date, item);
        });
    });
    
    const payButtons = tbody.querySelectorAll('.pay-btn');
    payButtons.forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const amount = parseFloat(this.getAttribute('data-amount'));
            const paid = parseFloat(this.getAttribute('data-paid'));
            openPaymentModal(id, amount, paid);
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
        const statusClass = getStatusClass(item.status);
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><span style="color: green;">In</span></td>
            <td>${item.weight.toLocaleString()}</td>
            <td>₦${item.amount.toLocaleString()}</td>
            <td><span class="status ${statusClass}">${formatStatusDisplay(item.status)}</span></td>
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

// Load goods out data
async function loadGoodsOutData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/goods-out`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateGoodsOutTable(result.data);
            }
        } else {
            console.error('Failed to load goods out data');
        }
    } catch (error) {
        console.error('Error loading goods out data:', error);
    }
}

// Update goods out table with real data
function updateGoodsOutTable(data) {
    const tbody = document.querySelector('#goods-out tbody');
    if (!tbody) return;
    
    // Store data globally for pagination and sort by created_at (newest first)
    currentGoodsOutData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    filteredGoodsOutData = currentGoodsOutData; // Initially, filtered data is same as all data
    currentPage = 1; // Reset to first page
    
    renderGoodsOutTablePage();
    updateGoodsOutPaginationControls();
}

// Render current page of goods out table data
function renderGoodsOutTablePage() {
    const tbody = document.querySelector('#goods-out tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (filteredGoodsOutData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-truck-loading" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    No goods out records found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredGoodsOutData.slice(startIndex, endIndex);
    
    // Render table rows
    pageData.forEach(item => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(item.created_at);
        
        // Calculate weight difference
        const weightDiff = (item.delivered_weight || 0) - (item.weight || 0);
        const weightDiffFormatted = weightDiff > 0 ? `+${weightDiff.toFixed(2)}` : weightDiff.toFixed(2);
        const weightDiffColor = weightDiff > 0 ? '#28a745' : (weightDiff < 0 ? '#dc3545' : '#666');
        
        // Store out_id as data attribute for reference
        row.setAttribute('data-out-id', item.out_id);
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.loader}</td>
            <td>${(item.weight || 0).toLocaleString()}</td>
            <td>${item.truck_no}</td>
            <td>${item.driver_no}</td>
            <td>${(item.delivered_weight || 0).toLocaleString()}</td>
            <td style="color: ${weightDiffColor}; font-weight: 500;">${weightDiffFormatted}</td>
            <td>
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="view-btn" data-id="${item.out_id}" title="View Details">
                        <i class="fas fa-eye"></i>
                        <span>View</span>
                    </button>
                    <button class="print-btn" data-id="${item.out_id}" title="Print Receipt">
                        <i class="fas fa-print"></i>
                        <span>Print</span>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Re-attach event listeners for action buttons
    const viewButtons = tbody.querySelectorAll('.view-btn');
    const printButtons = tbody.querySelectorAll('.print-btn');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const outId = e.currentTarget.getAttribute('data-id');
            viewGoodsOutDetails(outId);
        });
    });
    
    printButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const outId = e.currentTarget.getAttribute('data-id');
            printGoodsOutReceipt(outId);
        });
    });
}

// Update goods out pagination controls
function updateGoodsOutPaginationControls() {
    const paginationContainer = document.querySelector('#goods-out .pagination');
    if (!paginationContainer) return;
    
    // Calculate pagination info
    const totalRecords = filteredGoodsOutData.length;
    const totalPages = Math.ceil(totalRecords / rowsPerPage);
    
    // Clear existing pagination
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return; // Don't show pagination if only one page
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderGoodsOutTablePage();
            updateGoodsOutPaginationControls();
        }
    });
    paginationContainer.appendChild(prevBtn);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderGoodsOutTablePage();
            updateGoodsOutPaginationControls();
        });
        paginationContainer.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderGoodsOutTablePage();
            updateGoodsOutPaginationControls();
        }
    });
    paginationContainer.appendChild(nextBtn);
    
    // Add page info
    const startRecord = Math.min((currentPage - 1) * rowsPerPage + 1, totalRecords);
    const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);
    const pageInfo = document.createElement('div');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
    paginationContainer.appendChild(pageInfo);
}

// Goods out search and filter functionality
function setupGoodsOutSearchAndFilter() {
    const searchInput = document.getElementById('goods-out-search');
    const startDateInput = document.getElementById('out-start-date');
    const endDateInput = document.getElementById('out-end-date');
    const clearFiltersBtn = document.getElementById('clear-out-filters');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterGoodsOutTable);
    }
    
    if (startDateInput) {
        startDateInput.addEventListener('change', filterGoodsOutTable);
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', filterGoodsOutTable);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearGoodsOutFilters);
    }
}

// Filter goods out table
function filterGoodsOutTable() {
    const searchTerm = document.getElementById('goods-out-search')?.value.toLowerCase() || '';
    const startDate = document.getElementById('out-start-date')?.value || '';
    const endDate = document.getElementById('out-end-date')?.value || '';
    
    // Filter the data
    filteredGoodsOutData = currentGoodsOutData.filter(item => {
        // Search filter
        const matchesSearch = !searchTerm || 
            item.out_id.toLowerCase().includes(searchTerm) ||
            item.loader.toLowerCase().includes(searchTerm) ||
            (item.company && item.company.toLowerCase().includes(searchTerm)) ||
            item.truck_no.toLowerCase().includes(searchTerm) ||
            item.driver_no.toLowerCase().includes(searchTerm) ||
            item.weight.toString().includes(searchTerm) ||
            item.delivered_weight.toString().includes(searchTerm);
        
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
    renderGoodsOutTablePage();
    updateGoodsOutPaginationControls();
}

// Clear goods out filters
function clearGoodsOutFilters() {
    // Clear search input
    const searchInput = document.getElementById('goods-out-search');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Clear date inputs
    const startDateInput = document.getElementById('out-start-date');
    if (startDateInput) {
        startDateInput.value = '';
    }
    
    const endDateInput = document.getElementById('out-end-date');
    if (endDateInput) {
        endDateInput.value = '';
    }
    
    // Reset filtered data to all data
    filteredGoodsOutData = currentGoodsOutData;
    currentPage = 1;
    
    // Re-render table and pagination
    renderGoodsOutTablePage();
    updateGoodsOutPaginationControls();
}

// View goods out details
function viewGoodsOutDetails(outId) {
    // Find the specific goods out record
    const goodsOutData = currentGoodsOutData.find(item => item.out_id === outId);
    
    if (!goodsOutData) {
        showErrorMessage('Goods out record not found.');
        return;
    }
    
    // Calculate weight difference
    const weightDiff = (goodsOutData.delivered_weight || 0) - (goodsOutData.weight || 0);
    const weightDiffFormatted = weightDiff > 0 ? `+${weightDiff.toFixed(2)} kg` : `${weightDiff.toFixed(2)} kg`;
    const weightDiffColor = weightDiff > 0 ? '#28a745' : (weightDiff < 0 ? '#dc3545' : '#666');
    
    const modalContent = `
        <div style="max-width: 600px; margin: 0 auto;">
            <div class="info-section">
                <div class="info-title">Shipment Information</div>
                <div class="info-row">
                    <span class="info-label">Out ID:</span>
                    <span class="info-value">${goodsOutData.out_id}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${formatDate(goodsOutData.created_at)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Loader:</span>
                    <span class="info-value">${goodsOutData.loader}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Company:</span>
                    <span class="info-value">${goodsOutData.company || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Created by:</span>
                    <span class="info-value">${goodsOutData.created_by}</span>
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-title">Weight Information</div>
                <div class="info-row">
                    <span class="info-label">Original Weight:</span>
                    <span class="info-value">${(goodsOutData.weight || 0).toLocaleString()} kg</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Delivered Weight:</span>
                    <span class="info-value">${(goodsOutData.delivered_weight || 0).toLocaleString()} kg</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Weight Difference:</span>
                    <span class="info-value" style="color: ${weightDiffColor}; font-weight: 600;">${weightDiffFormatted}</span>
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-title">Transport Information</div>
                <div class="info-row">
                    <span class="info-label">Truck Number:</span>
                    <span class="info-value">${goodsOutData.truck_no}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Driver Number:</span>
                    <span class="info-value">${goodsOutData.driver_no}</span>
                </div>
            </div>
        </div>
    `;
    
    showModalMessage(modalContent, 'info', 'Goods Out Details', [
        {
            text: 'Print Receipt',
            class: 'btn-secondary',
            icon: 'fas fa-print',
            action: () => {
                document.querySelector('.message-modal').remove();
                printGoodsOutReceipt(outId);
            }
        },
        {
            text: 'Close',
            class: 'btn-primary',
            action: () => document.querySelector('.message-modal').remove()
        }
    ]);
}

// Print goods out receipt
function printGoodsOutReceipt(outId) {
    // Find the specific goods out record
    const goodsOutData = currentGoodsOutData.find(item => item.out_id === outId);
    
    if (!goodsOutData) {
        showErrorMessage('Goods out record not found.');
        return;
    }
    
    // Calculate weight difference
    const weightDiff = (goodsOutData.delivered_weight || 0) - (goodsOutData.weight || 0);
    const weightDiffFormatted = weightDiff > 0 ? `+${weightDiff.toFixed(2)} kg` : `${weightDiff.toFixed(2)} kg`;
    
    // Create print content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Goods Out Receipt - ${goodsOutData.out_id}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .receipt-title { font-size: 18px; color: #666; }
                .section { margin-bottom: 25px; }
                .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .label { font-weight: 500; }
                .value { font-weight: normal; }
                .highlight { background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #2b6777; }
                .weight-diff { font-weight: bold; color: ${weightDiff > 0 ? '#28a745' : (weightDiff < 0 ? '#dc3545' : '#666')}; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 20px; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">WAREHOUSE MANAGEMENT SYSTEM</div>
                <div class="receipt-title">Goods Out Receipt</div>
            </div>
            
            <div class="section">
                <div class="section-title">Shipment Information</div>
                <div class="info-row">
                    <span class="label">Out ID:</span>
                    <span class="value">${goodsOutData.out_id}</span>
                </div>
                <div class="info-row">
                    <span class="label">Date:</span>
                    <span class="value">${formatDate(goodsOutData.created_at)}</span>
                </div>
                <div class="info-row">
                    <span class="label">Loader:</span>
                    <span class="value">${goodsOutData.loader}</span>
                </div>
                <div class="info-row">
                    <span class="label">Company:</span>
                    <span class="value">${goodsOutData.company || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Created by:</span>
                    <span class="value">${goodsOutData.created_by}</span>
                </div>
            </div>
            
            <div class="section highlight">
                <div class="section-title">Weight Information</div>
                <div class="info-row">
                    <span class="label">Original Weight:</span>
                    <span class="value">${(goodsOutData.weight || 0).toLocaleString()} kg</span>
                </div>
                <div class="info-row">
                    <span class="label">Delivered Weight:</span>
                    <span class="value">${(goodsOutData.delivered_weight || 0).toLocaleString()} kg</span>
                </div>
                <div class="info-row">
                    <span class="label">Weight Difference:</span>
                    <span class="value weight-diff">${weightDiffFormatted}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Transport Information</div>
                <div class="info-row">
                    <span class="label">Truck Number:</span>
                    <span class="value">${goodsOutData.truck_no}</span>
                </div>
                <div class="info-row">
                    <span class="label">Driver Number:</span>
                    <span class="value">${goodsOutData.driver_no}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>This is a computer-generated receipt.</p>
                <p>Printed on: ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Print after content loads
    printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
    };
}

async function submitNewPrice(event) {
    event.preventDefault();
    const newPrice = document.getElementById('new-price').value;
    if (!newPrice || newPrice <= 0) {
        showErrorMessage('Please enter a valid price.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/set-price`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ price: newPrice }),
        });

        const result = await response.json();
        if (response.ok && result.success) {
            showSuccessMessage('Price updated successfully!');
            loadLatestPrice(); // Refresh the price display
            document.getElementById('set-price-form').reset();
        } else {
            showErrorMessage(result.message || 'Failed to update price.');
        }
    } catch (error) {
        console.error('Error updating price:', error);
        showErrorMessage('An error occurred while updating the price.');
    }
}

// Print Goods Out Table
function printGoodsOutTable() {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        showErrorMessage('The PDF generation library is not loaded. Please check your internet connection and try again.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const table = document.querySelector('#goods-out table');
    const headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        // Exclude the "Action" column
        if (th.innerText.toLowerCase() !== 'action') {
            headers.push(th.innerText);
        }
    });

    const body = [];
    filteredGoodsOutData.forEach(item => {
        const row = [
            formatDate(item.created_at),
            item.loader,
            item.weight.toLocaleString(),
            item.truck_no,
            item.driver_no,
            item.delivered_weight.toLocaleString(),
            ((item.delivered_weight || 0) - (item.weight || 0)).toFixed(2)
        ];
        body.push(row);
    });

    doc.autoTable({
        head: [headers],
        body: body,
        didDrawPage: function (data) {
            // Header
            const companyName = document.querySelector('.logo h1').innerText;
            const reportTitle = 'Goods Out Report';
            const reportDate = `Date: ${new Date().toLocaleDateString()}`;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(companyName, data.settings.margin.left, 20);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(reportTitle, data.settings.margin.left, 28);
            
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.text(reportDate, pageWidth - data.settings.margin.right, 28, { align: 'right' });


            // Footer
            var str = 'Page ' + doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            var pageSize = doc.internal.pageSize;
            var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.text(str, data.settings.margin.left, pageHeight - 10);
        },
        margin: { top: 30 }
    });

    doc.save('goods-out-report.pdf');
}