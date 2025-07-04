import { db } from './db.js';
import { themePicker } from './app.js';

// Simple chart generator using Chart.js CDN
function loadChartJs(cb) {
  if (window.Chart) return cb();
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/chart.js";
  script.onload = cb;
  document.head.appendChild(script);
}

export function renderReports(container) {
  container.innerHTML = `
    <div class="container my-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4><i class="bi bi-bar-chart"></i> Reports & Analytics</h4>
        ${themePicker}
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h6 class="card-title">Patient Summary</h6>
              <table class="table table-bordered mb-0">
                <tr><th>Total Patients</th><td>${db.patients.length}</td></tr>
                <tr><th>Male</th><td>${db.patients.filter(p=>p.sex==="M").length}</td></tr>
                <tr><th>Female</th><td>${db.patients.filter(p=>p.sex==="F").length}</td></tr>
                <tr><th>Other</th><td>${db.patients.filter(p=>p.sex==="O").length}</td></tr>
              </table>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h6 class="card-title">Visits Summary</h6>
              <table class="table table-bordered mb-0">
                <tr><th>Total Visits</th><td>${db.visits.length}</td></tr>
                <tr><th>Unique Patients Visited</th><td>${[...new Set(db.visits.map(v=>v.patientID))].length}</td></tr>
                <tr><th>Most Recent Visit</th><td>${db.visits.length ? db.visits[db.visits.length-1].visitDate || '' : ''}</td></tr>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3 mt-3">
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h6 class="card-title">Patients by Sex</h6>
              <canvas id="sexPie" height="180"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h6 class="card-title">Visits Trend (Last 12 Months)</h6>
              <canvas id="visitTrend" height="180"></canvas>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3 mt-3">
        <div class="col-md-12">
          <div class="card shadow-sm">
            <div class="card-body">
              <h6 class="card-title">Top 5 Services Delivered</h6>
              <canvas id="serviceBar" height="220"></canvas>
            </div>
          </div>
        </div>
      </div>
      <a href="#admin-dashboard" class="btn btn-link mt-3"><i class="bi bi-arrow-left"></i> Back</a>
    </div>
  `;

  // Render charts after Chart.js loads
  loadChartJs(() => {
    // Pie: Patients by Sex
    const sexCounts = [
      db.patients.filter(p=>p.sex==="M").length,
      db.patients.filter(p=>p.sex==="F").length,
      db.patients.filter(p=>p.sex==="O").length
    ];
    new Chart(document.getElementById('sexPie'), {
      type: 'pie',
      data: {
        labels: ['Male', 'Female', 'Other'],
        datasets: [{ data: sexCounts, backgroundColor: ['#0d6efd','#e83e8c','#6c757d'] }]
      },
      options: { responsive: true }
    });

    // Bar: Top 5 Services Delivered (colorful)
    const svcCounts = {};
    (db.visits || []).forEach(v => {
      let svcs = Array.isArray(v.serviceType) ? v.serviceType : [v.serviceType];
      svcs.forEach(svc => {
        if (!svc) return;
        svcCounts[svc] = (svcCounts[svc] || 0) + 1;
      });
    });
    const svcSorted = Object.entries(svcCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const barColors = ['#0d6efd','#20c997','#ffc107','#e83e8c','#6610f2'];
    new Chart(document.getElementById('serviceBar'), {
      type: 'bar',
      data: {
        labels: svcSorted.map(x=>x[0]),
        datasets: [{
          label: 'Visits',
          data: svcSorted.map(x=>x[1]),
          backgroundColor: barColors.slice(0, svcSorted.length)
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        plugins: {
          legend: { display: false }
        }
      }
    });

    // Line: Visits Trend (Last 12 Months)
    const months = [];
    const now = new Date();
    for(let i=11; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    const trend = months.map(m => db.visits.filter(v => (v.visitDate||'').slice(0,7) === m).length);
    new Chart(document.getElementById('visitTrend'), {
      type: 'line',
      data: {
        labels: months,
        datasets: [{ label: 'Visits', data: trend, borderColor: '#198754', backgroundColor: 'rgba(25,135,84,0.2)', fill: true }]
      },
      options: { responsive: true }
    });
  });
}