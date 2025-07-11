import { db, saveDb } from './db.js';
import { renderServiceVisitSelector } from './services.js';
import { encryptData, decryptData } from './export.js';
import { renderProfile, isPasswordExpired, showModal } from './helpers.js';
import { renderLogin } from './auth.js';
import * as exportUtils from './export.js';

export function renderUserLogin(root) {
  renderLogin(root); // Pass the root container
}

function router() {
  const app = document.getElementById('app');
  const hash = window.location.hash;
  
  if (hash === "#login" || !db.currentUser) {
    renderLogin(app); // Pass the app container
    return;
  }

}

export function renderUserDashboard(container) {
  const user = db.currentUser;
  if (!user) {
    window.location.hash = "#login";
    return;
  }

  const assignedRegisters = Array.isArray(user.assignedRegisters) ? user.assignedRegisters : [];
  const assignedForms = (db.registers || []).filter(r => assignedRegisters.includes(r.name));

  const facility = db.facility || {};
  const facilityMeta = `
    <div class="facility-meta mb-3">
      ${facility.image ? `<img src="${facility.image}" alt="Facility Logo" style="max-height:60px; margin-bottom:8px;"><br>` : ""}
      <span class="fw-bold">${facility.name || ''}</span>
      <div class="text-muted small">
        ${[
          facility.region && `Region: ${facility.region}`,
          facility.district && `District: ${facility.district}`,
          facility.community && `Community: ${facility.community}`,
          facility.contact && `Contact: ${facility.contact}`
        ].filter(Boolean).join(' | ')}
      </div>
    </div>
  `;

  container.innerHTML = `
  <style>
    @media (min-width: 768px) {
      .dashboard-row-equal {
        display: flex;
        flex-wrap: wrap;
      }
      .dashboard-row-equal > [class^='col-'] {
        display: flex;
        flex-direction: column;
      }
      .dashboard-row-equal .card {
        flex: 1 1 auto;
        height: 100%;
        min-height: 350px;
      }
    }
    @media (max-width: 767.98px) {
      .dashboard-row-equal .card {
        min-height: unset;
      }
    }
  </style>
  <div class="container my-4">
    ${facilityMeta}
    <div class="row mt-4 g-3 dashboard-row-equal">
      <div class="col-12 col-md-6 d-flex">
        <div class="card shadow mb-4 flex-fill">
          <div class="card-body d-flex flex-column">
            <h5><i class="bi bi-person"></i> Quick Actions</h5>
            <div class="list-group mb-3 flex-grow-1">
              ${user.canPatientReg ? `<a href="#patient-reg" class="list-group-item list-group-item-action"><i class="bi bi-person-plus me-2"></i>Patient Registration</a>` : ""}
              ${user.canVisitLog ? `<a href="#visit-log" class="list-group-item list-group-item-action"><i class="bi bi-journal-medical me-2"></i>Visit Logging</a>` : ""}
              <a href="#appointments" class="list-group-item list-group-item-action" id="appointmentsLink"><i class="bi bi-calendar-event me-2"></i>Appointments</a>
              <a href="#reports" class="list-group-item list-group-item-action"><i class="bi bi-bar-chart me-2"></i>Reports</a>
              <a href="#export-backup" class="list-group-item list-group-item-action"><i class="bi bi-cloud-arrow-down me-2"></i>Export/Backup</a>
            <!-- Import Setup button removed from dashboard -->
            </div>
            <div id="dashboardDataTools"></div>
            <div class="mt-auto text-end">
              <a href="#profile" id="userProfileLink" class="btn btn-outline-secondary"><i class="bi bi-person-gear"></i> Profile</a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-6 d-flex">
        <div class="card shadow mb-4 flex-fill">
          <div class="card-body d-flex flex-column">
            <h5><i class="bi bi-calendar-check"></i> Upcoming Appointments Today</h5>
            <div id="upcomingAppointments" class="mb-3 flex-grow-1"></div>
            <div id="shareMsg" class="small mt-2 text-muted"></div>
            <div class="text-end mt-3">
              <button class="btn btn-outline-secondary" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Logout</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;


  const upcomingDiv = container.querySelector('#upcomingAppointments');
  if (upcomingDiv) {
    const today = new Date().toISOString().slice(0, 10);
    const appointments = (db.appointments || [])
      .filter(a => a.appointmentDate === today && a.status === "Scheduled")
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .slice(0, 5);
    if (appointments.length === 0) {
      upcomingDiv.innerHTML = '<div class="text-muted small">No appointments due today.</div>';
    } else {
      upcomingDiv.innerHTML = '<ul class="list-group">' +
        appointments.map(a => {
          const patient = (db.patients || []).find(p => p.patientID === a.patientID);
          return `<li class="list-group-item d-flex flex-column">
            <span><i class="bi bi-person-circle me-2"></i>${patient ? patient.name : a.patientID}</span>
            <span class="small text-muted"><i class="bi bi-activity"></i> ${a.serviceType || "-"}</span>
            <span class="small"><i class="bi bi-clock"></i> ${a.appointmentDate}</span>
          </li>`;
        }).join('') + '</ul>';
    }
  }

  if (isPasswordExpired(user)) {
    setTimeout(() => {
      alert("Your password has expired. Please update your password now.");
      renderProfile(container, {
        getUser: () => db.currentUser,
        updateUser: (u) => { db.currentUser = u; saveDb(); },
        dashboardHash: '#dashboard'
      });
    }, 500);
  }
  setTimeout(() => {
    const profileLink = document.getElementById('userProfileLink');
    if (profileLink) {
      profileLink.onclick = (e) => {
        e.preventDefault();
        renderProfile(container, {
          getUser: () => db.currentUser,
          updateUser: (u) => { db.currentUser = u; saveDb(); },
          dashboardHash: '#dashboard'
        });
      };
    }
  }, 100);

  container.querySelector("#logoutBtn").onclick = () => {
    db.currentUser = null;
    saveDb();
    window.location.hash = "#login";
  };



  const exportBackupBtn = container.querySelector('a[href="#export-backup"]');
  if (exportBackupBtn) {
    exportBackupBtn.onclick = (e) => {
      e.preventDefault();
      renderExportBackupPage(container);
    };
  }
} // <-- Add this closing brace to end renderUserDashboard

function renderExportBackupPage(container) {
  const f = db.facility || {};
  const meta = `
    <div class="facility-meta mb-3">
      ${f.image ? `<img src="${f.image}" alt="Facility Logo" style="max-height:60px; margin-bottom:8px;"><br>` : ""}
      <span class="fw-bold">${f.name || ''}</span>
      <div class="text-muted small">
        ${[
          f.region && `Region: ${f.region}`,
          f.district && `District: ${f.district}`,
          f.community && `Community: ${f.community}`,
          f.contact && `Contact: ${f.contact}`
        ].filter(Boolean).join(' | ')}
      </div>
    </div>
  `;

  container.innerHTML = `
    <style>
      @media (min-width: 768px) {
        .dashboard-row-equal {
          display: flex;
          flex-wrap: wrap;
        }
        .dashboard-row-equal > [class^='col-'] {
          display: flex;
          flex-direction: column;
        }
        .dashboard-row-equal .card {
          flex: 1 1 auto;
          height: 100%;
          min-height: 350px;
        }
      }
      @media (max-width: 767.98px) {
        .dashboard-row-equal .card {
          min-height: unset;
        }
      }
    </style>
    <div class="container my-4">
      ${meta}
      <div class="row mt-4 g-3 dashboard-row-equal">
        <div class="col-12 col-md-6 d-flex">
          <div class="card shadow mb-4 flex-fill">
            <div class="card-body d-flex flex-column">
              <h5><i class="bi bi-cloud-arrow-down"></i> Export & Backup</h5>
              <div class="list-group mb-3 flex-grow-1">
                <button class="list-group-item list-group-item-action" id="bulkExportBtn"><i class="bi bi-cloud-arrow-down me-2"></i> Bulk Export (Select Multiple)</button>
                <button class="list-group-item list-group-item-action" id="exportSetup"><i class="bi bi-cloud-arrow-up me-2"></i> Export Setup</button>
                <button class="list-group-item list-group-item-action" id="backupBtn"><i class="bi bi-download me-2"></i> Download Full Backup</button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-6 d-flex">
          <div class="card shadow mb-4 flex-fill">
            <div class="card-body d-flex flex-column">
              <h5><i class="bi bi-upload"></i> Import & Restore</h5>
              <div class="list-group mb-3 flex-grow-1">
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Bulk Import (Auto-detect Type)
                  <input type="file" id="bulkImportFile" hidden multiple accept=".json">
                </label>
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Restore Full Backup
                  <input type="file" id="restoreFile" hidden accept=".json">
                </label>
              </div>
              <div id="importMsg" class="small mt-2 text-muted"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="text-center mt-4">
        <a href="#user-dashboard" id="backToDashboardBtn" class="btn btn-link text-primary" style="font-size:1.1rem;">
          <i class="bi bi-arrow-left-circle-fill me-1"></i> Back to Dashboard
        </a>
      </div>
    </div>
  `;

  container.querySelector("#bulkExportBtn")?.addEventListener("click", () => {
    showBulkExportModal();
  });
  container.querySelector("#exportSetup")?.addEventListener("click", () => {
    const setupData = {
      facility: db.facility,
      settings: db.settings,
      users: db.users,
      registers: db.registers,
      roles: db.roles,
      servicesList: db.servicesList,
      customPatientFields: db.customPatientFields
    };
    const blob = new Blob([JSON.stringify(setupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "system-setup.json";
    a.click();
    URL.revokeObjectURL(url);
  });
  container.querySelector("#backupBtn")?.addEventListener("click", () => {
    const encrypted = exportUtils.encryptData(JSON.stringify(db));
    const blob = new Blob([encrypted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thynktech-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  });
  container.querySelector("#backToDashboardBtn")?.addEventListener("click", e => {
    e.preventDefault();
    window.location.hash = "#user-dashboard";
  });

  container.querySelector("#bulkImportFile")?.addEventListener("change", e => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    processBulkImport(files);
  });
  container.querySelector("#importPatients")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let data;
        try {

          data = JSON.parse(ev.target.result);
        } catch {
          try {

            const decoded = exportUtils.decryptData(ev.target.result);
            data = JSON.parse(decoded);
          } catch {

            try {
              const decoded = atob(ev.target.result);
              data = JSON.parse(decoded);
            } catch {
              throw new Error('Invalid file format. Please ensure you are importing a valid export file.');
            }
          }
        }
        
        let imported = 0;
        const patients = data.patients || [];
        
        patients.forEach(patient => {
          if (!db.patients.some(existing => 
            existing.patientID === patient.patientID || 
            (existing.id && patient.id && existing.id === patient.id)
          )) {
            db.patients.push(patient);
            imported++;
          }
        });
        
        saveDb();
        container.querySelector("#importMsg").textContent = `Successfully imported ${imported} patients.`;
        container.querySelector("#importMsg").className = "small mt-2 text-success";
      } catch (err) {
        container.querySelector("#importMsg").textContent = `Import failed: ${err.message}`;
        container.querySelector("#importMsg").className = "small mt-2 text-danger";
      }
    };
    reader.readAsText(file);
  });
  
  container.querySelector("#importVisits")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let data;
        try {

          data = JSON.parse(ev.target.result);
        } catch {
          try {

            const decoded = exportUtils.decryptData(ev.target.result);
            data = JSON.parse(decoded);
          } catch {

            try {
              const decoded = atob(ev.target.result);
              data = JSON.parse(decoded);
            } catch {
              throw new Error('Invalid file format. Please ensure you are importing a valid export file.');
            }
          }
        }
        
        let imported = 0;
        const visits = data.visits || [];
        
        visits.forEach(visit => {
          if (!db.visits.some(existing => 
            existing.visitID === visit.visitID || 
            (existing.id && visit.id && existing.id === visit.id)
          )) {
            db.visits.push(visit);
            imported++;
          }
        });
        
        saveDb();
        container.querySelector("#importMsg").textContent = `Successfully imported ${imported} visits.`;
        container.querySelector("#importMsg").className = "small mt-2 text-success";
      } catch (err) {
        container.querySelector("#importMsg").textContent = `Import failed: ${err.message}`;
        container.querySelector("#importMsg").className = "small mt-2 text-danger";
      }
    };
    reader.readAsText(file);
  });
  
  container.querySelector("#importServices")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let data;
        try {

          data = JSON.parse(ev.target.result);
        } catch {
          try {

            const decoded = exportUtils.decryptData(ev.target.result);
            data = JSON.parse(decoded);
          } catch {

            try {
              const decoded = atob(ev.target.result);
              data = JSON.parse(decoded);
            } catch {
              throw new Error('Invalid file format. Please ensure you are importing a valid export file.');
            }
          }
        }
        
        let imported = 0;
        const services = data.services || [];
        
        services.forEach(service => {
          if (!db.services.some(existing => 
            existing.serviceID === service.serviceID || 
            (existing.id && service.id && existing.id === service.id)
          )) {
            db.services.push(service);
            imported++;
          }
        });
        
        saveDb();
        container.querySelector("#importMsg").textContent = `Successfully imported ${imported} services.`;
        container.querySelector("#importMsg").className = "small mt-2 text-success";
      } catch (err) {
        container.querySelector("#importMsg").textContent = `Import failed: ${err.message}`;
        container.querySelector("#importMsg").className = "small mt-2 text-danger";
      }
    };
    reader.readAsText(file);
  });
  
  container.querySelector("#restoreFile")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!confirm('Are you sure you want to restore from backup? This will overwrite all current data.')) {
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let restored;
        try {

          restored = JSON.parse(ev.target.result);
        } catch {
          try {

            restored = JSON.parse(exportUtils.decryptData(ev.target.result));
          } catch {

            try {
              const decoded = atob(ev.target.result);
              restored = JSON.parse(decoded);
            } catch {
              throw new Error('Invalid backup file format. Please ensure you are importing a valid backup file.');
            }
          }
        }

        Object.keys(db).forEach(key => delete db[key]);
        Object.assign(db, restored);
        saveDb();
        
        container.querySelector("#importMsg").textContent = 'System restored successfully. Please reload the page.';
        container.querySelector("#importMsg").className = "small mt-2 text-success";

        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        container.querySelector("#importMsg").textContent = `Restore failed: ${err.message}`;
        container.querySelector("#importMsg").className = "small mt-2 text-danger";
      }
    };
    reader.readAsText(file);
  });
}

function exportAsExcel(data, filename) {

    if (!data.length) {
      alert("No data to export.");
      return;
    }
    const columns = Object.keys(data[0]);
    const csv = [
      columns.join(","),
      ...data.map(row => columns.map(col => `"${(row[col] ?? '').toString().replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

function exportSinglePatientPDF(patient) {
    const f = db.facility || {};
    const visits = (db.visits || []).filter(v => v.patientID === patient.patientID);
    const services = (db.services || []).filter(s => s.patientID === patient.patientID);

    const html = `
      <html>
      <head>
        <title>Patient Report - ${patient.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h2 { border-bottom: 1px solid #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #999; padding: 6px 8px; }
          th { background: #eee; }
          .facility-header { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
          .facility-meta { font-size: 0.95em; color: #555; margin-bottom: 20px; }
          .footer { margin-top:40px;font-size:12px;color:#888; }
          .logo { max-height: 60px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        ${f.image ? `<img src="${f.image}" class="logo"><br>` : ""}
        <div class="facility-header">${f.name || ''}</div>
        <div class="facility-meta">
          ${[
            f.region && `Region: ${f.region}`,
            f.district && `District: ${f.district}`,
            f.community && `Community: ${f.community}`,
            f.contact && `Contact: ${f.contact}`
          ].filter(Boolean).join(' | ')}
        </div>
        <h2>Patient Report</h2>
        <table>
          <tr><th>ID</th><td>${patient.patientID}</td></tr>
          <tr><th>Name</th><td>${patient.name}</td></tr>
          <tr><th>Date of Birth</th><td>${patient.dob || ''}</td></tr>
          <tr><th>Age</th><td>${patient.age || ''}</td></tr>
          <tr><th>Sex</th><td>${patient.sex || ''}</td></tr>
          <tr><th>Phone</th><td>${patient.phone || ''}</td></tr>
          <tr><th>Address</th><td>${patient.address || ''}</td></tr>
          <tr><th>ID Type</th><td>${patient.idType || ''}</td></tr>
          <tr><th>ID Number</th><td>${patient.idNumber || ''}</td></tr>
          <tr><th>Registration Date</th><td>${patient.registrationDate || ''}</td></tr>
        </table>
        <h3>Visits</h3>
        <table>
          <tr><th>Date</th><th>Service</th><th>Provider</th><th>Notes</th></tr>
          ${visits.map(v => `<tr>
            <td>${v.date || ''}</td>
            <td>${v.service || ''}</td>
            <td>${v.provider || ''}</td>
            <td>${v.notes || ''}</td>
          </tr>`).join('')}
        </table>
        <h3>Services Delivered</h3>
        <table>
          <tr><th>Date</th><th>Service</th><th>Provider</th><th>Outcome</th></tr>
          ${services.map(s => `<tr>
            <td>${s.date || ''}</td>
            <td>${s.service || ''}</td>
            <td>${s.provider || ''}</td>
            <td>${s.outcome || ''}</td>
          </tr>`).join('')}
        </table>
        <footer class="footer">
          Facility: ${f.name || ''} | Region: ${f.region || ''} | District: ${f.district || ''} | Community: ${f.community || ''} | Contact: ${f.contact || ''} | Generated: ${new Date().toLocaleString()}
        </footer>
      </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.print();
  }





if (typeof window.renderLogin === 'function') {
  const origRenderLogin = window.renderLogin;
  window.renderLogin = function(container) {
    origRenderLogin(container);

    if (!document.getElementById('userDataTools')) {
      const extra = document.createElement('div');
      extra.className = 'mt-4';
      extra.innerHTML = `
        <div class="card card-body mb-2">
          <h6 class="mb-2">Data Tools (before login)</h6>
          <button class="btn btn-outline-warning btn-sm" id="userImportSetupBtn">Import Setup</button>
        </div>
        <div id="userDataTools"></div>
      `;
      container.appendChild(extra);
      document.getElementById('userImportSetupBtn').onclick = () => {
        renderUserImportSetupUI(document.getElementById('userDataTools'));
      };
      console.log('[PATCH] Import Setup button added to login page');
    }
  };
}

function renderUserImportSetupUI(target) {
  target.innerHTML = `
    <div class="mb-2">
      <label class="form-label">Import Setup JSON (shared by Admin):</label>
      <input type="file" id="importSetupFile" accept="application/json" class="form-control mb-2">
      <div id="importSetupMsg" class="small text-muted mb-2"></div>
    </div>
  `;
  const fileInput = target.querySelector('#importSetupFile');
  const msg = target.querySelector('#importSetupMsg');
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let setupData = JSON.parse(ev.target.result);

        if (!setupData.users || !setupData.registers) {
          msg.textContent = 'Invalid setup file: missing users or registers.';
          msg.className = 'text-danger small mb-2';
          return;
        }

        db.facility = setupData.facility || {};
        db.settings = setupData.settings || {};
        db.users = setupData.users;
        db.roles = setupData.roles || [{ name: 'User', permissions: ['all'] }];
        db.registers = setupData.registers;
        db.servicesList = setupData.servicesList || [];
        db.customPatientFields = setupData.customPatientFields || [];

        db.currentUser = null;
        saveDb();
        msg.textContent = 'Setup imported! You can now log in with the credentials provided by your admin.';
        msg.className = 'text-success small mb-2';
      } catch (err) {
        msg.textContent = 'Failed to import setup: ' + (err.message || err);
        msg.className = 'text-danger small mb-2';
      }
    };
    reader.readAsText(file);
  };
}

export function renderImportExportDashboard(container) {
  const user = db.currentUser;
  if (!user) {
    window.location.hash = "#login";
    return;
  }

  const facility = db.facility || {};
  const facilityMeta = `
    <div class="facility-meta mb-3">
      ${facility.image ? `<img src="${facility.image}" alt="Facility Logo" style="max-height:60px; margin-bottom:8px;"><br>` : ""}
      <span class="fw-bold">${facility.name || ''}</span>
      <div class="text-muted small">
        ${[
          facility.region && `Region: ${facility.region}`,
          facility.district && `District: ${facility.district}`,
          facility.community && `Community: ${facility.community}`,
          facility.contact && `Contact: ${facility.contact}`
        ].filter(Boolean).join(' | ')}
      </div>
    </div>
  `;

  container.innerHTML = `
    <style>
      @media (min-width: 768px) {
        .dashboard-row-equal {
          display: flex;
          flex-wrap: wrap;
        }
        .dashboard-row-equal > [class^='col-'] {
          display: flex;
          flex-direction: column;
        }
        .dashboard-row-equal .card {
          flex: 1 1 auto;
          height: 100%;
          min-height: 350px;
        }
      }
      @media (max-width: 767.98px) {
        .dashboard-row-equal .card {
          min-height: unset;
        }
      }
    </style>
    <div class="container my-4">
      ${facilityMeta}
      <div class="row mt-4 g-3 dashboard-row-equal">
        <div class="col-12 col-md-6 d-flex">
          <div class="card shadow mb-4 flex-fill">
            <div class="card-body d-flex flex-column">
              <h5><i class="bi bi-cloud-arrow-down"></i> Export Data</h5>
              <div class="list-group mb-3 flex-grow-1">
                <button class="list-group-item list-group-item-action" id="exportPatients"><i class="bi bi-people me-2"></i> Export Patients</button>
                <button class="list-group-item list-group-item-action" id="exportVisits"><i class="bi bi-journal-medical me-2"></i> Export Visits</button>
                <button class="list-group-item list-group-item-action" id="exportServices"><i class="bi bi-ui-checks-grid me-2"></i> Export Services</button>
                <button class="list-group-item list-group-item-action" id="exportRegisters"><i class="bi bi-clipboard-data me-2"></i> Export Registers</button>
                <button class="list-group-item list-group-item-action" id="exportSetup"><i class="bi bi-cloud-arrow-up me-2"></i> Export Setup</button>
                <button class="list-group-item list-group-item-action" id="backupBtn"><i class="bi bi-download me-2"></i> Download Backup</button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-6 d-flex">
          <div class="card shadow mb-4 flex-fill">
            <div class="card-body d-flex flex-column">
              <h5><i class="bi bi-upload"></i> Import Data</h5>
              <div class="list-group mb-3 flex-grow-1">
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Import Patients
                  <input type="file" id="importPatients" hidden>
                </label>
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Import Visits
                  <input type="file" id="importVisits" hidden>
                </label>
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Import Services
                  <input type="file" id="importServices" hidden>
                </label>
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Restore Backup
                  <input type="file" id="restoreFile" hidden>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("exportPatients").onclick = () => exportUtils.exportPatientsJSON();
  document.getElementById("exportVisits").onclick = () => exportUtils.exportVisitsJSON();
  document.getElementById("exportServices").onclick = () => exportUtils.exportServiceDeliveryJSON();
  document.getElementById("exportRegisters").onclick = () => exportUtils.exportRegistersJSON();
  document.getElementById("exportSetup").onclick = () => {

    const user = db.currentUser;
    const assignedRegisters = Array.isArray(user.assignedRegisters) ? user.assignedRegisters : [];
    const assignedForms = (db.registers || []).filter(r => assignedRegisters.includes(r.name));
    const assignedServices = (db.servicesList || []).filter(s => 
      assignedRegisters.some(regName => 
        s.registerName === regName || s.category === regName || s.formType === regName
      )
    );
    
    const setupData = {
      facility: db.facility,
      settings: db.settings,
      users: [user], // Only current user
      registers: assignedForms,
      roles: db.roles,
      servicesList: assignedServices,
      customPatientFields: db.customPatientFields,
      exportInfo: {
        exportDate: new Date().toISOString(),
        exportedBy: user.username || 'user',
        userScope: user.username,
        assignedRegistersIncluded: assignedRegisters
      }
    };
    const blob = new Blob([JSON.stringify(setupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-setup-${user.username || 'current'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  document.getElementById("backupBtn").onclick = () => {
    const encrypted = encryptData(JSON.stringify(db));
    const blob = new Blob([encrypted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  };

  document.getElementById("importPatients").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let data;
        try {

          data = JSON.parse(ev.target.result);
        } catch {
          try {

            const decoded = decryptData(ev.target.result);
            data = JSON.parse(decoded);
          } catch {

            try {
              const decoded = atob(ev.target.result);
              data = JSON.parse(decoded);
            } catch {
              throw new Error('Invalid file format. Please ensure you are importing a valid export file.');
            }
          }
        }
        
        let imported = 0;
        const patients = data.patients || [];
        
        patients.forEach(patient => {
          if (!db.patients.some(existing => 
            existing.patientID === patient.patientID || 
            (existing.id && patient.id && existing.id === patient.id)
          )) {
            db.patients.push(patient);
            imported++;
          }
        });
        
        saveDb();
        alert(`Successfully imported ${imported} patients.`);
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };
  
  document.getElementById("importVisits").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let data;
        try {

          data = JSON.parse(ev.target.result);
        } catch {
          try {

            const decoded = decryptData(ev.target.result);
            data = JSON.parse(decoded);
          } catch {

            try {
              const decoded = atob(ev.target.result);
              data = JSON.parse(decoded);
            } catch {
              throw new Error('Invalid file format. Please ensure you are importing a valid export file.');
            }
          }
        }
        
        let imported = 0;
        const visits = data.visits || [];
        
        visits.forEach(visit => {
          if (!db.visits.some(existing => 
            existing.visitID === visit.visitID || 
            (existing.id && visit.id && existing.id === visit.id)
          )) {
            db.visits.push(visit);
            imported++;
          }
        });
        
        saveDb();
        alert(`Successfully imported ${imported} visits.`);
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };
  
  document.getElementById("importServices").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let data;
        try {

          data = JSON.parse(ev.target.result);
        } catch {
          try {

            const decoded = decryptData(ev.target.result);
            data = JSON.parse(decoded);
          } catch {

            try {
              const decoded = atob(ev.target.result);
              data = JSON.parse(decoded);
            } catch {
              throw new Error('Invalid file format. Please ensure you are importing a valid export file.');
            }
          }
        }
        
        let imported = 0;
        const services = data.services || [];
        
        services.forEach(service => {
          if (!db.services.some(existing => 
            existing.serviceID === service.serviceID || 
            (existing.id && service.id && existing.id === service.id)
          )) {
            db.services.push(service);
            imported++;
          }
        });
        
        saveDb();
        alert(`Successfully imported ${imported} services.`);
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };
  
  document.getElementById("restoreFile").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!confirm('Are you sure you want to restore from backup? This will overwrite all current data.')) {
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let restored;
        try {

          restored = JSON.parse(ev.target.result);
        } catch {
          try {

            restored = JSON.parse(decryptData(ev.target.result));
          } catch {

            try {
              const decoded = atob(ev.target.result);
              restored = JSON.parse(decoded);
            } catch {
              throw new Error('Invalid backup file format. Please ensure you are importing a valid backup file.');
            }
          }
        }

        Object.keys(db).forEach(key => delete db[key]);
        Object.assign(db, restored);
        saveDb();
        
        alert('System restored successfully. The page will reload now.');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        alert(`Restore failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };
}

function showBulkExportModal() {
  const modalHtml = `
    <div class="modal fade" id="bulkExportModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Bulk Export - Select Data Types</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Select which data types you want to export:</p>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="exportPatientsCheck" checked>
              <label class="form-check-label" for="exportPatientsCheck">
                <i class="bi bi-people me-2"></i>Patients
              </label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="exportVisitsCheck" checked>
              <label class="form-check-label" for="exportVisitsCheck">
                <i class="bi bi-journal-medical me-2"></i>Visits
              </label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="exportServicesCheck" checked>
              <label class="form-check-label" for="exportServicesCheck">
                <i class="bi bi-ui-checks-grid me-2"></i>Services
              </label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="exportRegistersCheck" checked>
              <label class="form-check-label" for="exportRegistersCheck">
                <i class="bi bi-clipboard-data me-2"></i>Registers
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="performBulkExport">Export Selected</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  showModal("Bulk Export", modalHtml);

  document.getElementById("performBulkExport")?.addEventListener("click", () => {
    const selectedTypes = [];
    
    if (document.getElementById("exportPatientsCheck")?.checked) {
      selectedTypes.push({ name: "patients", data: db.patients, filename: "patients" });
    }
    if (document.getElementById("exportVisitsCheck")?.checked) {
      selectedTypes.push({ name: "visits", data: db.visits, filename: "visits" });
    }
    if (document.getElementById("exportServicesCheck")?.checked) {
      selectedTypes.push({ name: "services", data: db.serviceDelivery, filename: "services" });
    }
    if (document.getElementById("exportRegistersCheck")?.checked) {
      selectedTypes.push({ name: "registers", data: db.registers, filename: "registers" });
    }
    
    if (selectedTypes.length === 0) {
      alert("Please select at least one data type to export.");
      return;
    }

    selectedTypes.forEach(type => {
      const blob = new Blob([JSON.stringify(type.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type.filename}-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url); 
      }, 100);
    });

    bootstrap.Modal.getInstance(document.getElementById("bulkExportModal"))?.hide();
    
    alert(`Successfully exported ${selectedTypes.length} data type(s)!`);
  });
}

function processBulkImport(files) {
  let processed = 0;
  let successful = 0;
  const total = files.length;
  
  if (total === 0) return;
  
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let data;
        try {

          data = JSON.parse(ev.target.result);
        } catch {

          try {
            const decoded = atob(ev.target.result);
            data = JSON.parse(decoded);
          } catch {

            try {
              const decoded = atob(ev.target.result);
              data = JSON.parse(decoded);
            } catch {
              throw new Error(`Invalid file format: ${file.name}`);
            }
          }
        }

        const imported = autoDetectAndImport(data, file.name);
        if (imported) successful++;
        
      } catch (err) {
        console.error(`Error importing ${file.name}:`, err);
        alert(`Failed to import ${file.name}: ${err.message}`);
      }
      
      processed++;
      if (processed === total) {
        alert(`Bulk import completed! Successfully imported ${successful} out of ${total} files.`);

        if (window.location.hash === "#user-dashboard") {
          window.location.reload();
        }
      }
    };
    reader.readAsText(file);
  });
}

function autoDetectAndImport(data, filename) {

  if (data.patients && data.visits && data.serviceDelivery && data.facility) {

    Object.keys(db).forEach(key => delete db[key]);
    Object.assign(db, data);
    saveDb();
    return true;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return false;
    
    const sample = data[0];

    if (sample.nhisId !== undefined || sample.name !== undefined || sample.dateOfBirth !== undefined || filename.includes('patient')) {
      if (!db.patients) db.patients = [];
      data.forEach(patient => {
        const existingIndex = db.patients.findIndex(p => p.nhisId === patient.nhisId || p.patientId === patient.patientId);
        if (existingIndex >= 0) {
          db.patients[existingIndex] = patient;
        } else {
          db.patients.push(patient);
        }
      });
      saveDb();
      return true;
    }

    if (sample.visitId !== undefined || sample.patientId !== undefined || sample.visitDate !== undefined || filename.includes('visit')) {
      if (!db.visits) db.visits = [];
      data.forEach(visit => {
        const existingIndex = db.visits.findIndex(v => v.visitId === visit.visitId);
        if (existingIndex >= 0) {
          db.visits[existingIndex] = visit;
        } else {
          db.visits.push(visit);
        }
      });
      saveDb();
      return true;
    }

    if (sample.serviceId !== undefined || sample.serviceName !== undefined || filename.includes('service')) {
      if (!db.serviceDelivery) db.serviceDelivery = [];
      data.forEach(service => {
        const existingIndex = db.serviceDelivery.findIndex(s => s.serviceId === service.serviceId);
        if (existingIndex >= 0) {
          db.serviceDelivery[existingIndex] = service;
        } else {
          db.serviceDelivery.push(service);
        }
      });
      saveDb();
      return true;
    }

    if (sample.registerId !== undefined || sample.registerName !== undefined || filename.includes('register')) {
      if (!db.registers) db.registers = [];
      data.forEach(register => {
        const existingIndex = db.registers.findIndex(r => r.registerId === register.registerId);
        if (existingIndex >= 0) {
          db.registers[existingIndex] = register;
        } else {
          db.registers.push(register);
        }
      });
      saveDb();
      return true;
    }
  }

  if (data.facility || data.users || data.settings || filename.includes('setup')) {
    if (data.facility) db.facility = data.facility;
    if (data.settings) db.settings = data.settings;
    if (data.users) db.users = data.users;
    if (data.registers) db.registers = data.registers;
    if (data.roles) db.roles = data.roles;
    if (data.servicesList) db.servicesList = data.servicesList;
    if (data.customPatientFields) db.customPatientFields = data.customPatientFields;
    saveDb();
    return true;
  }
  
  return false;
}