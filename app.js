// Theme handling
window.setTheme = function(theme) {
  document.body.className = `theme-${theme}`;
  localStorage.setItem("thynktech_theme", theme);
};
document.body.className = `theme-${localStorage.getItem("thynktech_theme") || "blue"}`;

// Imports
import { db, saveDb, loadDb } from './db.js';
import { registerServiceWorker } from './pwa.js';
import { renderPatientList } from './patients.js';
import { renderVisitLog } from './visits.js';
import { renderReports } from './reports.js';
import { renderServiceVisitSelector } from './services.js';
import { renderUserDashboard } from './users.js';
import { renderAppointmentForm } from './appointments.js';

// Theme picker HTML
export const themePicker = `
  <div class="float-end mb-2">
    <span class="me-2"><i class="bi bi-palette"></i> Theme:</span>
    <button class="btn btn-sm btn-primary" onclick="setTheme('blue')" title="Blue"></button>
    <button class="btn btn-sm btn-success" onclick="setTheme('green')" title="Green"></button>
    <button class="btn btn-sm btn-accent" onclick="setTheme('orange')" title="Orange"></button>
    <button class="btn btn-sm btn-purple" style="background: #6f42c1; color:#fff;" onclick="setTheme('purple')" title="Purple"></button>
  </div>
`;

// Router
function router() {
  const app = document.getElementById('app');
  if (!db.currentUser) {
    window.location.hash = "#login";
    renderLogin(app);
    return;
  }
  const hash = window.location.hash;
  if (hash === "#login") renderLogin(app);
  else if (hash === "#user-dashboard" || hash === "") renderUserDashboard(app);
  else if (hash === "#patient-reg" || hash === "#patient-list") renderPatientList(app);
  else if (hash === "#visit-log") renderVisitLog(app);
  else if (hash === "#reports") renderReports(app);
  else if (hash === "#profile") {
    import('./profile.js').then(mod => mod.renderProfile(app));
  }
  else if (hash.startsWith("#appointment")) {
    const patientID = hash.split("-")[1];
    const patient = db.patients?.find(p => p.patientID === patientID);
    if (patient) renderAppointmentForm(patient);
    else renderUserDashboard(app);
  }
  else if (hash.startsWith("#service-entry")) renderServiceVisitSelector(app);
  else renderUserDashboard(app);
}

window.addEventListener("hashchange", router);
window.addEventListener("load", () => {
  loadDb();
  registerServiceWorker();
  router();
});

// Login and Import Setup UI
export function renderLogin(container) {
  container.innerHTML = `
    <div class="container my-5" style="max-width:400px;">
      <div class="card shadow">
        <div class="card-body">
          <h4 class="mb-3"><i class="bi bi-person-circle"></i> Thynktech User Login</h4>
          <form id="loginForm" autocomplete="off">
            <input class="form-control mb-2" name="username" placeholder="Username" required>
            <input class="form-control mb-3" name="password" type="password" placeholder="Password" required>
            <button class="btn btn-primary w-100 mb-2">Login</button>
          </form>
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
  `;

  // Login logic
  container.querySelector("#loginForm").onsubmit = function(e) {
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value;
    const user = db.users?.find(u => u.username === username && u.password === password);
    if (user) {
      db.currentUser = user;
      saveDb();
      window.location.hash = "#user-dashboard";
    } else {
      this.querySelector("button").classList.add("btn-danger");
      setTimeout(() => this.querySelector("button").classList.remove("btn-danger"), 1000);
    }
  };

  // Import system setup logic
  container.querySelector("#importSetupFile").addEventListener("change", function(e) {
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
        container.querySelector("#importMsg").innerHTML = `<span class="text-success">System setup imported! You can now log in with your credentials.</span>`;
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        container.querySelector("#importMsg").innerHTML = `<span class="text-danger">Import failed: Invalid file.</span>`;
      }
    };
    reader.readAsText(file);
  });
}
