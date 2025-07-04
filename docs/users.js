import { db, saveDb } from './db.js';
import { themePicker } from './app.js';
import { renderServiceVisitSelector } from './services.js';
import { encryptData, decryptData } from './export.js';

export function renderUserDashboard(container) {
  const user = db.currentUser;
  if (!user) {
    window.location.hash = "#login";
    return;
  }

  // Only show registers (forms) assigned to the user by admin
  const assignedRegisters = Array.isArray(user.assignedRegisters) ? user.assignedRegisters : [];
  const assignedForms = (db.registers || []).filter(r => assignedRegisters.includes(r.name));

  // Display facility metadata (logo, name, etc) at the top of the dashboard
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
    /* Ensure equal height for dashboard panels */
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
    <div class="d-flex justify-content-between align-items-center">
      <h4><i class="bi bi-person"></i> Welcome, <a href="#profile" id="userProfileLink" class="text-decoration-none text-dark"><i class="bi bi-person-gear"></i> <b>${user.username}</b></a></h4>
      ${themePicker}
    </div>
    <div class="row mt-4 g-3 dashboard-row-equal">
      <div class="col-12 col-md-6 d-flex">
        <div class="card shadow mb-4 flex-fill">
          <div class="card-body d-flex flex-column">
            <h5>Quick Actions</h5>
            <div class="list-group mb-3 flex-grow-1">
              ${user.canPatientReg ? `<a href="#patient-reg" class="list-group-item list-group-item-action"><i class="bi bi-person-plus me-2"></i>Patient Registration</a>` : ""}
              ${user.canVisitLog ? `<a href="#visit-log" class="list-group-item list-group-item-action"><i class="bi bi-journal-medical me-2"></i>Visit Logging</a>` : ""}
              <a href=\"#appointments\" class=\"list-group-item list-group-item-action\" id=\"appointmentsLink\"><i class=\"bi bi-calendar-event me-2\"></i>Appointments</a>
              <a href=\"#reports\" class=\"list-group-item list-group-item-action\"><i class=\"bi bi-bar-chart me-2\"></i>Reports</a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-6 d-flex">
        <div class="card shadow mb-4 flex-fill">
          <div class="card-body d-flex flex-column">
            <h5>Export & Data Sharing</h5>
            <div class="d-grid gap-2 flex-grow-1">
              <button class="btn btn-outline-info d-flex justify-content-start align-items-center" id="exportPatients">
                <i class="bi bi-table me-2"></i>Export Patients (Excel)
              </button>
              <button class="btn btn-outline-info d-flex justify-content-start align-items-center" id="exportVisits">
                <i class="bi bi-table me-2"></i>Export Visits (Excel)
              </button>
              <button class="btn btn-outline-info d-flex justify-content-start align-items-center" id="exportServices">
                <i class="bi bi-table me-2"></i>Export Services (Excel)
              </button>
              <button class="btn btn-outline-info d-flex justify-content-start align-items-center" id="exportSummary">
                <i class="bi bi-file-earmark-text me-2"></i>Export Summary (Excel)
              </button>
              <button class="btn btn-outline-secondary d-flex justify-content-start align-items-center" id="exportSingle">
                <i class="bi bi-file-earmark-pdf me-2"></i>Export Single Patient (PDF)
              </button>
              <button class="btn btn-outline-success d-flex justify-content-start align-items-center" id="chooseShareBtn">
                <i class="bi bi-arrow-up-right-circle me-2"></i>Share Data
              </button>
              <label class="btn btn-outline-primary d-flex justify-content-start align-items-center mb-0" style="cursor:pointer;">
                <i class="bi bi-upload me-2"></i>Import Data
                <input type="file" id="importSharedFile" hidden>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="shareModal" class="modal"></div>
    <div id="shareMsg" class="small mt-2 text-muted"></div>
    <div class="text-end mt-3">
      <button class="btn btn-outline-secondary" id="logoutBtn">
        <i class="bi bi-box-arrow-right"></i> Logout
      </button>
    </div>
    <button class="mobile-menu-btn" id="mobileMenuBtn">&#9776;</button>
    <nav class="desktop-menu">
      <!-- your normal nav links/buttons here -->
    </nav>
  </div>
  `;

  // Profile and password expiry logic moved to profile.js
  import('./profile.js').then(mod => {
    const { renderProfile, isPasswordExpired } = mod;
    if (isPasswordExpired(user)) {
      setTimeout(() => {
        alert("Your password has expired. Please update your password now.");
        renderProfile(container);
      }, 500);
    }
    setTimeout(() => {
      const profileLink = document.getElementById('userProfileLink');
      if (profileLink) {
        profileLink.onclick = (e) => {
          e.preventDefault();
          renderProfile(container);
        };
      }
    }, 100);
  });

  container.querySelector("#logoutBtn").onclick = () => {
    db.currentUser = null;
    saveDb();
    window.location.hash = "#login";
  };

  document.getElementById("mobileMenuBtn")?.addEventListener("click", function() {
    document.body.classList.toggle("show-mobile-menu");
  });

  // Export Data Features for Users (Excel/CSV)
  container.querySelector("#exportPatients").onclick = () => {
    exportAsExcel(db.patients || [], "patients-list.xlsx");
  };
  container.querySelector("#exportVisits").onclick = () => {
    exportAsExcel(db.visits || [], "visits-list.xlsx");
  };
  container.querySelector("#exportServices").onclick = () => {
    exportAsExcel(db.services || [], "services-list.xlsx");
  };
  container.querySelector("#exportSummary").onclick = () => {
    const summary = [{
      patients: (db.patients || []).length,
      visits: (db.visits || []).length,
      services: (db.services || []).length,
      registers: (db.registers || []).length
    }];
    exportAsExcel(summary, "summary-report.xlsx");
  };
  container.querySelector("#exportSingle").onclick = () => {
    const id = prompt("Enter Patient ID to export:");
    if (!id) return;
    const patient = (db.patients || []).find(p => p.id === id.trim() || p.patientID === id.trim());
    if (!patient) {
      alert("Patient not found.");
      return;
    }
    // Export as PDF (printable HTML)
    exportSinglePatientPDF(patient);
  };

  // Import Shared Data logic (decrypted JSON, improved ID checks)
  const importSharedInput = container.querySelector("#importSharedFile");
  if (importSharedInput) {
    importSharedInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        try {
          let shared;
          try {
            shared = JSON.parse(decryptData(ev.target.result));
          } catch {
            shared = JSON.parse(ev.target.result);
          }
          let newCount = { patients: 0, visits: 0, services: 0, registers: 0 };

          // Import patients
          shared.patients?.forEach(p => {
            if (!db.patients.some(existing =>
              (existing.id && p.id && existing.id === p.id) ||
              (existing.patientID && p.patientID && existing.patientID === p.patientID)
            )) {
              db.patients.push(p);
              newCount.patients++;
            }
          });

          // Import visits
          shared.visits?.forEach(v => {
            if (!db.visits.some(existing =>
              (existing.id && v.id && existing.id === v.id) ||
              (existing.visitID && v.visitID && existing.visitID === v.visitID)
            )) {
              db.visits.push(v);
              newCount.visits++;
            }
          });

          // Import services
          shared.services?.forEach(s => {
            if (!db.services.some(existing =>
              (existing.id && s.id && existing.id === s.id) ||
              (existing.serviceID && s.serviceID && existing.serviceID === s.serviceID)
            )) {
              db.services.push(s);
              newCount.services++;
            }
          });

          // Import registers (service forms)
          if (Array.isArray(shared.registers)) {
            // Replace all registers with the imported ones (to ensure up-to-date forms)
            db.registers = shared.registers;
            newCount.registers = shared.registers.length;
          }

          // Import other shared fields if present
          if (shared.servicesList) db.servicesList = shared.servicesList;
          if (shared.customPatientFields) db.customPatientFields = shared.customPatientFields;
          if (shared.facility) db.facility = shared.facility;
          if (shared.settings) db.settings = shared.settings;

          saveDb();
          container.querySelector("#shareMsg").innerHTML = `<div class="text-success">
            Imported: ${newCount.patients} patients, ${newCount.visits} visits, ${newCount.services} services${newCount.registers ? `, ${newCount.registers} registers` : ""}.<br>
            Registers and facility info updated.
          </div>`;
        } catch (err) {
          container.querySelector("#shareMsg").innerHTML = `<div class="text-danger">Import failed: Invalid or corrupted file.</div>`;
        }
      };
      reader.readAsText(file);
    });
  }

  // Share Data Feature (decrypted JSON, now includes registers)
  const chooseBtn = container.querySelector("#chooseShareBtn");
  const shareModal = container.querySelector("#shareModal");

  if (chooseBtn && shareModal) {
    chooseBtn.onclick = () => {
      shareModal.className = "active";
      // Dynamic register checkboxes for service entries
      const regSection = `
        <label class="form-label mt-3">Select Specific Registers (optional)</label>
        ${(db.registers || []).map(reg => `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${reg.name}" id="reg-${reg.name}">
            <label class="form-check-label" for="reg-${reg.name}">${reg.name}</label>
          </div>
        `).join("")}
      `;
      shareModal.innerHTML = `
        <div class="modal-content mx-auto">
          <h5>Select Data to Export</h5>
          <form id="shareForm">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="patients" id="sharePatients" checked>
              <label class="form-check-label" for="sharePatients">Patients</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="visits" id="shareVisits" checked>
              <label class="form-check-label" for="shareVisits">Visits</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="services" id="shareServices" checked>
              <label class="form-check-label" for="shareServices">Service Entries</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="registers" id="shareRegisters" checked>
              <label class="form-check-label" for="shareRegisters">Service Registers</label>
            </div>
            ${regSection}
            <div class="d-flex justify-content-between mt-3">
              <button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-check-circle"></i> Export</button>
              <button type="button" class="btn btn-secondary btn-sm" id="cancelShare"><i class="bi bi-x-circle"></i> Cancel</button>
            </div>
          </form>
        </div>`;
      document.getElementById("cancelShare").onclick = () => {
        shareModal.className = ""; shareModal.innerHTML = "";
      };
      document.getElementById("shareForm").onsubmit = e => {
        e.preventDefault();
        const toShare = {};
        if (document.getElementById("sharePatients").checked) toShare.patients = db.patients || [];
        if (document.getElementById("shareVisits").checked) toShare.visits = db.visits || [];
        if (document.getElementById("shareServices").checked) {
          const selectedRegs = Array.from(document.querySelectorAll("input[id^=reg-]:checked")).map(cb => cb.value);
          toShare.services = selectedRegs.length
            ? (db.services || []).filter(s => selectedRegs.includes(s.formName))
            : db.services || [];
        }
        if (document.getElementById("shareRegisters").checked) {
          toShare.registers = db.registers || [];
        }
        // For users, export as plain JSON (not encrypted)
        const blob = new Blob([JSON.stringify(toShare, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "shared-data.json";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        container.querySelector("#shareMsg").innerHTML = `<div class="text-success">Selected data shared as JSON. Share via USB or SD card.</div>`;
        shareModal.className = ""; shareModal.innerHTML = "";
      };
    };
  }

  container.querySelectorAll(".service-entry-link").forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      const url = new URL(this.href, window.location.origin);
      const service = url.searchParams.get("service");
      renderServiceVisitSelector(service, {
        onBack: () => renderUserDashboard(container)
      });
    });
  });

  // Appointments link: open appointment list page
  const appointmentsLink = container.querySelector("#appointmentsLink");
  if (appointmentsLink) {
    appointmentsLink.addEventListener("click", function(e) {
      e.preventDefault();
      // Dynamically import and render the appointment list
      import('./appointments.js').then(mod => {
        mod.renderAppointmentList(container);
      });
    });
  }

  // --- Export as Excel helper ---
  function exportAsExcel(data, filename) {
    // Simple CSV export for Excel compatibility
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

  // --- Export single patient as PDF (printable HTML) ---
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

  // --- Change Account, Logout, Mobile Menu, etc. remain unchanged ---
  // ...existing unchanged code...
}