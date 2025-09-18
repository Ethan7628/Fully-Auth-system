const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const registerForm = document.getElementById('registerForm');
const verifyForm = document.getElementById('verifyForm');
const loginForm = document.getElementById('loginForm');
const loadUsersBtn = document.getElementById('loadUsers');
const usersList = document.getElementById('usersList');
const usersLoader = document.getElementById('usersLoader');

//tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');

        // activate selected tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabId}-tab`) {
                content.classList.add('active');
            }
        });

        // load users 
        if (tabId === 'users') {
            loadUsers();
        }
    });
});


const API_BASE_URL = 'http://localhost:3000'; 

// signup submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const messageEl = document.getElementById('registerMessage');

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(messageEl, 'Registration successful! Check your email for the OTP.', 'success');
            registerForm.reset();
        } else {
            showMessage(messageEl, data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage(messageEl, 'Network error. Please try again.', 'error');
    }
});

// verify OTP
verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('verifyEmail').value;
    const otp = document.getElementById('otp').value;
    const messageEl = document.getElementById('verifyMessage');

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(messageEl, 'Account verified successfully! You can now login.', 'success');
            verifyForm.reset();
            // switch to login tab
            document.querySelector('[data-tab="login"]').click();
        } else {
            showMessage(messageEl, data.message || 'Verification failed', 'error');
        }
    } catch (error) {
        showMessage(messageEl, 'Network error. Please try again.', 'error');
    }
});

// login submission
    loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('loginMessage');

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(messageEl, 'Login successful!', 'success');
            loginForm.reset();
            // if JWT token is returned, store it and show user info
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                showUserInfo(data.user);
            }
        } else {
            showMessage(messageEl, data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage(messageEl, 'Network error. Please try again.', 'error');
    }
});

//load users
loadUsersBtn.addEventListener('click', loadUsers);

async function loadUsers() {
    usersLoader.style.display = 'block';
    usersList.innerHTML = '';

    const token = localStorage.getItem('authToken');
    if (!token) {
        usersList.innerHTML = '<p class="error">You must be logged in as admin to view users.</p>';
        usersLoader.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        } else {
            usersList.innerHTML = '<p class="error">Failed to load users. Only admin can view users.</p>';
        }
    } catch (error) {
        usersList.innerHTML = '<p class="error">Network error. Please try again.</p>';
    } finally {
        usersLoader.style.display = 'none';
    }
}

function displayUsers(users) {
    if (!users || users.length === 0) {
        usersList.innerHTML = '<p>No users found</p>';
        return;
    }

    usersList.innerHTML = '';
    users.forEach(user => {
        const userEl = document.createElement('div');
        userEl.className = 'user-item';

        userEl.innerHTML = `
            <div class="user-info">
                <span class="user-email">${user.email}</span>
                <span class="user-role">Role: <b>${user.role}</b></span>
                <span class="user-status ${user.is_verified ? 'verified' : 'not-verified'}">
                    ${user.is_verified ? 'Verified' : 'Not Verified'}
                </span>
            </div>
            <div class="user-actions">
                <small>Joined: ${new Date(user.created_at).toLocaleDateString()}</small>
            </div>
        `;

        usersList.appendChild(userEl);
    });
}

function showUserInfo(user) {
    const userInfoDiv = document.getElementById('userInfo');
    if (userInfoDiv) {
        userInfoDiv.innerHTML = `<div class="user-info-panel">
            <strong>Logged in as:</strong> ${user.email}<br>
            <strong>Role:</strong> ${user.role}
        </div>`;
    }
    showDashboard(user);
}

function showDashboard(user) {
    // Hide tabs and tab contents
    document.getElementById('mainTabs').style.display = 'none';
    tabContents.forEach(content => content.style.display = 'none');
    // Show dashboard
    const dashboard = document.getElementById('dashboard');
    dashboard.style.display = 'block';
    if (user.role === 'admin') {
        dashboard.innerHTML = `<div class="card"><h2>Admin Dashboard</h2><p>All registered users:</p><div id="adminUsersList"></div></div>`;
        loadAdminUsers();
    } else {
        dashboard.innerHTML = `<div class="card"><h2>Staf Dashboard</h2><p>Hello users!</p></div>`;
    }
}

async function loadAdminUsers() {
    const token = localStorage.getItem('authToken');
    const adminUsersList = document.getElementById('adminUsersList');
    if (!token) {
        adminUsersList.innerHTML = '<p class="error">You must be logged in as admin to view users.</p>';
        return;
    }
    adminUsersList.innerHTML = '<div class="loader-spinner"></div><p>Loading users...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const users = await response.json();
            adminUsersList.innerHTML = '';
            users.forEach(user => {
                const userEl = document.createElement('div');
                userEl.className = 'user-item';
                userEl.innerHTML = `
                    <div class="user-info">
                        <span class="user-email">${user.email}</span>
                        <span class="user-role">Role: <b>${user.role}</b></span>
                        <span class="user-status ${user.is_verified ? 'verified' : 'not-verified'}">
                            ${user.is_verified ? 'Verified' : 'Not Verified'}
                        </span>
                    </div>
                    <div class="user-actions">
                        <small>Joined: ${new Date(user.created_at).toLocaleDateString()}</small>
                    </div>
                `;
                adminUsersList.appendChild(userEl);
            });
        } else {
            adminUsersList.innerHTML = '<p class="error">Failed to load users. Only admin can view users.</p>';
        }
    } catch (error) {
        adminUsersList.innerHTML = '<p class="error">Network error. Please try again.</p>';
    }
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;

    // auto hide after 5 seconds
    setTimeout(() => {
        element.style.opacity = '1';
        let opacity = 1;
        const fadeOut = setInterval(() => {
            if (opacity <= 0) {
                clearInterval(fadeOut);
                element.className = 'message';
                element.style.opacity = '';
            } else {
                opacity -= 0.05;
                element.style.opacity = opacity;
            }
        }, 50);
    }, 5000);
}

// load users if users tab is active on page load
if (document.querySelector('[data-tab="users"]').classList.contains('active')) {
    loadUsers();
}