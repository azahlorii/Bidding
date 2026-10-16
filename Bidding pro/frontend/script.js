/**
 * ============================================================================
 * ServiceBid – Online Service Bidding System
 * Frontend Application Logic (frontend/script.js)
 * Communicates with Python Flask REST API (/api/*) using Fetch API
 * ============================================================================
 */

const state = {
  currentUser: JSON.parse(localStorage.getItem('servicebid_user') || 'null'),
  currentPage: 'home',
  services: [],
  selectedService: null,
  providerBids: [],
  adminData: null,
};

// Helper function to call Flask REST API endpoints
async function apiRequest(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Save or clear logged-in user session
function setSessionUser(user) {
  state.currentUser = user;
  if (user) {
    localStorage.setItem('servicebid_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('servicebid_user');
  }
  renderNavigation();
}

// Navigate between views
async function navigateTo(page, param = null) {
  state.currentPage = page;
  renderNavigation();
  const mainEl = document.getElementById('app-content');
  mainEl.innerHTML = '<p>Loading data from SQLite...</p>';

  try {
    if (page === 'home') {
      const res = await apiRequest('/api/services');
      state.services = res.services || [];
      renderHomePage(mainEl);
    } else if (page === 'customer-auth') {
      renderAuthPage(mainEl, 'customer');
    } else if (page === 'provider-auth') {
      renderAuthPage(mainEl, 'provider');
    } else if (page === 'admin-auth') {
      renderAuthPage(mainEl, 'admin');
    } else if (page === 'customer-dashboard') {
      const res = await apiRequest(`/api/services?customer_id=${state.currentUser.id}`);
      state.services = res.services || [];
      renderCustomerDashboard(mainEl);
    } else if (page === 'post-service') {
      renderPostServicePage(mainEl);
    } else if (page === 'customer-bids') {
      const res = await apiRequest(`/api/services/${param}`);
      state.selectedService = res.service;
      renderCustomerBidsPage(mainEl);
    } else if (page === 'available-services') {
      const res = await apiRequest('/api/services');
      state.services = res.services || [];
      renderAvailableServicesPage(mainEl);
    } else if (page === 'submit-bid') {
      const res = await apiRequest(`/api/services/${param}`);
      state.selectedService = res.service;
      renderSubmitBidPage(mainEl);
    } else if (page === 'provider-dashboard') {
      const res = await apiRequest(`/api/provider/${state.currentUser.id}/bids`);
      state.providerBids = res.bids || [];
      renderProviderDashboard(mainEl);
    } else if (page === 'admin-dashboard') {
      state.adminData = await apiRequest('/api/admin/overview');
      renderAdminDashboard(mainEl);
    }
  } catch (err) {
    mainEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function renderNavigation() {
  const navLinks = document.getElementById('nav-links');
  const navActions = document.getElementById('nav-actions');
  const u = state.currentUser;

  if (!u) {
    navLinks.innerHTML = `
      <button class="nav-link" onclick="navigateTo('home')">Home</button>
      <button class="nav-link" onclick="navigateTo('available-services')">Available Services</button>
      <button class="nav-link" onclick="navigateTo('customer-auth')">Customer Login</button>
      <button class="nav-link" onclick="navigateTo('provider-auth')">Provider Login</button>
      <button class="nav-link" onclick="navigateTo('admin-auth')">Admin</button>
    `;
    navActions.innerHTML = `
      <button class="btn btn-primary" onclick="navigateTo('customer-auth')">Post a Service</button>
    `;
  } else if (u.role === 'customer') {
    navLinks.innerHTML = `
      <button class="nav-link" onclick="navigateTo('customer-dashboard')">Customer Dashboard</button>
      <button class="nav-link" onclick="navigateTo('post-service')">Post Service</button>
      <button class="nav-link" onclick="navigateTo('available-services')">Available Services</button>
    `;
    navActions.innerHTML = `
      <span>${u.name} · Customer</span>
      <button class="btn btn-secondary" onclick="logoutUser()">Logout</button>
    `;
  } else if (u.role === 'provider') {
    navLinks.innerHTML = `
      <button class="nav-link" onclick="navigateTo('provider-dashboard')">Provider Dashboard</button>
      <button class="nav-link" onclick="navigateTo('available-services')">Available Services</button>
    `;
    navActions.innerHTML = `
      <span>${u.name} · Provider</span>
      <button class="btn btn-secondary" onclick="logoutUser()">Logout</button>
    `;
  } else if (u.role === 'admin') {
    navLinks.innerHTML = `
      <button class="nav-link" onclick="navigateTo('admin-dashboard')">Admin Dashboard</button>
      <button class="nav-link" onclick="navigateTo('available-services')">All Services</button>
    `;
    navActions.innerHTML = `
      <span>${u.name} · Admin</span>
      <button class="btn btn-secondary" onclick="logoutUser()">Logout</button>
    `;
  }
}

function logoutUser() {
  setSessionUser(null);
  navigateTo('home');
}

// 1. HOME PAGE
function renderHomePage(container) {
  const openServices = state.services.filter(s => s.status === 'Open').slice(0, 4);
  container.innerHTML = `
    <div class="surface-card" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; align-items: center;">
      <div>
        <h1 style="font-size: 28px; margin-bottom: 8px;">ServiceBid – Online Service Bidding System</h1>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">
          Connect with verified professionals. Customers post service requirements with a budget and deadline; service providers submit competitive bids.
        </p>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="navigateTo('customer-auth')">Customer Login / Register</button>
          <button class="btn btn-secondary" onclick="navigateTo('provider-auth')">Service Provider Login / Register</button>
          <button class="btn btn-secondary" onclick="navigateTo('available-services')">Browse Available Services</button>
        </div>
      </div>
      <div>
        <img
          src="/src/assets/images/hero_service_marketplace_1791450570817.jpg"
          alt="Verified technician consulting with customer"
          referrerpolicy="no-referrer"
          style="width: 100%; border-radius: 8px; border: 1px solid var(--border-color); display: block;"
        />
      </div>
    </div>

    <h2 style="font-size: 20px; margin: 24px 0 12px;">Popular Service Categories</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div class="surface-card" style="padding: 12px; margin-bottom: 0;">
        <img src="/src/assets/images/cat_electrical_repairs_1791450583508.jpg" alt="Electrical & Repairs" referrerpolicy="no-referrer" loading="lazy" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />
        <strong>Electrical & Repairs</strong>
      </div>
      <div class="surface-card" style="padding: 12px; margin-bottom: 0;">
        <img src="/src/assets/images/cat_carpentry_plumbing_1791450612617.jpg" alt="Carpentry & Plumbing" referrerpolicy="no-referrer" loading="lazy" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />
        <strong>Carpentry & Plumbing</strong>
      </div>
      <div class="surface-card" style="padding: 12px; margin-bottom: 0;">
        <img src="/src/assets/images/cat_appliance_cleaning_1791450630193.jpg" alt="Appliance Servicing" referrerpolicy="no-referrer" loading="lazy" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />
        <strong>Appliance Servicing</strong>
      </div>
      <div class="surface-card" style="padding: 12px; margin-bottom: 0;">
        <img src="/src/assets/images/cat_web_software_1791450644489.jpg" alt="Web & Software" referrerpolicy="no-referrer" loading="lazy" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />
        <strong>Web & Software</strong>
      </div>
    </div>

    <h2 style="font-size: 20px; margin: 24px 0 12px;">Recent Open Service Requirements</h2>
    ${openServices.map(s => `
      <div class="surface-card">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h3 style="font-size: 18px;">${s.title}</h3>
          <strong class="tabular-nums">Budget: ₹${Number(s.budget).toLocaleString()}</strong>
        </div>
        <p style="color: var(--text-muted); font-size: 13px; margin: 4px 0 12px;">
          ${s.category} · Deadline: ${s.deadline} · Posted by ${s.customer_name} · ${s.bid_count} Bid(s)
        </p>
        <p style="margin-bottom: 14px;">${s.description}</p>
        <button class="btn btn-secondary" onclick="navigateTo('submit-bid', ${s.id})">View & Submit Bid</button>
      </div>
    `).join('')}
  `;
}

// 2 & 3. AUTHENTICATION PAGE (Customer / Provider / Admin)
function renderAuthPage(container, role) {
  const roleLabel = role === 'customer' ? 'Customer' : role === 'provider' ? 'Service Provider' : 'Admin';
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
      <div class="surface-card">
        <h2 style="margin-bottom: 16px;">${roleLabel} Login</h2>
        <div id="login-msg"></div>
        <form onsubmit="handleLogin(event, '${role}')">
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="login-email" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-password" class="form-control" required />
          </div>
          <button type="submit" class="btn btn-primary">Login as ${roleLabel}</button>
        </form>
      </div>

      ${role !== 'admin' ? `
      <div class="surface-card">
        <h2 style="margin-bottom: 16px;">New ${roleLabel} Registration</h2>
        <div id="register-msg"></div>
        <form onsubmit="handleRegister(event, '${role}')">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="reg-name" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="reg-email" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="text" id="reg-phone" class="form-control" required />
          </div>
          ${role === 'provider' ? `
          <div class="form-group">
            <label>Primary Skill / Specialty</label>
            <input type="text" id="reg-specialty" class="form-control" placeholder="e.g., Electrical, Plumbing, Web Dev" required />
          </div>
          ` : ''}
          <div class="form-group">
            <label>Password (min 6 chars)</label>
            <input type="password" id="reg-password" class="form-control" required />
          </div>
          <button type="submit" class="btn btn-primary">Register Account</button>
        </form>
      </div>
      ` : ''}
    </div>
  `;
}

async function handleLogin(e, role) {
  e.preventDefault();
  const msgEl = document.getElementById('login-msg');
  try {
    const res = await apiRequest('/api/login', 'POST', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value,
      role,
    });
    setSessionUser(res.user);
    if (res.user.role === 'customer') navigateTo('customer-dashboard');
    else if (res.user.role === 'provider') navigateTo('provider-dashboard');
    else navigateTo('admin-dashboard');
  } catch (err) {
    msgEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function handleRegister(e, role) {
  e.preventDefault();
  const msgEl = document.getElementById('register-msg');
  try {
    const res = await apiRequest('/api/register', 'POST', {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      phone: document.getElementById('reg-phone').value,
      specialty: role === 'provider' ? document.getElementById('reg-specialty').value : '',
      password: document.getElementById('reg-password').value,
      role,
    });
    setSessionUser(res.user);
    navigateTo(role === 'customer' ? 'customer-dashboard' : 'provider-dashboard');
  } catch (err) {
    msgEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// 4. CUSTOMER DASHBOARD
function renderCustomerDashboard(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2>My Posted Service Requirements</h2>
      <button class="btn btn-primary" onclick="navigateTo('post-service')">+ Post New Service</button>
    </div>
    ${state.services.length === 0 ? `<div class="surface-card"><p>You have not posted any service requirements yet.</p></div>` : ''}
    ${state.services.map(s => `
      <div class="surface-card">
        <div style="display: flex; justify-content: space-between;">
          <h3>${s.title}</h3>
          <span class="tabular-nums">Budget: ₹${Number(s.budget).toLocaleString()}</span>
        </div>
        <p style="color: var(--text-muted); font-size: 13px; margin: 4px 0 12px;">
          Status: ${s.status} · Category: ${s.category} · Deadline: ${s.deadline} · Bids Received: ${s.bid_count}
        </p>
        <p style="margin-bottom: 14px;">${s.description}</p>
        <button class="btn btn-primary" onclick="navigateTo('customer-bids', ${s.id})">View Bids (${s.bid_count})</button>
      </div>
    `).join('')}
  `;
}

// 6. POST SERVICE PAGE
function renderPostServicePage(container) {
  container.innerHTML = `
    <div class="surface-card" style="max-width: 680px;">
      <h2 style="margin-bottom: 16px;">Post a New Service Requirement</h2>
      <div id="post-msg"></div>
      <form onsubmit="handlePostService(event)">
        <div class="form-group">
          <label>Service Title</label>
          <input type="text" id="srv-title" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="srv-category" class="form-control" required>
            <option value="Electrical & Repairs">Electrical & Repairs</option>
            <option value="Carpentry & Plumbing">Carpentry & Plumbing</option>
            <option value="Web & Software">Web & Software</option>
            <option value="Appliance Servicing">Appliance Servicing</option>
            <option value="Painting & Cleaning">Painting & Cleaning</option>
          </select>
        </div>
        <div class="form-group">
          <label>Budget (₹)</label>
          <input type="number" id="srv-budget" class="form-control" min="100" required />
        </div>
        <div class="form-group">
          <label>Target Deadline</label>
          <input type="date" id="srv-deadline" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Detailed Description</label>
          <textarea id="srv-desc" class="form-control" rows="4" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Publish Service Requirement</button>
      </form>
    </div>
  `;
}

async function handlePostService(e) {
  e.preventDefault();
  try {
    await apiRequest('/api/services', 'POST', {
      customer_id: state.currentUser.id,
      title: document.getElementById('srv-title').value,
      category: document.getElementById('srv-category').value,
      budget: document.getElementById('srv-budget').value,
      deadline: document.getElementById('srv-deadline').value,
      description: document.getElementById('srv-desc').value,
    });
    navigateTo('customer-dashboard');
  } catch (err) {
    document.getElementById('post-msg').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// 9. CUSTOMER BIDS PAGE
function renderCustomerBidsPage(container) {
  const s = state.selectedService;
  const bids = s.bids || [];
  container.innerHTML = `
    <div class="surface-card">
      <h2>${s.title}</h2>
      <p style="color: var(--text-muted); font-size: 13px; margin: 4px 0 12px;">
        Status: ${s.status} · Budget: ₹${Number(s.budget).toLocaleString()} · Deadline: ${s.deadline}
      </p>
      <p>${s.description}</p>
    </div>
    <h3 style="margin: 20px 0 12px;">Bids Received (${bids.length})</h3>
    ${bids.map(b => `
      <div class="surface-card">
        <div style="display: flex; justify-content: space-between;">
          <strong>${b.provider_name} (${b.provider_specialty || 'Service Provider'})</strong>
          <strong class="tabular-nums">Bid Amount: ₹${Number(b.bid_amount).toLocaleString()}</strong>
        </div>
        <p style="color: var(--text-muted); font-size: 13px; margin: 4px 0 10px;">
          Status: ${b.status} · Delivery Estimate: ${b.delivery_days} days · Phone: ${b.provider_phone || 'N/A'}
        </p>
        <p style="margin-bottom: 12px;">${b.message}</p>
        ${s.status === 'Open' && b.status === 'Pending' ? `
          <button class="btn btn-success" onclick="acceptBid(${b.id}, ${s.id})">Accept & Select Provider</button>
        ` : ''}
      </div>
    `).join('')}
  `;
}

async function acceptBid(bidId, serviceId) {
  await apiRequest(`/api/bids/${bidId}/accept`, 'POST', {});
  navigateTo('customer-bids', serviceId);
}

// 7. AVAILABLE SERVICES PAGE
function renderAvailableServicesPage(container) {
  container.innerHTML = `
    <h2 style="margin-bottom: 16px;">Available Service Requirements</h2>
    ${state.services.map(s => `
      <div class="surface-card">
        <div style="display: flex; justify-content: space-between;">
          <h3>${s.title}</h3>
          <strong class="tabular-nums">Budget: ₹${Number(s.budget).toLocaleString()}</strong>
        </div>
        <p style="color: var(--text-muted); font-size: 13px; margin: 4px 0 10px;">
          ${s.category} · Status: ${s.status} · Deadline: ${s.deadline} · Bids: ${s.bid_count}
        </p>
        <p style="margin-bottom: 12px;">${s.description}</p>
        ${s.status === 'Open' ? `
          <button class="btn btn-primary" onclick="navigateTo('submit-bid', ${s.id})">Submit Bid</button>
        ` : ''}
      </div>
    `).join('')}
  `;
}

// 8. SUBMIT BID PAGE
function renderSubmitBidPage(container) {
  const s = state.selectedService;
  container.innerHTML = `
    <div class="surface-card">
      <h2>Submit Bid for: ${s.title}</h2>
      <p style="color: var(--text-muted); font-size: 13px; margin: 4px 0 12px;">
        Customer Budget: ₹${Number(s.budget).toLocaleString()} · Deadline: ${s.deadline}
      </p>
      <p style="margin-bottom: 20px;">${s.description}</p>
      <div id="bid-msg"></div>
      <form onsubmit="handleBidSubmit(event, ${s.id})">
        <div class="form-group">
          <label>Your Bid Amount (₹)</label>
          <input type="number" id="bid-amount" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Estimated Completion Days</label>
          <input type="number" id="bid-days" class="form-control" value="5" required />
        </div>
        <div class="form-group">
          <label>Proposal Message to Customer</label>
          <textarea id="bid-message" class="form-control" rows="4" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Submit Bid</button>
      </form>
    </div>
  `;
}

async function handleBidSubmit(e, serviceId) {
  e.preventDefault();
  if (!state.currentUser || state.currentUser.role !== 'provider') {
    navigateTo('provider-auth');
    return;
  }
  try {
    await apiRequest('/api/bids', 'POST', {
      service_id: serviceId,
      provider_id: state.currentUser.id,
      bid_amount: document.getElementById('bid-amount').value,
      delivery_days: document.getElementById('bid-days').value,
      message: document.getElementById('bid-message').value,
    });
    navigateTo('provider-dashboard');
  } catch (err) {
    document.getElementById('bid-msg').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// 5. SERVICE PROVIDER DASHBOARD
function renderProviderDashboard(container) {
  container.innerHTML = `
    <h2 style="margin-bottom: 16px;">My Submitted Bids</h2>
    <div class="surface-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Service Requirement</th>
            <th>Customer</th>
            <th>My Bid</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${state.providerBids.map(b => `
            <tr>
              <td>${b.service_title}</td>
              <td>${b.customer_name}</td>
              <td class="tabular-nums">₹${Number(b.bid_amount).toLocaleString()}</td>
              <td>${b.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 10, 11, 12. ADMIN DASHBOARD (User, Service & Bid Management)
function renderAdminDashboard(container) {
  const { users, services, bids } = state.adminData;
  container.innerHTML = `
    <h2 style="margin-bottom: 16px;">Admin Dashboard – User, Service & Bid Management</h2>
    <div class="surface-card">
      <h3 style="margin-bottom: 12px;">Registered Users (${users.length})</h3>
      <table class="data-table">
        <thead>
          <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td class="tabular-nums">#${u.id}</td>
              <td>${u.name}</td>
              <td>${u.email}</td>
              <td>${u.role}</td>
              <td>${u.role !== 'admin' ? `<button class="btn btn-danger" onclick="deleteUser(${u.id})">Delete</button>` : 'Protected'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function deleteUser(id) {
  await apiRequest(`/api/admin/users/${id}`, 'DELETE');
  navigateTo('admin-dashboard');
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  navigateTo('home');
});
