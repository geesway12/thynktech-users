/* patients.js – full version 2025-05 */

import { db, saveDb }               from './db.js';
import { generatePatientID }        from './idUtils.js';
import { calculateAge, formatDate } from './utils.js';
import { createVisitForm }          from './visits.js';
import { renderServiceEntryForm }   from './services.js';
import { renderAppointmentForm }    from './appointments.js';

// Supported data types (XLSForm style)
const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "integer", label: "Integer" },
  { value: "decimal", label: "Decimal" },
  { value: "select_one", label: "Single Select (select_one)" },
  { value: "select_multiple", label: "Multiple Select (select_multiple)" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "DateTime" },
  { value: "note", label: "Note/Label" },
  { value: "calculate", label: "Calculation" },
  { value: "image", label: "Image" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "file", label: "File Upload" },
  { value: "barcode", label: "Barcode" },
  { value: "qr_code", label: "QR Code" },
  { value: "geopoint", label: "Geopoint" },
  { value: "geotrace", label: "Geotrace" },
  { value: "geoshape", label: "Geoshape" }
];


// --- Patient registration field management (registers-style) ---
// Remove all old patient field logic and use registers-style add field logic for patient registration
// Use db.customPatientFields for patient fields, and showFieldFormPatient for modal
if (!db.customPatientFields) db.customPatientFields = [];

// Registers-style add field modal for patients
function showFieldFormPatient(field = {name:"", type:"text", required:false}, fidx=null) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content mx-auto" style="max-width:400px;">
      <h6>${fidx!==null ? "Edit Field" : "Add Field"}</h6>
      <form id="fieldForm">
        <div class="mb-2"><input class="form-control" id="fieldName" placeholder="Field Name" required value="${field.name||""}"></div>
        <div class="mb-2">
          <select class="form-select" id="fieldType" required>
            ${fieldTypes.map(t=>`<option value="${t.value}"${field.type===t.value?" selected":''}>${t.label}</option>`).join("")}
          </select>
        </div>
        <div class="mb-2 form-check">
          <input class="form-check-input" type="checkbox" id="fieldReq" ${field.required?"checked":''}>
          <label class="form-check-label" for="fieldReq">Required</label>
        </div>
        <div class="mb-2"><input class="form-control" id="fieldDefault" placeholder="Default Value" value="${field.default||""}"></div>
        <div class="mb-2"><input class="form-control" id="fieldConstraint" placeholder="Constraint/Validation (e.g. min=0,max=100)" value="${field.constraint||""}"></div>
        <div class="mb-2" id="choicesRow" style="display:${['select_one','select_multiple'].includes(field.type)?'block':'none'}">
          <input class="form-control" id="fieldChoices" placeholder="Choices (comma-separated, e.g. Yes,No,Unknown)" value="${field.choices||''}" ${['select_one','select_multiple'].includes(field.type)?'required':''}>
        </div>
        <div class="mb-2" id="calcRow" style="display:${field.type==='calculate'?'block':'none'}">
          <input class="form-control" id="fieldCalc" placeholder="Calculation Formula (e.g. today() - dob)" value="${field.calc||''}">
        </div>
        <div class="mb-2 d-flex justify-content-between">
          <button class="btn btn-primary">${fidx!==null?"Save":"Add"}</button>
          <button type="button" class="btn btn-secondary" id="cancelFieldBtn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = e => { if (e.target === modal) document.body.removeChild(modal); };
  modal.querySelector("#cancelFieldBtn").onclick = () => document.body.removeChild(modal);
  modal.querySelector("#fieldType").onchange = function() {
    const showChoices = ['select_one','select_multiple'].includes(this.value);
    modal.querySelector("#choicesRow").style.display = showChoices ? 'block' : 'none';
    modal.querySelector("#fieldChoices").required = showChoices;
    modal.querySelector("#calcRow").style.display = this.value==='calculate'?'block':'none';
  };
  modal.querySelector("#fieldForm").onsubmit = function(e) {
    e.preventDefault();
    let updated = {
      name: this.fieldName.value,
      type: this.fieldType.value,
      required: this.fieldReq.checked,
      default: this.fieldDefault.value,
      constraint: this.fieldConstraint.value,
    };
    if(['select_one','select_multiple'].includes(updated.type))
      updated.choices = this.fieldChoices.value;
    if(updated.type==='calculate')
      updated.calc = this.fieldCalc.value;
    if(fidx!==null) db.customPatientFields[fidx] = updated;
    else db.customPatientFields.push(updated);
    saveDb();
    document.body.removeChild(modal);
    if (typeof refreshFields === 'function') refreshFields();
  };
}
function refresh(filter={}) {
  let rows = db.patients || [];
  if (filter.id)    rows = rows.filter(r=>r.patientID?.includes(filter.id));
  if (filter.name)  rows = rows.filter(r=>r.name?.toLowerCase().includes(filter.name.toLowerCase()));
  if (filter.phone) rows = rows.filter(r=>r.phone?.includes(filter.phone));

  document.getElementById("listBody").innerHTML = rows.length === 0
    ? `<tr><td colspan="9" class="text-center text-muted">No patients found.</td></tr>`
    : rows.map((p,i)=>`
    <tr id="row-${p.patientID}"${filter.id && p.patientID?.toLowerCase().includes(filter.id.toLowerCase()) ? ' class="table-info"' : ''}>
      <td data-label="ID">${p.patientID||''}</td>
      <td data-label="Name">${p.name||''}</td>
      <td data-label="Reg Date">${formatDate(p.registrationDate)||''}</td>
      <td data-label="DOB">${formatDate(p.dob)||''}</td>
      <td data-label="Age">${p.age??''}</td>
      <td data-label="Sex">${p.sex||''}</td>
      <td data-label="Phone">${p.phone||''}</td>
      <td data-label="Family">${p.familyId||''}</td>
      <td data-label="Actions">
        <button class="btn btn-sm btn-primary me-1" data-i="${i}" data-act="view" title="View/Edit"><i class="bi bi-eye"></i></button>
        <button class="btn btn-sm btn-danger me-1" data-i="${i}" data-act="del" title="Delete"><i class="bi bi-trash"></i></button>
        <button class="btn btn-sm btn-outline-success me-1" data-i="${i}" data-act="visit" title="Log Visit"><i class="bi bi-journal-plus"></i></button>
        <button class="btn btn-sm btn-outline-secondary me-1" data-i="${i}" data-act="service" title="Service Entry"><i class="bi bi-ui-checks-grid"></i></button>
        <button class="btn btn-sm btn-outline-primary" data-i="${i}" data-act="appoint" title="Book Appointment"><i class="bi bi-calendar-plus"></i></button>
      </td>
    </tr>
    <tr class="visit-form-row d-none" data-form-i="${i}">
      <td colspan="9"><div class="visit-form-container"></div></td>
    </tr>`).join("");
  // Scroll to first match if searching by ID
  if (filter.id) {
    const matchRow = document.getElementById("row-" + filter.id);
    if (matchRow) {
      matchRow.scrollIntoView({ behavior: "smooth", block: "center" });
      matchRow.classList.add("table-success");
      setTimeout(()=>matchRow.classList.remove("table-success"), 2000);
    }
  }

  document.querySelectorAll("[data-act=view]").forEach(b => b.onclick = () => showForm(rows[b.dataset.i]));
  document.querySelectorAll("[data-act=del]").forEach(b => b.onclick = () => {
    if (confirm("Delete this patient?")) {
      db.patients.splice(b.dataset.i,1); saveDb(); refresh();
    }
  });
  document.querySelectorAll("[data-act=visit]").forEach(b => b.onclick = () => {
    const i = b.dataset.i;
    const patient = rows[i];
    const formRow = document.querySelector(`.visit-form-row[data-form-i="${i}"]`);
    const container = formRow.querySelector(".visit-form-container");
    // Toggle visibility
    const isVisible = !formRow.classList.contains("d-none");
    document.querySelectorAll(".visit-form-row").forEach(r => r.classList.add("d-none"));
    if (!isVisible) {
      container.innerHTML = "";
      container.appendChild(createVisitForm(patient, () => {
        setTimeout(() => formRow.classList.add("d-none"), 2000);
      }));
      formRow.classList.remove("d-none");
    }
  });
  document.querySelectorAll("[data-act=service]").forEach(b => b.onclick = () => {
    const i = b.dataset.i;
    const patient = rows[i];
    renderServiceEntryForm(patient, db.registers || []);
  });
  document.querySelectorAll("[data-act=appoint]").forEach(b => b.onclick = () => {
    const i = b.dataset.i;
    const patient = rows[i];
    renderAppointmentForm(patient);
  });
}

function attachFieldHandlers() {
  document.querySelectorAll(".editFieldBtn").forEach(btn => btn.onclick = () => showFieldFormPatient(db.customPatientFields[btn.dataset.fidx], btn.dataset.fidx));
  document.querySelectorAll(".deleteFieldBtn").forEach(btn => btn.onclick = () => {
    if (confirm("Delete this field? Data already captured for this field will be kept in old records.")) {
      db.customPatientFields.splice(btn.dataset.fidx,1); 
      saveDb();
      refreshFields();
    }
  });
  document.querySelectorAll(".moveUpBtn").forEach(btn => btn.onclick = () => {
    const i = +btn.dataset.fidx;
    if (i > 0) {
      [db.customPatientFields[i-1], db.customPatientFields[i]] = [db.customPatientFields[i], db.customPatientFields[i-1]];
      saveDb();
      refreshFields();
    }
  });
  document.querySelectorAll(".moveDownBtn").forEach(btn => btn.onclick = () => {
    const i = +btn.dataset.fidx;
    if (i < db.customPatientFields.length-1) {
      [db.customPatientFields[i], db.customPatientFields[i+1]] = [db.customPatientFields[i+1], db.customPatientFields[i]];
      saveDb();
      refreshFields();
    }
  });
}

function refreshFields() {
  document.querySelector("#customFieldList").innerHTML = (db.customPatientFields||[]).map((f,i) => renderFieldRow(f,i)).join("");
  attachFieldHandlers();
  // Attach change handlers for multi-select custom fields
  (db.customPatientFields||[]).forEach(field => {
    if (field.type === 'select_multiple') {
      const checkboxes = document.querySelectorAll(`input[id^="custom_${field.name}_"]`);
      const hiddenInput = document.getElementById(`custom_${field.name}`);
      if (checkboxes.length > 0 && hiddenInput) {
        checkboxes.forEach(cb => {
          cb.addEventListener('change', () => {
            const checked = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
            hiddenInput.value = checked.join(', ');
          });
        });
      }
    }
  });
}

// --- Main entry ---
export function renderPatientList(root) {
  root.innerHTML = `
    <div class="container my-4">
      <div class="d-flex justify-content-between align-items-center">
        <h4><i class="bi bi-people"></i> Patients</h4>
      </div>
      <div id="formAboveList"></div>
      <!-- search -->
      <form id="searchForm" class="row g-2 mb-3">
        <div class="col-md-2"><input name="id"    class="form-control" placeholder="ID"></div>
        <div class="col-md-3"><input name="name"  class="form-control" placeholder="Name"></div>
        <div class="col-md-2"><input name="phone" class="form-control" placeholder="Phone 024-xxx-xxxx"></div>
        <div class="col-md-2"><button class="btn btn-primary w-100"><i class="bi bi-search"></i> Search</button></div>
      </form>
      <!-- list -->
      <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle patient-table-mobile">
          <thead class="table-light">
            <tr>
              <th>ID</th><th>Name</th><th>Reg&nbsp;Date</th><th>DOB</th><th>Age</th>
              <th>Sex</th><th>Phone</th><th>Family</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="listBody"></tbody>
        </table>
      </div>
      <style>
      @media (max-width: 768px) {
        .patient-table-mobile thead { display: none; }
        .patient-table-mobile tr { display: block; margin-bottom: 1rem; border: 1px solid #dee2e6; border-radius: 8px; }
        .patient-table-mobile td { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; border: none; border-bottom: 1px solid #eee; }
        .patient-table-mobile td:last-child { border-bottom: none; }
        .patient-table-mobile td:before {
          content: attr(data-label);
          font-weight: bold;
          flex: 0 0 40%;
          color: #555;
        }
        .patient-table-mobile td { flex-direction: row; }
      }
      </style>
      <a href="#user-dashboard" class="btn btn-link mt-2"><i class="bi bi-arrow-left"></i> Back to Dashboard</a>
    </div>
  `;
  renderPatientFormAboveList();
  refresh();
  renderUpcomingAppointments();
// Render the patient form always above the list
function renderPatientFormAboveList() {
  const formAbove = document.getElementById('formAboveList');
  const today = new Date().toISOString().slice(0,10);
  formAbove.innerHTML = `
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="mb-3"><i class="bi bi-person-plus"></i> New Patient</h5>
        <form id="pForm">
          <label class="form-label mb-0">Date of Registration</label>
          <input  type="date" id="dor" class="form-control mb-2" value="${today}" max="${today}" required>
          <label class="form-label mb-0">Date of Birth</label>
          <input  type="date" id="dob" class="form-control" value="" max="${today}">
          <small id="ageLive" class="text-muted mb-2 d-block"></small>
          <input  id="name"  class="form-control mb-2" placeholder="Full Name" required value="">
          <label class="form-label mb-0">Family ID (optional)</label>
          <input id="familyId" class="form-control mb-2" placeholder="Family ID or Head of Household ID" value="">
          <select id="sex" class="form-select mb-2" required>
            <option value="">Sex</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
          <input id="phone" class="form-control mb-2" placeholder="Phone 024-xxx-xxxx" value="">
          <input id="address" class="form-control mb-2" placeholder="Address" value="">
          <select id="idType" class="form-select mb-2">
            <option value="">ID Type (optional)</option>
            <option value="NIN">National ID</option>
            <option value="DL">Driver's License</option>
            <option value="VOT">Voter's Card</option>
          </select>
          <input id="idNumber" class="form-control mb-3" placeholder="ID Number" value="">
          ${(db.customPatientFields||[]).map(f => renderCustomField(f, {})).join('')}
          <div class="mb-3">
            <button type="button" class="btn btn-sm btn-success" id="addFieldBtn"><i class="bi bi-plus"></i> Add Field</button>
            <ul class="list-group mt-2" id="customFieldList" style="z-index:10; position:relative;">
              ${(db.customPatientFields||[]).map((f,i) => renderFieldRow(f,i)).join("")}
            </ul>
          </div>
          <div class="d-flex justify-content-between">
            <button class="btn btn-primary">Add</button>
          </div>
        </form>
      </div>
    </div>
  `;
  // Add handlers for age, add field, and form submit
  const pForm = document.getElementById("pForm");
  const dobField = pForm.dob; const ageLabel = pForm.querySelector("#ageLive");
  const updateAge = () => ageLabel.textContent = dobField.value ? `Age: ${calculateAge(dobField.value)}` : "";
  dobField.addEventListener("input", updateAge); updateAge();
  document.getElementById("addFieldBtn").onclick = (e) => {
    e.preventDefault();
    showFieldFormPatient();
    // Ensure dropdown/modal appears under the patient form
    // (handled by modal CSS, but ensure scroll if needed)
    setTimeout(() => {
      const modal = document.querySelector('.modal-overlay .modal-content');
      if (modal) modal.scrollIntoView({behavior:'smooth', block:'center'});
    }, 100);
  };
  pForm.onsubmit = e => {
    e.preventDefault();
    const patient = {};
    patient.registrationDate = pForm.dor.value;
    patient.dob = pForm.dob.value;
    patient.name = pForm.name.value.trim();
    patient.familyId = pForm.familyId.value.trim();
    patient.sex = pForm.sex.value;
    patient.phone = pForm.phone.value.trim();
    patient.address = pForm.address.value.trim();
    patient.idType = pForm.idType.value;
    patient.idNumber = pForm.idNumber.value.trim();
    patient.age = patient.dob ? calculateAge(patient.dob) : '';
    patient.patientID = generatePatientID(pForm.dor.value);
    patient.customFields = {};
    (db.customPatientFields||[]).forEach(field => {
      const el = document.getElementById(`custom_${field.name}`);
      if (el) patient.customFields[field.name] = el.value;
    });
    db.patients.push(patient);
    saveDb();
    renderPatientList(document.getElementById('app'));
  };
  refreshFields();
}
// Show top 5 upcoming appointments for today in the right panel
function renderUpcomingAppointments() {
  const list = document.getElementById("upcomingAppointments");
  if (!list) return;
  const today = new Date().toISOString().slice(0, 10);
  const appts = (db.appointments || [])
    .filter(a => a.appointmentDate === today && a.status === "Scheduled")
    .sort((a, b) => {
      // If you have time info, sort by time, else by creation
      return (a.timestamp || 0) - (b.timestamp || 0);
    })
    .slice(0, 5);
  if (appts.length === 0) {
    list.innerHTML = `<li class="list-group-item text-muted">No appointments for today.</li>`;
    return;
  }
  list.innerHTML = appts.map(a => `
    <li class="list-group-item d-flex flex-column">
      <span><i class="bi bi-person"></i> <b>${a.patientName || a.patientID}</b></span>
      <span class="small text-muted"><i class="bi bi-activity"></i> ${a.serviceType || "-"}</span>
      <span class="small"><i class="bi bi-clock"></i> ${a.appointmentDate}</span>
    </li>
  `).join("");
}
}

  function close() {
    document.getElementById("modalWrap").className = "";
    document.getElementById("modalWrap").innerHTML = "";
  }

  function renderCustomField(field, existing) {
    // Render a form input for a custom field based on its type
    const value = (existing.customFields && existing.customFields[field.name]) || '';
    const id = `custom_${field.name}`;
    switch (field.type) {
      case 'text':
        return `<input id="${id}" class="form-control mb-2" placeholder="${field.label || field.name}" value="${value}">`;
      case 'integer':
        return `<input id="${id}" type="number" step="1" class="form-control mb-2" placeholder="${field.label || field.name}" value="${value}">`;
      case 'decimal':
        return `<input id="${id}" type="number" step="any" class="form-control mb-2" placeholder="${field.label || field.name}" value="${value}">`;
      case 'date':
        return `<input id="${id}" type="date" class="form-control mb-2" value="${value}">`;
      case 'select_one': {
        // Ensure choices is an array
        let choices = field.choices;
        if (typeof choices === 'string') choices = choices.split(',').map(s => s.trim()).filter(Boolean);
        if (!Array.isArray(choices)) choices = [];
        return `<select id="${id}" class="form-select mb-2">` +
          `<option value="">${field.label || field.name}</option>` +
          choices.map(opt => `<option value="${opt}"${value===opt?' selected':''}>${opt}</option>`).join('') +
          `</select>`;
      }
      case 'select_multiple': {
        let choices = field.choices;
        if (typeof choices === 'string') choices = choices.split(',').map(s => s.trim()).filter(Boolean);
        if (!Array.isArray(choices)) choices = [];
        // Render checkboxes and a hidden input to store comma-separated values
        return `<div class="mb-2">` +
          choices.map((opt, i) => {
            const checked = value.split(',').map(v=>v.trim()).includes(opt) ? 'checked' : '';
            return `<div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" id="${id}_${i}" value="${opt}" ${checked}>
              <label class="form-check-label" for="${id}_${i}">${opt}</label>
            </div>`;
          }).join('') +
          `<input type="hidden" id="${id}" value="${value}"></div>`;
      }
      case 'note':
        return `<div class="alert alert-secondary mb-2">${field.label || field.name}</div>`;
      default:
        return `<input id="${id}" class="form-control mb-2" placeholder="${field.label || field.name}" value="${value}">`;
    }
  }

  function renderFieldRow(field, idx) {
    // Render a row for the custom field in the custom field list
    return `<li class="list-group-item d-flex justify-content-between align-items-center">
      <span><b>${field.label || field.name}</b> <small class="text-muted">(${field.type})</small></span>
      <span>
        <button type="button" class="btn btn-sm btn-outline-primary editFieldBtn" data-fidx="${idx}"><i class="bi bi-pencil"></i></button>
        <button type="button" class="btn btn-sm btn-outline-danger deleteFieldBtn" data-fidx="${idx}"><i class="bi bi-trash"></i></button>
        <button type="button" class="btn btn-sm btn-outline-secondary moveUpBtn" data-fidx="${idx}"><i class="bi bi-arrow-up"></i></button>
        <button type="button" class="btn btn-sm btn-outline-secondary moveDownBtn" data-fidx="${idx}"><i class="bi bi-arrow-down"></i></button>
      </span>
    </li>`;
  }

  window.showFieldFormPatient = function(field = {name:"", type:"text", required:false}, fidx=null) {
    const fModal = document.createElement("div");
    fModal.className = "modal-overlay";
    fModal.innerHTML = `
      <div class="modal-content mx-auto" style="max-width:400px;">
        <h6>${fidx!==null ? "Edit Field" : "Add Field"}</h6>
        <form id="fieldForm">
          <div class="mb-2"><input class="form-control" id="fieldName" placeholder="Field Name" required value="${field.name||""}"></div>
          <div class="mb-2">
            <select class="form-select" id="fieldType" required>
              ${fieldTypes.map(t=>`<option value="${t.value}"${field.type===t.value?" selected":''}>${t.label}</option>`).join("")}
            </select>
          </div>
          <div class="mb-2 form-check">
            <input class="form-check-input" type="checkbox" id="fieldReq" ${field.required?"checked":''}>
            <label class="form-check-label" for="fieldReq">Required</label>
          </div>
          <div class="mb-2"><input class="form-control" id="fieldDefault" placeholder="Default Value" value="${field.default||""}"></div>
          <div class="mb-2"><input class="form-control" id="fieldConstraint" placeholder="Constraint/Validation (e.g. min=0,max=100)" value="${field.constraint||""}"></div>
          <div class="mb-2" id="choicesRow" style="display:${['select_one','select_multiple'].includes(field.type)?'block':'none'}">
            <input class="form-control" id="fieldChoices" placeholder="Choices (comma-separated, e.g. Yes,No,Unknown)" value="${field.choices||''}" ${['select_one','select_multiple'].includes(field.type)?'required':''}>
          </div>
          <div class="mb-2" id="calcRow" style="display:${field.type==='calculate'?'block':'none'}">
            <input class="form-control" id="fieldCalc" placeholder="Calculation Formula (e.g. today() - dob)" value="${field.calc||''}">
          </div>
          <div class="mb-2 d-flex justify-content-between">
            <button class="btn btn-primary">${fidx!==null?"Save":"Add"}</button>
            <button type="button" class="btn btn-secondary" id="cancelFieldBtn">Cancel</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(fModal);
    fModal.onclick = e => { if (e.target === fModal) document.body.removeChild(fModal); };
    fModal.querySelector("#cancelFieldBtn").onclick = () => document.body.removeChild(fModal);

    // Show/hide choices/calculation row
    fModal.querySelector("#fieldType").onchange = function() {
      const showChoices = ['select_one','select_multiple'].includes(this.value);
      fModal.querySelector("#choicesRow").style.display = showChoices ? 'block' : 'none';
      fModal.querySelector("#fieldChoices").required = showChoices;
      fModal.querySelector("#calcRow").style.display = this.value==='calculate'?'block':'none';
    };

    fModal.querySelector("#fieldForm").onsubmit = function(e) {
      e.preventDefault();
      let updated = {
        name: this.fieldName.value,
        type: this.fieldType.value,
        required: this.fieldReq.checked,
        default: this.fieldDefault.value,
        constraint: this.fieldConstraint.value,
      };
      if(['select_one','select_multiple'].includes(updated.type))
        updated.choices = this.fieldChoices.value;
      if(updated.type==='calculate')
        updated.calc = this.fieldCalc.value;
      if(fidx!==null) db.customPatientFields[fidx] = updated;
      else db.customPatientFields.push(updated);
      saveDb();
      document.body.removeChild(fModal);
      if (typeof refreshFields === 'function') refreshFields();
    };
  }

  function showForm(existing={}) {
    const today = new Date().toISOString().slice(0,10);
    const wrap  = document.getElementById("modalWrap");
    wrap.innerHTML = `
      <div class="modal-content mx-auto">
        <h5>${existing.patientID?"Edit":"New"} Patient</h5>
        <form id="pForm" class="mt-2">
          <label class="form-label mb-0">Date of Registration</label>
          <input  type="date" id="dor" class="form-control mb-2"
                  value="${existing.registrationDate||today}" max="${today}" required>

          <label class="form-label mb-0">Date of Birth</label>
          <input  type="date" id="dob" class="form-control" value="${existing.dob||''}" max="${today}">
          <small id="ageLive" class="text-muted mb-2 d-block"></small>

          <input  id="name"  class="form-control mb-2" placeholder="Full Name" required value="${existing.name||''}">

          <label class="form-label mb-0">Family ID (optional)</label>
          <input id="familyId" class="form-control mb-2" placeholder="Family ID or Head of Household ID" value="${existing.familyId||''}">

          <select id="sex" class="form-select mb-2" required>
            <option value="">Sex</option>
            <option value="M"${existing.sex==="M"?" selected":""}>Male</option>
            <option value="F"${existing.sex==="F"?" selected":""}>Female</option>
            <option value="O"${existing.sex==="O"?" selected":""}>Other</option>
          </select>

          <input id="phone" class="form-control mb-2" placeholder="Phone 024-xxx-xxxx" value="${existing.phone||''}">
          <input id="address" class="form-control mb-2" placeholder="Address" value="${existing.address||''}">

          <select id="idType" class="form-select mb-2">
            <option value="">ID Type (optional)</option>
            <option value="NIN"${existing.idType==="NIN"?" selected":""}>National ID</option>
            <option value="DL" ${existing.idType==="DL" ?" selected":""}>Driver's License</option>
            <option value="VOT"${existing.idType==="VOT"?" selected":""}>Voter's Card</option>
          </select>
          <input id="idNumber" class="form-control mb-3" placeholder="ID Number" value="${existing.idNumber||''}">

          ${ (db.customPatientFields||[]).map(f => renderCustomField(f, existing)).join('')}

          <div class="mb-3">
            <button type="button" class="btn btn-sm btn-success" id="addFieldBtn"><i class="bi bi-plus"></i> Add Custom Field</button>
            <ul class="list-group mt-2" id="customFieldList">
              ${(db.customPatientFields||[]).map((f,i) => renderFieldRow(f,i)).join("")}
            </ul>
          </div>

          <div class="d-flex justify-content-between">
            <button class="btn btn-primary">${existing.patientID?"Save":"Add"}</button>
            <button type="button" class="btn btn-secondary" id="cancelF">Cancel</button>
          </div>
        </form>
      </div>`;
    wrap.className="active";
    wrap.onclick=e=>{ if(e.target===wrap) close(); };
    document.getElementById("cancelF").onclick=close;

    const pForm = document.getElementById("pForm");
    const dobField = pForm.dob; const ageLabel = pForm.querySelector("#ageLive");
    const updateAge = () => ageLabel.textContent = dobField.value ? `Age: ${calculateAge(dobField.value)}` : "";
    dobField.addEventListener("input", updateAge); updateAge();

    // Initialize custom patient fields if not exists
    if (!db.customPatientFields) db.customPatientFields = [];

    // Add field button handler
    document.getElementById("addFieldBtn").onclick = () => showFieldFormPatient();

    // Save handler for add/edit patient
    pForm.onsubmit = e => {
      e.preventDefault();
      const today = new Date().toISOString().slice(0,10);
      // Validate no future dates
      if (pForm.dor.value > today) {
        alert("Registration date cannot be in the future.");
        return;
      }
      if (pForm.dob.value && pForm.dob.value > today) {
        alert("Date of birth cannot be in the future.");
        return;
      }
      const patient = existing.patientID ? existing : {};
      patient.registrationDate = pForm.dor.value;
      patient.dob = pForm.dob.value;
      patient.name = pForm.name.value.trim();
      patient.familyId = pForm.familyId.value.trim();
      patient.sex = pForm.sex.value;
      patient.phone = pForm.phone.value.trim();
      patient.address = pForm.address.value.trim();
      patient.idType = pForm.idType.value;
      patient.idNumber = pForm.idNumber.value.trim();
      // Calculate age
      patient.age = patient.dob ? calculateAge(patient.dob) : '';
      // Custom fields
      patient.customFields = patient.customFields || {};
      (db.customPatientFields||[]).forEach(field => {
        const el = document.getElementById(`custom_${field.name}`);
        if (el) patient.customFields[field.name] = el.value;
      });
      // Assign ID if new
      if (!patient.patientID) patient.patientID = generatePatientID();
      // Add or update in db
      if (!existing.patientID) {
        db.patients.push(patient);
      } else {
        const idx = db.patients.findIndex(p => p.patientID === patient.patientID);
        if (idx !== -1) db.patients[idx] = patient;
      }
      saveDb();
      close();
      if (typeof refresh === 'function') refresh();
    };

    // Edit, reorder, delete fields
    if (typeof attachFieldHandlers === 'function') attachFieldHandlers();

    function refreshFields() {
      document.querySelector("#customFieldList").innerHTML = (db.customPatientFields||[]).map((f,i) => renderFieldRow(f,i)).join("");
      if (typeof attachFieldHandlers === 'function') attachFieldHandlers();
    }
}

export { showForm as showPatientRegistrationModal };
