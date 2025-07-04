// profile.js - User profile update logic
import { db, saveDb } from './db.js';

export function renderProfile(root) {
  const user = db.currentUser;
  if (!user) {
    root.innerHTML = '<div class="alert alert-danger">No user logged in.</div>';
    return;
  }
  root.innerHTML = `
    <div class="container my-4">
      <div class="card shadow mx-auto" style="max-width:400px;">
        <div class="card-body">
          <h4 class="mb-3"><i class="bi bi-person-circle"></i> Update Profile</h4>
          <form id="profileForm" autocomplete="off">
            <div class="mb-3">
              <label class="form-label">Username</label>
              <input class="form-control" value="${user.username}" readonly>
            </div>
            <div class="mb-3">
              <label class="form-label">Full Name</label>
              <input class="form-control" id="fullName" value="${user.name || ''}" placeholder="Full Name" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Phone</label>
              <input class="form-control" id="phone" value="${user.phone || ''}" placeholder="Phone">
            </div>
            <hr>
            <h6>Change Password</h6>
            <div class="mb-2">
              <label class="form-label">Current Password</label>
              <input type="password" class="form-control" id="currentPassword" autocomplete="current-password">
            </div>
            <div class="mb-2">
              <label class="form-label">New Password</label>
              <input type="password" class="form-control" id="newPassword" autocomplete="new-password">
            </div>
            <div class="d-flex justify-content-between mt-3">
              <button class="btn btn-primary">Save Changes</button>
              <a href="#user-dashboard" class="btn btn-secondary">Cancel</a>
            </div>
            <div id="profileMsg" class="mt-2 small"></div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('profileForm').onsubmit = function(e) {
    e.preventDefault();
    const fullName = this.fullName.value.trim();
    const phone = this.phone.value.trim();
    const currentPassword = this.currentPassword.value;
    const newPassword = this.newPassword.value;
    let msg = '';
    // Update profile fields
    user.name = fullName;
    user.phone = phone;
    // Password change logic
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        msg = 'Both current and new password are required to change password.';
        this.querySelector('#profileMsg').textContent = msg;
        this.querySelector('#profileMsg').className = 'text-danger mt-2 small';
        return;
      }
      if (user.password !== currentPassword) {
        msg = 'Current password is incorrect.';
        this.querySelector('#profileMsg').textContent = msg;
        this.querySelector('#profileMsg').className = 'text-danger mt-2 small';
        return;
      }
      user.password = newPassword;
      user.lastPasswordChange = Date.now();
      msg = 'Password updated! ';
    }
    // Update in db.users array
    const idx = db.users.findIndex(u => u.username === user.username);
    if (idx !== -1) {
      db.users[idx].name = user.name;
      db.users[idx].phone = user.phone;
      if (newPassword) {
        db.users[idx].password = newPassword;
        db.users[idx].lastPasswordChange = user.lastPasswordChange;
      }
      db.currentUser = db.users[idx];
    }
    saveDb();
    this.querySelector('#profileMsg').textContent = msg + 'Profile updated!';
    this.querySelector('#profileMsg').className = 'text-success mt-2 small';
    setTimeout(() => { window.location.hash = '#user-dashboard'; }, 1200);
  };
}

export function isPasswordExpired(user) {
  if (!user) return false;
  const last = user.lastPasswordChange || 0;
  const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return daysSince > 30;
}
