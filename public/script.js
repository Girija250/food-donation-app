// Global Variables
let currentUser = null;
let map = null;
let foodMarkers = [];

// ==================== NAVIGATION ====================

function showWelcome() {
    hideAllScreens();
    document.getElementById('welcome-screen').classList.remove('hidden');
}

function showLogin() {
    hideAllScreens();
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-name').value = '';
    document.getElementById('login-pass').value = '';
}

function showSignup() {
    hideAllScreens();
    document.getElementById('signup-form').classList.remove('hidden');
    document.getElementById('signup-error').textContent = '';
    clearSignupForm();
}

function hideAllScreens() {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('provider-dashboard').classList.add('hidden');
    document.getElementById('receiver-dashboard').classList.add('hidden');
    document.getElementById('volunteer-history').classList.add('hidden');
}

function clearSignupForm() {
    document.getElementById('su-role').value = '';
    document.getElementById('su-name').value = '';
    document.getElementById('su-pass').value = '';
    document.getElementById('su-provider-category').classList.add('hidden');
    document.getElementById('su-receiver-category').classList.add('hidden');
    document.getElementById('su-mobile').value = '';
    document.getElementById('su-location').value = '';
}

// ==================== SIGNUP ====================

function updateSignupFields() {
    const role = document.getElementById('su-role').value;
    const providerCat = document.getElementById('su-provider-category');
    const receiverCat = document.getElementById('su-receiver-category');
    
    providerCat.classList.add('hidden');
    receiverCat.classList.add('hidden');
    
    if (role === 'provider') {
        providerCat.classList.remove('hidden');
    } else if (role === 'receiver') {
        receiverCat.classList.remove('hidden');
    }
}

async function signup() {
    const name = document.getElementById('su-name').value.trim();
    const password = document.getElementById('su-pass').value;
    const role = document.getElementById('su-role').value;
    const mobile = document.getElementById('su-mobile').value.trim();
    const location = document.getElementById('su-location').value.trim();
    
    // Get category based on role
    let category = '';
    if (role === 'provider') {
        category = document.getElementById('su-provider-category').value;
    } else if (role === 'receiver') {
        category = document.getElementById('su-receiver-category').value;
    }
    
    // Validation
    if (!name || !password || !role || !category || !mobile || !location) {
        showError('signup-error', 'All fields are required!');
        return;
    }
    
    if (password.length < 6) {
        showError('signup-error', 'Password must be at least 6 characters!');
        return;
    }
    
    // Get location coordinates (simplified - using default coordinates)
    // In real app, use geocoding API
    const lat = 19.0760 + (Math.random() - 0.5) * 0.1; // Mumbai area
    const lng = 72.8777 + (Math.random() - 0.5) * 0.1;
    
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password, role, category, mobile, location, lat, lng })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Account created successfully! Please login.');
            showLogin();
        } else {
            showError('signup-error', data.error);
        }
    } catch (error) {
        showError('signup-error', 'Error creating account: ' + error.message);
    }
}

function showError(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

// ==================== LOGIN ====================

async function login() {
    const name = document.getElementById('login-name').value.trim();
    const password = document.getElementById('login-pass').value;
    
    if (!name || !password) {
        showError('login-error', 'Please enter name and password!');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password })
        });
        
        const user = await response.json();
        
        if (response.ok) {
            currentUser = user;
            loadDashboard();
        } else {
            showError('login-error', user.error);
        }
    } catch (error) {
        showError('login-error', 'Login failed: ' + error.message);
    }
}

function logout() {
    currentUser = null;
    showWelcome();
}

// ==================== DASHBOARD ====================

function loadDashboard() {
    hideAllScreens();
    
    if (currentUser.role === 'provider') {
        document.getElementById('provider-dashboard').classList.remove('hidden');
        loadProviderDashboard();
    } else {
        document.getElementById('receiver-dashboard').classList.remove('hidden');
        loadReceiverDashboard();
    }
}

// ==================== PROVIDER DASHBOARD ====================

async function loadProviderDashboard() {
    // Set default datetime values
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('food-cooked').value = now.toISOString().slice(0, 16);
    
    const freshTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); 
        document.getElementById('food-fresh').value = freshTime.toISOString().slice(0, 16);
    
    loadMyPostedFood();
    loadProviderNotifications();
}

async function postFood() {
    const food_name = document.getElementById('food-name').value.trim();
    const quantity = document.getElementById('food-qty').value;
    const cooked_time = document.getElementById('food-cooked').value;
    const fresh_until = document.getElementById('food-fresh').value;
    
    if (!food_name || !quantity || !cooked_time || !fresh_until) {
        alert('Please fill all fields!');
        return;
    }
    
    try {
        const response = await fetch('/api/post-food', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                food_name,
                quantity,
                cooked_time,
                fresh_until
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Food posted successfully!');
            // Clear form
            document.getElementById('food-name').value = '';
            document.getElementById('food-qty').value = '';
            loadMyPostedFood();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error posting food: ' + error.message);
    }
}

async function loadMyPostedFood() {
    try {
        const response = await fetch(`/api/my-food/${currentUser.id}`);
        const foods = await response.json();
        
        const container = document.getElementById('my-food-list');
        
        if (foods.length === 0) {
            container.innerHTML = '<p class="info-text">No food posts yet. Post your first food item above!</p>';
            return;
        }
        
        container.innerHTML = foods.map(food => `
            <div class="food-item">
                <div class="food-header">
                    <span class="food-name">${food.food_name}</span>
                    <span class="food-status status-${food.status}">${food.status.toUpperCase()}</span>
                </div>
                <div class="food-details">
                    <strong>Quantity:</strong> ${food.quantity} persons<br>
                    <strong>Cooked:</strong> ${new Date(food.cooked_time).toLocaleString()}<br>
                    <strong>Fresh Until:</strong> ${new Date(food.fresh_until).toLocaleString()}
                </div>
                ${food.status === 'available' ? `
                    <button class="btn-danger" onclick="deleteFood(${food.id})">Remove</button>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading food:', error);
    }
}

async function deleteFood(foodId) {
    if (!confirm('Are you sure you want to remove this food post?')) return;
    
    try {
        const response = await fetch(`/api/food/${foodId}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (response.ok) {
            loadMyPostedFood();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error deleting food: ' + error.message);
    }
}

async function loadProviderNotifications() {
    try {
        const response = await fetch(`/api/notifications/${currentUser.id}`);
        const notifications = await response.json();
        
        const container = document.getElementById('provider-notifications');
        const badge = document.getElementById('notif-count');
        
        const unreadCount = notifications.filter(n => !n.is_read).length;
        badge.textContent = unreadCount;
        
        if (notifications.length === 0) {
            container.innerHTML = '<p class="info-text">No notifications yet</p>';
            return;
        }
        
        container.innerHTML = notifications.map(notif => `
            <div class="notification ${notif.is_read ? '' : 'unread'} ${notif.type === 'wasted' ? 'wasted' : ''}">
                <strong>${notif.type.toUpperCase()}</strong><br>
                ${notif.message}<br>
                <small>${new Date(notif.created_at).toLocaleString()}</small>
            </div>
        `).join('');
        
        // Mark as read
        await fetch(`/api/notifications/read/${currentUser.id}`, { method: 'PUT' });
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// ==================== RECEIVER DASHBOARD ====================

async function loadReceiverDashboard() {
    // Initialize map
    initMap();
    
    // Load available food
    await loadAvailableFood();
    
    // Load notifications
    loadReceiverNotifications();
}

function initMap() {
    // Initialize map centered on Mumbai (default)
    if (map) {
        map.remove();
    }
    
    map = L.map('map').setView([19.0760, 72.8777], 12);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

async function loadAvailableFood() {
    try {
        const response = await fetch('/api/get-food');
        const foods = await response.json();
        
        // Clear existing markers
        foodMarkers.forEach(marker => map.removeLayer(marker));
        foodMarkers = [];
        
        const container = document.getElementById('available-food-list');
        
        if (foods.length === 0) {
            container.innerHTML = '<p class="info-text">No food available right now. Check back later!</p>';
            return;
        }
        
        // Calculate priority and display
        const now = new Date();
        
        container.innerHTML = foods.map((food, index) => {
            const freshUntil = new Date(food.fresh_until);
            const hoursRemaining = (freshUntil - now) / (1000 * 60 * 60);
            
            // Priority classification
            let priority = 'low';
            let priorityClass = 'priority-low';
            if (hoursRemaining < 2) {
                priority = 'high';
                priorityClass = 'priority-high';
            } else if (hoursRemaining < 4) {
                priority = 'medium';
                priorityClass = 'priority-medium';
            }
            
            // Add marker to map
            if (food.lat && food.lng) {
                const marker = L.marker([food.lat, food.lng])
                    .addTo(map)
                    .bindPopup(`
                        <strong>${food.food_name}</strong><br>
                        Quantity: ${food.quantity} persons<br>
                        Provider: ${food.provider_name}<br>
                        Location: ${food.provider_location}
                    `);
                foodMarkers.push(marker);
            }
            
            return `
                <div class="food-item ${priorityClass}">
                    <div class="food-header">
                        <span class="food-name">#${index + 1} ${food.food_name}</span>
                        <span class="food-status status-${food.status}">${food.status.toUpperCase()}</span>
                    </div>
                    <div class="food-details">
                        <strong>Provider:</strong> ${food.provider_name} (${food.category})<br>
                        <strong>Location:</strong> ${food.provider_location}<br>
                        <strong>Quantity:</strong> ${food.quantity} persons<br>
                        <strong>Cooked:</strong> ${new Date(food.cooked_time).toLocaleString()}<br>
                        <strong>Fresh Until:</strong> ${new Date(food.fresh_until).toLocaleString()}<br>
                        <strong>Priority:</strong> ${priority === 'high' ? '🔴 URGENT' : priority === 'medium' ? '🟡 Medium' : '🟢 Low'}
                    </div>
                    ${food.status === 'available' ? `
                        <div class="food-actions">
                            <button class="btn-success" onclick="volunteerAction(${food.id}, 'accepted')">✅ Accept</button>
                            <button class="btn-danger" onclick="volunteerAction(${food.id}, 'rejected')">❌ Reject</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Fit map to show all markers
        if (foodMarkers.length > 0) {
            const group = new L.featureGroup(foodMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    } catch (error) {
        console.error('Error loading food:', error);
    }
}

async function volunteerAction(foodId, action) {
    try {
        const response = await fetch('/api/volunteer-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                food_id: foodId,
                volunteer_id: currentUser.id,
                action: action
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            loadAvailableFood();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loadReceiverNotifications() {
    try {
        const response = await fetch(`/api/notifications/${currentUser.id}`);
        const notifications = await response.json();
        
        const container = document.getElementById('receiver-notifications');
        const badge = document.getElementById('receiver-notif-count');
        
        const unreadCount = notifications.filter(n => !n.is_read).length;
        badge.textContent = unreadCount;
        
        if (notifications.length === 0) {
            container.innerHTML = '<p class="info-text">No notifications yet</p>';
            return;
        }
        
        container.innerHTML = notifications.map(notif => `
            <div class="notification ${notif.is_read ? '' : 'unread'}">
                ${notif.message}<br>
                <small>${new Date(notif.created_at).toLocaleString()}</small>
            </div>
        `).join('');
        
        // Mark as read
        await fetch(`/api/notifications/read/${currentUser.id}`, { method: 'PUT' });
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// ==================== VOLUNTEER HISTORY ====================

async function showVolunteerHistory() {
    hideAllScreens();
    document.getElementById('volunteer-history').classList.remove('hidden');
    
    try {
        const response = await fetch(`/api/volunteer-history/${currentUser.id}`);
        const orders = await response.json();
        
        const container = document.getElementById('history-list');
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="info-text">No order history yet.</p>';
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="history-item">
                <div class="history-header">
                    <strong>${order.food_name}</strong>
                    <span class="food-status status-${order.status === 'accepted' ? 'claimed' : 'wasted'}">
                        ${order.action.toUpperCase()}
                    </span>
                </div>
                <div class="food-details">
                    <strong>Provider:</strong> ${order.provider_name}<br>
                    <strong>Location:</strong> ${order.provider_location}<br>
                    <strong>Quantity:</strong> ${order.quantity} persons<br>
                    <strong>Action Time:</strong> ${new Date(order.action_time).toLocaleString()}<br>
                    <strong>Delivered:</strong> ${order.delivered ? '✅ Yes' : '❌ No'}
                </div>
                ${order.action === 'accepted' && !order.delivered ? `
                    <button class="btn-success" onclick="markDelivered(${order.id}, ${order.food_id})">
                        ✅ Mark as Delivered
                    </button>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

async function markDelivered(orderId, foodId) {
    try {
        const response = await fetch('/api/mark-delivered', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, food_id: foodId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Marked as delivered!');
            showVolunteerHistory();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function goBack() {
    loadDashboard();
}

// ==================== EXCEL EXPORT ====================

function exportData() {
    window.location.href = '/api/export-excel';
}

// ==================== WASTE CHECK (Auto) ====================

// Check for wasted food every minute
setInterval(async () => {
    try {
        await fetch('/api/check-waste');
    } catch (error) {
        console.error('Waste check failed:', error);
    }
}, 60000); // Every 60 seconds

// Initial load
showWelcome();