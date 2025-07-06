// Imports
import { db, saveDb, loadDb } from './db.js';
import { registerServiceWorker } from './pwa.js';
import { renderPatientList } from './patients.js';
import { renderVisitLog } from './visits.js';
import { renderReports } from './reports.js';
import { renderServiceVisitSelector } from './services.js';
import { renderUserDashboard } from './users.js';
import { renderAppointmentForm } from './appointments.js';
import { renderLogin } from './auth.js';

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
    import('./utils.profile.js').then(mod => mod.renderProfile(app, {
      dashboardHash: '#user-dashboard',
      getUser: () => db.currentUser,
      updateUser: (user) => {
        const idx = db.users.findIndex(u => u.username === user.username);
        if (idx !== -1) db.users[idx] = { ...db.users[idx], ...user };
        db.currentUser = user;
        saveDb();
      },
      fieldLabels: {
        fullName: 'Full Name',
        contact: 'Phone',
      }
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

// ...existing code...
