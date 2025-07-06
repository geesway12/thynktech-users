/* patients.js – users version, adapted from admin 2025-07 */

import { db, saveDb }               from './db.js';
import { generatePatientID }        from './idUtils.js';
import { calculateAge, formatDate } from './utils.js';

export function renderPatientList(root) {
  if (!document.getElementById('modalWrap')) {
    const mw = document.createElement('div');
    mw.id = 'modalWrap';
    document.body.appendChild(mw);
  }
  root.innerHTML = `
    <div class="container my-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h4><i class="bi bi-people"></i> Patients</h4>
        <button id="showPatientFormBtn" class="btn btn-success btn-sm"><i class="bi bi-person-plus"></i> Add New Patient</button>
      </div>
      <form id="searchForm" class="d-flex gap-2 mb-3">
        <input name="id"    class="form-control form-control-sm" placeholder="ID">
        <input name="name"  class="form-control form-control-sm" placeholder="Name">
        <input name="phone" class="form-control form-control-sm" placeholder="Phone">
        <button class="btn btn-primary btn-sm"><i class="bi bi-search"></i></button>
      </form>
      <div id="formAboveList" style="display:none"></div>
      <div class="table-responsive" id="patientTableWrap">
        <table class="table table-bordered table-hover align-middle patient-table-mobile">
          <thead class="table-light">
            <tr>
              <th>ID</th><th>Name</th><th>Actions</th>
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
      <a href="#user-dashboard" class="btn btn-link mt-2"><i class="bi bi-arrow-left"></i> Back</a>
    </div>
  `;
  document.getElementById('showPatientFormBtn').onclick = () => {
    // ...show patient form logic (can be adapted from admin)
  };
  document.getElementById('searchForm').onsubmit = e => {
    e.preventDefault();
    const filter = Object.fromEntries(new FormData(e.target));
    refresh(filter, true);
  };
  refresh();
  function refresh(filter={}, scrollToMatch=false) {
    let rows = db.patients || [];
    rows = rows.slice().sort((a, b) => {
      const da = new Date(b.registrationDate || b.timestamp || 0);
      const db_ = new Date(a.registrationDate || a.timestamp || 0);
      return da - db_;
    });
    if (filter.id)    rows = rows.filter(r=>r.patientID?.includes(filter.id));
    if (filter.name)  rows = rows.filter(r=>r.name?.toLowerCase().includes(filter.name.toLowerCase()));
    if (filter.phone) rows = rows.filter(r=>r.phone?.includes(filter.phone));
    document.getElementById("listBody").innerHTML = rows.length === 0
      ? `<tr><td colspan="3" class="text-center text-muted">No patients found.</td></tr>`
      : rows.map((p,i)=>`
      <tr id="row-${p.patientID}"${filter.id && p.patientID?.toLowerCase().includes(filter.id.toLowerCase()) ? ' class="table-info"' : ''}>
        <td data-label="ID">${p.patientID||''}</td>
        <td data-label="Name">${p.name||''}</td>
        <td data-label="Actions">
          <button class="btn btn-sm btn-primary me-1" data-i="${i}" data-act="view" title="View/Edit"><i class="bi bi-eye"></i></button>
        </td>
      </tr>`).join("");
    document.querySelectorAll("[data-act=view]").forEach(b => b.onclick = () => showForm(rows[b.dataset.i]));
  }
  function showForm(existing={}) {
    // ...show patient detail/edit modal logic (can be adapted from admin)
  }
}
