
import { db, saveDb, loadDb } from './db.js';
import { registerServiceWorker } from './pwa.js';
import { renderLogin } from './auth.js';
import { renderPatientList } from './patients.js';
import { renderVisitLog } from './visits.js';
import { renderReports } from './reports.js';
import { renderServiceVisitSelector } from './services.js';
import { renderUserDashboard } from './users.js';
import { renderAppointmentForm } from './appointments.js';
import {
  exportPatientsJSON,
  exportVisitsJSON,
  importEncryptedData
} from './export.js';



const origRenderLogin = window.renderLogin || renderLogin;
window.renderLogin = function(container) {
  origRenderLogin(container);

  if (!document.getElementById('userDataTools')) {
    const extra = document.createElement('div');
    extra.className = 'mt-4';
    extra.innerHTML = `
      <div class="card card-body mb-2">
        <h6 class="mb-2">Data Tools (before login)</h6>
        <button class="btn btn-outline-primary btn-sm mb-2" id="userExportBtn">Export/Backup</button>
        <button class="btn btn-outline-success btn-sm mb-2" id="userImportBtn">Import Data</button>
        <button class="btn btn-outline-warning btn-sm" id="userImportSetupBtn">Import Setup</button>
      </div>
      <div id="userDataTools"></div>
    `;
    container.appendChild(extra);
    document.getElementById('userExportBtn').onclick = () => {
      window.renderUserBackupUI(document.getElementById('userDataTools'));
    };
          document.getElementById('userImportBtn').onclick = () => {
            window.renderUserBackupUI(document.getElementById('userDataTools'));
          };
    document.getElementById('userImportSetupBtn').onclick = () => {
      window.renderUserImportSetupUI(document.getElementById('userDataTools'));
    };
    console.log('[PATCH] Data Tools (Import Setup) UI injected on login page');
  }
};


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
    import('./helpers.js').then(mod => mod.renderProfile(app, {
      getUser: () => db.currentUser,
      updateUser: (u) => { db.currentUser = u; saveDb(); },
      dashboardHash: '#user-dashboard'
    }));
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

window.renderUserBackupUI = function(container) {
  container.innerHTML = `
    <div class="card card-body my-3">
      <h5>Data Export & Backup</h5>
      <button class="btn btn-primary mb-2" id="exportPatientsBtn">Export Patients (JSON)</button>
      <button class="btn btn-primary mb-2" id="exportVisitsBtn">Export Visits (JSON)</button>
      <hr>
      <h6>Import Data</h6>
      <input type="file" id="importFileInput" accept=".json" class="form-control mb-2">
      <button class="btn btn-warning" id="importBtn">Import & Merge</button>
      <div id="importMsg" class="mt-2"></div>
    </div>
  `;
  document.getElementById('exportPatientsBtn').onclick = exportPatientsJSON;
  document.getElementById('exportVisitsBtn').onclick = exportVisitsJSON;
  document.getElementById('importBtn').onclick = function() {
    const file = document.getElementById('importFileInput').files[0];
    if (!file) {
      document.getElementById('importMsg').innerHTML = '<div class="alert alert-danger">Select a file to import.</div>';
      return;
    }
    importEncryptedData(file, () => {
      document.getElementById('importMsg').innerHTML = '<div class="alert alert-success">Import complete. Data merged.</div>';
    });
  };
};

window.renderUserImportSetupUI = function(container) {
  container.innerHTML = `
    <div class="card card-body my-3">
      <h5>Import Setup (Registers, Custom Fields, Facility)</h5>
      <input type="file" id="importSetupFileInput" accept=".json" class="form-control mb-2">
      <button class="btn btn-warning" id="importSetupBtn">Import Setup</button>
      <div id="importSetupMsg" class="mt-2"></div>
    </div>
  `;
  document.getElementById('importSetupBtn').onclick = function() {
    const file = document.getElementById('importSetupFileInput').files[0];
    if (!file) {
      document.getElementById('importSetupMsg').innerHTML = '<div class="alert alert-danger">Select a setup file to import.</div>';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      let raw = e.target.result;
      let json = null;
      try {
        json = JSON.parse(importEncryptedData ? decryptData(raw) : raw);
      } catch (err) {
        document.getElementById('importSetupMsg').innerHTML = '<div class="alert alert-danger">Invalid or corrupted file.</div>';
        return;
      }
      if (!json || typeof json !== 'object') {
        document.getElementById('importSetupMsg').innerHTML = '<div class="alert alert-danger">Invalid file format.</div>';
        return;
      }

      if (json.registers) db.registers = Array.isArray(json.registers) ? json.registers : db.registers;
      if (json.customPatientFields) db.customPatientFields = Array.isArray(json.customPatientFields) ? json.customPatientFields : db.customPatientFields;
      if (json.meta && json.meta.facility) db.facility = Object.assign({}, db.facility, json.meta.facility);
      saveDb();
      document.getElementById('importSetupMsg').innerHTML = '<div class="alert alert-success">Setup imported successfully.</div>';
    };
    reader.readAsText(file);
  };
};

(function patchLoginForDataTools() {
  console.log('Patch applied for Data Tools on login page');
})();

