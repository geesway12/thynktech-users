import { db, saveDb } from './db.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card shadow">
            <div class="card-header bg-primary text-white">
              <h2 class="mb-0"><i class="bi bi-person-lock"></i> Thynktech Login</h2>
            </div>
            <div class="card-body">
              <form id="loginForm" autocomplete="off">
                <div class="mb-3">
                  <input type="text" class="form-control" id="username" placeholder="Username" required autofocus>
                </div>
                <div class="mb-3">
                  <input type="password" class="form-control" id="password" placeholder="Password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-box-arrow-in-right"></i> Login</button>
              </form>
              <div id="loginError" class="alert alert-danger mt-3 d-none"></div>
              <hr>
              <div class="mb-2">
                <label class="btn btn-outline-info btn-sm w-100">
                  <i class="bi bi-box-arrow-in-down"></i> Import System Setup
                  <input type="file" id="importSetupFile" hidden>
                </label>
                <div id="importMsg" class="small mt-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('loginForm').onsubmit = function(e) {
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
      db.currentUser = user;
      saveDb();
      window.location.hash = "#user-dashboard";
    } else {
      const err = document.getElementById("loginError");
      err.textContent = "Invalid username or password!";
      err.classList.remove("d-none");
    }
  }

  // Import system setup logic
  document.getElementById("importSetupFile").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const setupData = JSON.parse(ev.target.result);
        db.facility = setupData.facility;
        db.settings = setupData.settings;
        db.users = setupData.users || [];
        db.registers = setupData.registers || [];
        db.roles = setupData.roles || [];
        db.servicesList = setupData.servicesList || [];
        db.customPatientFields = setupData.customPatientFields || [];
        saveDb();
        document.getElementById("importMsg").innerHTML = `<span class="text-success">System setup imported! You can now log in with your credentials.</span>`;
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        document.getElementById("importMsg").innerHTML = `<span class="text-danger">Import failed: Invalid file.</span>`;
      }
    };
    reader.readAsText(file);
  });
}
