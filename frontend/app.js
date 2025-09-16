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
                                <span class="info-label">Goods Name:</span>
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
            await loadDashboardData();
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
                    <button type="button" class="btn btn-secondary close-modal-btn">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for closing modal
    const closeBtn = modal.querySelector('.close');
    const closeModalBtn = modal.querySelector('.close-modal-btn');
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    closeModalBtn.addEventListener('click', () => {
        modal.remove();
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
            await loadDashboardData();
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