import { db, saveDb } from './db.js';

export function renderAppointmentForm(patient) {
  const container = document.getElementById('app');
  const today = new Date().toISOString().split('T')[0];

  // Only show registers assigned to the user, or all if none assigned
  const allowedRegs = (db.registers || []).filter(r =>
    !r.assignedUsers || r.assignedUsers.length === 0 ||
    (db.currentUser && r.assignedUsers.includes(db.currentUser.username))
  );

  container.innerHTML = `
    <div class="container py-3">
      <h4><i class="bi bi-calendar-plus"></i> Schedule Appointment for ${patient.name}</h4>
      <form id="appointmentForm" class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Service</label>
          <select class="form-select" id="appointmentService" required>
            <option value="">Select service</option>
            ${allowedRegs.map(r => `<option value="${r.name}">${r.name}</option>`).join("")}
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Appointment Date</label>
          <input type="date" class="form-control" id="appointmentDate" min="${today}" required>
        </div>
        <div class="col-md-12">
          <label class="form-label">Notes (optional)</label>
          <textarea class="form-control" id="appointmentNotes" rows="2"></textarea>
        </div>
        <div class="col-md-12">
          <button class="btn btn-primary" type="submit"><i class="bi bi-check2-circle"></i> Save Appointment</button>
          <a href="#appointments" class="btn btn-secondary ms-2">Cancel</a>
        </div>
        <div id="appointmentMsg" class="mt-3"></div>
      </form>
    </div>
  `;

  document.getElementById('appointmentForm').onsubmit = function (e) {
    e.preventDefault();
    const service = document.getElementById('appointmentService').value;
    const date = document.getElementById('appointmentDate').value;
    const notes = document.getElementById('appointmentNotes').value;

    if (!service || !date) {
      document.getElementById('appointmentMsg').innerHTML = `<div class="alert alert-danger">Service and date are required.</div>`;
      return;
    }

    db.appointments = db.appointments || [];
    db.appointments.push({
      patientID: patient.patientID,
      patientName: patient.name,
      serviceType: service,
      appointmentDate: date,
      notes,
      status: "Scheduled",
      createdBy: db.currentUser?.username || "",
      timestamp: Date.now()
    });

    saveDb();
    document.getElementById('appointmentMsg').innerHTML = `<div class="alert alert-success">Appointment saved successfully.</div>`;
    setTimeout(() => location.hash = '#appointments', 1200);
  };
}

export function renderAppointmentList(container) {
  container.innerHTML = `
    <div class="container py-3">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4><i class="bi bi-calendar-event"></i> Appointments</h4>
        <form id="searchAppointments" class="d-flex gap-2">
          <input class="form-control" type="text" id="searchTerm" placeholder="Search by Patient ID or Name" autocomplete="off">
          <button class="btn btn-outline-primary" type="submit"><i class="bi bi-search"></i></button>
        </form>
      </div>
      <div class="row g-3">
        <div class="col-md-6 col-lg-4">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <i class="bi bi-calendar-check fs-1 text-success"></i>
              <h6>Upcoming Appointments</h6>
              <ul class="list-group list-group-flush" id="upcomingAppointments"></ul>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-8">
          <div class="table-responsive">
            <table class="table table-bordered table-hover align-middle appointment-table-mobile">
              <thead class="table-light">
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="appointmentsBody"></tbody>
            </table>
          </div>
        </div>
      </div>
      <style>
      @media (max-width: 768px) {
        .appointment-table-mobile thead { display: none; }
        .appointment-table-mobile tr { display: block; margin-bottom: 1rem; border: 1px solid #dee2e6; border-radius: 8px; }
        .appointment-table-mobile td { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; border: none; border-bottom: 1px solid #eee; }
        .appointment-table-mobile td:last-child { border-bottom: none; }
        .appointment-table-mobile td:before {
          content: attr(data-label);
          font-weight: bold;
          flex: 0 0 40%;
          color: #555;
        }
        .appointment-table-mobile td { flex-direction: row; }
      }
      </style>
      <a href="#user-dashboard" class="btn btn-link mt-2"><i class="bi bi-arrow-left"></i> Back to Dashboard</a>
    </div>
  `;
  // Render top 10 upcoming appointments
  const upcoming = (db.appointments || [])
    .filter(a => a.status === 'Scheduled' && new Date(a.appointmentDate) >= new Date())
    .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
    .slice(0, 10);
  const upcomingList = document.getElementById('upcomingAppointments');
  if (upcoming.length) {
    upcoming.forEach(a => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.innerHTML = `<b>${a.patientName}</b> (${a.patientID})<br><span class="text-muted small">${a.appointmentDate} &ndash; ${a.serviceType}</span>`;
      upcomingList.appendChild(li);
    });
  } else {
    upcomingList.innerHTML = '<li class="list-group-item text-muted">No upcoming appointments</li>';
  }

  function renderRows(filter = "") {
    let rows = db.appointments || [];
    if (filter) {
      const term = filter.trim().toLowerCase();
      rows = rows.filter(a =>
        (a.patientID && a.patientID.toLowerCase().includes(term)) ||
        (a.patientName && a.patientName.toLowerCase().includes(term))
      );
    }
    // Sort by most recent and limit to top 20
    rows = rows.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

    document.getElementById("appointmentsBody").innerHTML = rows.length
      ? rows.map((a, i) => `
        <tr>
          <td data-label="Patient ID">${a.patientID}</td>
          <td data-label="Name">${a.patientName}</td>
          <td data-label="Service">${a.serviceType}</td>
          <td data-label="Date">${a.appointmentDate}</td>
          <td data-label="Notes">${a.notes || ""}</td>
          <td data-label="Status">
            <span class="badge ${a.status === "Completed" ? "bg-success" : "bg-warning text-dark"}">${a.status}</span>
          </td>
          <td data-label="Actions">
            ${a.status !== "Completed" ? `<button class="btn btn-sm btn-success" data-i="${i}" data-act="complete"><i class="bi bi-check2"></i> Mark Completed</button>` : ""}
            <button class="btn btn-sm btn-danger" data-i="${i}" data-act="delete"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="7" class="text-center text-muted">No appointments found.</td></tr>`;

    // Action handlers
    document.querySelectorAll("[data-act=complete]").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute("data-i"));
        const filteredRows = db.appointments
          .sort((a, b) => b.timestamp - a.timestamp)
          .filter(a =>
            (!filter || (a.patientID && a.patientID.toLowerCase().includes(filter.trim().toLowerCase())) ||
            (a.patientName && a.patientName.toLowerCase().includes(filter.trim().toLowerCase())))
          )
          .slice(0, 20);
        const appointment = filteredRows[idx];
        if (appointment) {
          appointment.status = "Completed";
          saveDb();
          renderRows(filter);
        }
      };
    });
    document.querySelectorAll("[data-act=delete]").forEach(btn => {
      btn.onclick = () => {
        if (confirm("Delete this appointment?")) {
          const idx = parseInt(btn.getAttribute("data-i"));
          const filteredRows = db.appointments
            .sort((a, b) => b.timestamp - a.timestamp)
            .filter(a =>
              (!filter || (a.patientID && a.patientID.toLowerCase().includes(filter.trim().toLowerCase())) ||
              (a.patientName && a.patientName.toLowerCase().includes(filter.trim().toLowerCase())))
            )
            .slice(0, 20);
          const appointment = filteredRows[idx];
          if (appointment) {
            db.appointments = db.appointments.filter(a => a !== appointment);
            saveDb();
            renderRows(filter);
          }
        }
      };
    });
  }

  renderRows();

  document.getElementById("searchAppointments").onsubmit = function (e) {
    e.preventDefault();
    const term = document.getElementById("searchTerm").value;
    renderRows(term);
  };
}
