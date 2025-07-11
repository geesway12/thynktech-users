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
    .apt-day-label { font-weight: bold; color: #2a2a2a; margin-bottom: 0.5rem; }
    .apt-day-list { margin-bottom: 1.2em; }
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
            </div>
            
            <!-- Export & Backup Quick Actions -->
            <div class="border-top pt-3">
              <h6 class="text-muted mb-2"><i class="bi bi-cloud-arrow-down me-1"></i> Export & Backup</h6>
              <div class="row g-2 mb-2">
                <div class="col-6">
                  <button class="btn btn-outline-primary btn-sm w-100" id="multiExportBtn">
                    <i class="bi bi-download me-1"></i>Export JSON
                  </button>
                </div>
                <div class="col-6">
                  <button class="btn btn-outline-success btn-sm w-100" id="csvExportBtn">
                    <i class="bi bi-file-earmark-csv me-1"></i>Export CSV
                  </button>
                </div>
              </div>
              <div class="row g-2 mb-2">
                <div class="col-6">
                  <button class="btn btn-outline-secondary btn-sm w-100" id="backupBtn">
                    <i class="bi bi-shield-lock me-1"></i>Backup
                  </button>
                </div>
                <div class="col-6">
                  <button class="btn btn-outline-warning btn-sm w-100" onclick="document.getElementById('restoreFile').click()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Restore
                  </button>
                  <input type="file" id="restoreFile" accept=".json" style="display:none;">
                </div>
              </div>
              <div id="backupMsg" class="mt-2"></div>
            </div>
            <div id="dashboardDataTools"></div>
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <div class="theme-picker">
                <button class="btn btn-outline-secondary btn-sm" id="themePickerBtn" title="Change Theme">
                  <i class="bi bi-palette me-1"></i><span class="d-none d-md-inline">Theme</span>
                </button>
                <div class="theme-dropdown" id="themeDropdown">
                  <div class="theme-option" data-theme="blue">
                    <span class="theme-swatch" style="background: #1976d2;"></span>
                    Ocean Blue
                  </div>
                  <div class="theme-option" data-theme="green">
                    <span class="theme-swatch" style="background: #2e7d32;"></span>
                    Forest Green
                  </div>
                  <div class="theme-option" data-theme="purple">
                    <span class="theme-swatch" style="background: #7b1fa2;"></span>
                    Royal Purple
                  </div>
                  <div class="theme-option" data-theme="orange">
                    <span class="theme-swatch" style="background: #f57c00;"></span>
                    Warm Orange
                  </div>
                  <div class="theme-option" data-theme="teal">
                    <span class="theme-swatch" style="background: #00695c;"></span>
                    Deep Teal
                  </div>
                  <div class="theme-option" data-theme="gold">
                    <span class="theme-swatch" style="background: #ff8f00;"></span>
                    Golden Yellow
                  </div>
                  <div class="theme-option" data-theme="gray">
                    <span class="theme-swatch" style="background: #424242;"></span>
                    Neutral Gray
                  </div>
                  <div class="theme-option" data-theme="mint">
                    <span class="theme-swatch" style="background: #00796b;"></span>
                    Fresh Mint
                  </div>
                  <div class="theme-option" data-theme="coral">
                    <span class="theme-swatch" style="background: #d84315;"></span>
                    Coral Red
                  </div>
                  <div class="theme-option" data-theme="dark">
                    <span class="theme-swatch" style="background: #121212; border-color: #666;"></span>
                    Dark Mode
                  </div>
                </div>
              </div>
              <a href="#profile" id="userProfileLink" class="btn btn-outline-secondary"><i class="bi bi-person-gear"></i> Profile</a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-6 d-flex">
        <div class="card shadow mb-4 flex-fill">
          <div class="card-body d-flex flex-column">
            <h5><i class="bi bi-calendar-event"></i> Upcoming Appointments (This Week)</h5>
            <div id="upcomingAppointments" class="mb-3 flex-grow-1"></div>
            <div id="shareMsg" class="small mt-2 text-muted"></div>
            <div class="text-end mt-3">
              <button class="btn btn-outline-secondary" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Logout</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Multi-Select Export Modal -->
    <div id="multiExportModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000;">
      <div class="modal-content mx-auto mt-5" style="max-width:500px; background:white; border-radius:8px; padding:20px;">
        <h5><i class="bi bi-download me-2"></i>Export Data (JSON)</h5>
        <p class="text-muted small">Select data types to export for sharing with another device:</p>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="exportPatients" checked>
          <label class="form-check-label" for="exportPatients">Patients (${(db.patients || []).length} records)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="exportVisits" checked>
          <label class="form-check-label" for="exportVisits">Visits (${(db.visits || []).length} records)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="exportServices">
          <label class="form-check-label" for="exportServices">Service Entries (${Object.keys(db.serviceEntries || {}).reduce((sum, key) => sum + (db.serviceEntries[key] || []).length, 0)} records)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="exportAppointments">
          <label class="form-check-label" for="exportAppointments">Appointments (${(db.appointments || []).length} records)</label>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="exportRegisters">
          <label class="form-check-label" for="exportRegisters">Registers/Forms (${(db.registers || []).length} records)</label>
        </div>
        <div class="d-flex justify-content-between">
          <button class="btn btn-primary" id="executeExport"><i class="bi bi-download me-1"></i>Export Selected</button>
          <button class="btn btn-secondary" id="cancelExport">Cancel</button>
        </div>
      </div>
    </div>
    
    <!-- CSV Export Modal -->
    <div id="csvExportModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000;">
      <div class="modal-content mx-auto mt-5" style="max-width:500px; background:white; border-radius:8px; padding:20px;">
        <h5><i class="bi bi-file-earmark-csv me-2"></i>Export CSV (De-identified)</h5>
        <p class="text-muted small">Export data as CSV files for external use. Personal identifiers will be removed:</p>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="csvPatients" checked>
          <label class="form-check-label" for="csvPatients">Patients (anonymized)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="csvVisits" checked>
          <label class="form-check-label" for="csvVisits">Visits (anonymized)</label>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="csvServices">
          <label class="form-check-label" for="csvServices">Service Entries (anonymized)</label>
        </div>
        <div class="d-flex justify-content-between">
          <button class="btn btn-success" id="executeCsvExport"><i class="bi bi-file-earmark-csv me-1"></i>Export CSV</button>
          <button class="btn btn-secondary" id="cancelCsvExport">Cancel</button>
        </div>
      </div>
    </div>
    
  </div>
  `;


  const upcomingDiv = container.querySelector('#upcomingAppointments');
  if (upcomingDiv) {
    const today = new Date();

    const weekMap = {};
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);
      weekMap[dateStr] = [];
    }
    (db.appointments || []).forEach(apt => {
      if (!apt.appointmentDate) return;
      if (weekMap[apt.appointmentDate] !== undefined) {
        weekMap[apt.appointmentDate].push(apt);
      }
    });

    let html = '';
    Object.keys(weekMap).forEach(dateStr => {
      const dateObj = new Date(dateStr);
      const dayLabel = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      const apts = weekMap[dateStr];
      html += `<div class="apt-day-list">
        <div class="apt-day-label">${dayLabel}</div>`;
      if (apts.length) {
        html += '<ul class="list-group list-group-flush">' +
          apts.map(apt => {
            let statusBadge = `<span class="badge bg-${apt.status === 'Completed' ? 'success' : 'primary'} ms-2">${apt.status}</span>`;

            const aptDate = new Date(apt.appointmentDate);
            const now = new Date();

            aptDate.setHours(0,0,0,0);
            now.setHours(0,0,0,0);
            const daysDiff = Math.floor((aptDate - now) / (1000 * 60 * 60 * 24));
            let indicatorColor = '';
            let indicatorText = '';
            if (daysDiff < 0) {
              indicatorColor = 'danger';
              indicatorText = 'Missed';
            } else if (daysDiff < 3) {
              indicatorColor = 'warning';
              indicatorText = daysDiff === 0 ? 'Today' : `${daysDiff} day${daysDiff === 1 ? '' : 's'}`;
            } else {
              indicatorColor = 'success';
              indicatorText = `${daysDiff} days`;
            }
            return `<li class="list-group-item d-flex align-items-center justify-content-between py-2">
              <div>
                <i class="bi bi-person-circle me-1"></i>
                <b>${apt.patientName || apt.patientID}</b>
                <span class="text-muted small ms-2">${apt.serviceType || ''}</span>
              </div>
              <div>
                <span class="badge bg-${indicatorColor} me-2">${indicatorText}</span>
                ${statusBadge}
              </div>
            </li>`;
          }).join('') + '</ul>';
      } else {
        html += '<div class="text-muted small">No appointments.</div>';
      }
      html += '</div>';
    });
    upcomingDiv.innerHTML = html;
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

  const multiExportBtn = container.querySelector("#multiExportBtn");
  const multiExportModal = container.querySelector("#multiExportModal");
  
  if (multiExportBtn) {
    multiExportBtn.onclick = () => {
      multiExportModal.style.display = "block";
    };
  }
  
  const cancelExportBtn = container.querySelector("#cancelExport");
  if (cancelExportBtn) {
    cancelExportBtn.onclick = () => {
      multiExportModal.style.display = "none";
    };
  }
  
  const executeExportBtn = container.querySelector("#executeExport");
  if (executeExportBtn) {
    executeExportBtn.onclick = () => {
      const selectedData = {};
      let filename = "export";
      
      if (container.querySelector("#exportPatients").checked) {
        selectedData.patients = db.patients || [];
        filename += "_patients";
      }
      if (container.querySelector("#exportVisits").checked) {
        selectedData.visits = db.visits || [];
        filename += "_visits";
      }
      if (container.querySelector("#exportServices").checked) {
        selectedData.serviceEntries = db.serviceEntries || {};
        filename += "_services";
      }
      if (container.querySelector("#exportAppointments").checked) {
        selectedData.appointments = db.appointments || [];
        filename += "_appointments";
      }
      if (container.querySelector("#exportRegisters").checked) {
        selectedData.registers = db.registers || [];
        selectedData.customPatientFields = db.customPatientFields || [];
        filename += "_registers";
      }
      
      if (Object.keys(selectedData).length === 0) {
        alert("Please select at least one data type to export.");
        return;
      }

      selectedData.meta = {
        facility: db.facility || {},
        exported: new Date().toISOString(),
        exportType: "multi-select"
      };
      
      const encrypted = exportUtils.encryptData(JSON.stringify(selectedData, null, 2));
      const blob = new Blob([encrypted], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url); 
      }, 100);
      
      multiExportModal.style.display = "none";
    };
  }

  const csvExportBtn = container.querySelector("#csvExportBtn");
  const csvExportModal = container.querySelector("#csvExportModal");
  
  if (csvExportBtn) {
    csvExportBtn.onclick = () => {
      csvExportModal.style.display = "block";
    };
  }
  
  const cancelCsvExportBtn = container.querySelector("#cancelCsvExport");
  if (cancelCsvExportBtn) {
    cancelCsvExportBtn.onclick = () => {
      csvExportModal.style.display = "none";
    };
  }
  
  const executeCsvExportBtn = container.querySelector("#executeCsvExport");
  if (executeCsvExportBtn) {
    executeCsvExportBtn.onclick = () => {

      const anonymizePatientData = (patients) => {
        return patients.map((p, index) => ({
          id: `PATIENT_${String(index + 1).padStart(4, '0')}`,
          ageGroup: p.age ? (p.age < 18 ? 'Under 18' : p.age < 65 ? '18-64' : '65+') : '',
          sex: p.sex || '',
          registrationDate: p.registrationDate || '',
          region: db.facility?.region || '',
          district: db.facility?.district || '',
          facilityType: 'Health Facility'
        }));
      };
      
      const anonymizeVisitData = (visits) => {
        const patientMap = {};
        (db.patients || []).forEach((p, index) => {
          patientMap[p.patientID] = `PATIENT_${String(index + 1).padStart(4, '0')}`;
        });
        
        return visits.map(v => ({
          anonymizedPatientId: patientMap[v.patientID] || 'UNKNOWN',
          visitDate: v.date || v.visitDate || '',
          serviceType: v.service || v.serviceType || '',
          outcome: v.outcome || '',
          region: db.facility?.region || '',
          facility: db.facility?.name || ''
        }));
      };
      
      if (container.querySelector("#csvPatients").checked) {
        const anonymizedPatients = anonymizePatientData(db.patients || []);
        const csv = convertToCSV(anonymizedPatients);
        downloadCSV(csv, 'anonymized_patients.csv');
      }
      
      if (container.querySelector("#csvVisits").checked) {
        const anonymizedVisits = anonymizeVisitData(db.visits || []);
        const csv = convertToCSV(anonymizedVisits);
        downloadCSV(csv, 'anonymized_visits.csv');
      }
      
      if (container.querySelector("#csvServices").checked) {

        const allServices = [];
        Object.keys(db.serviceEntries || {}).forEach(regName => {
          (db.serviceEntries[regName] || []).forEach(entry => {
            allServices.push({
              anonymizedPatientId: `PATIENT_${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
              serviceType: regName,
              entryDate: entry.visitDate || '',
              region: db.facility?.region || '',
              facility: db.facility?.name || ''
            });
          });
        });
        const csv = convertToCSV(allServices);
        downloadCSV(csv, 'anonymized_services.csv');
      }
      
      csvExportModal.style.display = "none";
    };
  }

  function convertToCSV(data) {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    return csvContent;
  }
  
  function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  const backupBtn = container.querySelector("#backupBtn");
  if (backupBtn) {
    backupBtn.onclick = () => {
      const backupData = {
        ...db,
        timestamp: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    };
  }

  const restoreInput = container.querySelector("#restoreFile");
  if (restoreInput) {
    restoreInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm("Are you sure you want to restore from backup? This will overwrite all current data.")) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        try {
          let decrypted;
          try {
            decrypted = exportUtils.decryptData(ev.target.result);
          } catch {
            decrypted = ev.target.result; // Fallback to plain text (legacy)
          }
          const restored = JSON.parse(decrypted);
          Object.keys(db).forEach(k => delete db[k]);
          Object.assign(db, restored);
          saveDb();
          container.querySelector("#backupMsg").innerHTML = `<div class="text-success">Restore complete. Please reload the page.</div>`;
        } catch (err) {
          container.querySelector("#backupMsg").innerHTML = `<div class="text-danger">Restore failed: Invalid or corrupted encrypted file.</div>`;
        }
      };
      reader.readAsText(file);
    });
  }



  const themePickerBtn = container.querySelector('#themePickerBtn');
  const themeDropdown = container.querySelector('#themeDropdown');
  
  if (themePickerBtn && themeDropdown) {

    const savedTheme = localStorage.getItem('userTheme') || 'blue';
    applyTheme(savedTheme);
    updateThemePickerUI(savedTheme);

    themePickerBtn.onclick = (e) => {
      e.stopPropagation();
      const isVisible = themeDropdown.style.display === 'block';
      themeDropdown.style.display = isVisible ? 'none' : 'block';
    };

    themeDropdown.querySelectorAll('.theme-option').forEach(option => {
      option.onclick = (e) => {
        e.stopPropagation();
        const theme = option.dataset.theme;
        applyTheme(theme);
        localStorage.setItem('userTheme', theme);
        updateThemePickerUI(theme);
        themeDropdown.style.display = 'none';
      };
    });

    document.addEventListener('click', () => {
      themeDropdown.style.display = 'none';
    });
  }

  function applyTheme(theme) {

    document.body.classList.remove(
      'theme-blue', 'theme-green', 'theme-purple', 'theme-orange', 
      'theme-teal', 'theme-gold', 'theme-gray', 'theme-dark', 
      'theme-mint', 'theme-coral'
    );

    document.body.classList.add(`theme-${theme}`);
  }
  
  function updateThemePickerUI(activeTheme) {
    const themeOptions = container.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.classList.toggle('active', option.dataset.theme === activeTheme);
    });
  }
} // <-- End renderUserDashboard

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

function processUserBulkImport(files, container) {
  let totalImported = { patients: 0, visits: 0, services: 0, registers: 0, appointments: 0 };
  let processedFiles = 0;
  
  Array.from(files).forEach(file => {
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

        if (data.patients) {
          data.patients.forEach(patient => {
            if (!db.patients.some(existing => 
              existing.patientID === patient.patientID || 
              (existing.id && patient.id && existing.id === patient.id)
            )) {
              db.patients.push(patient);
              totalImported.patients++;
            }
          });
        }
        
        if (data.visits) {
          data.visits.forEach(visit => {
            if (!db.visits.some(existing => 
              existing.visitID === visit.visitID || 
              (existing.id && visit.id && existing.id === visit.id)
            )) {
              db.visits.push(visit);
              totalImported.visits++;
            }
          });
        }
        
        if (data.services || data.serviceDelivery) {
          const services = data.services || data.serviceDelivery || [];
          services.forEach(service => {
            if (!db.serviceDelivery.some(existing => 
              existing.serviceID === service.serviceID || 
              (existing.id && service.id && existing.id === service.id)
            )) {
              db.serviceDelivery.push(service);
              totalImported.services++;
            }
          });
        }
        
        if (data.registers) {
          data.registers.forEach(register => {
            if (!db.registers.some(existing => 
              existing.name === register.name || 
              (existing.id && register.id && existing.id === register.id)
            )) {
              db.registers.push(register);
              totalImported.registers++;
            }
          });
        }
        
        if (data.appointments) {
          data.appointments.forEach(appointment => {
            if (!db.appointments.some(existing => 
              existing.id === appointment.id || 
              (existing.patientID === appointment.patientID && existing.appointmentDate === appointment.appointmentDate)
            )) {
              db.appointments.push(appointment);
              totalImported.appointments++;
            }
          });
        }
        
        processedFiles++;

        if (processedFiles === files.length) {
          saveDb();
          const importSummary = Object.entries(totalImported)
            .filter(([key, count]) => count > 0)
            .map(([key, count]) => `${count} ${key}`)
            .join(', ');
          
          container.querySelector("#importMsg").textContent = importSummary 
            ? `Successfully imported: ${importSummary}` 
            : "No new data imported (all data already exists)";
          container.querySelector("#importMsg").className = "small mt-2 text-success";
        }
        
      } catch (err) {
        processedFiles++;
        if (processedFiles === files.length) {
          container.querySelector("#importMsg").textContent = `Import failed: ${err.message}`;
          container.querySelector("#importMsg").className = "small mt-2 text-danger";
        }
      }
    };
    reader.readAsText(file);
  });
}