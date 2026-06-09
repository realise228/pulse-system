var analyticsCharts = [];
var analyticsView = 'overview';
var analyticsFilter = 'all';
var analyticsEmployees = [];

function loadAnalytics() {
  var container = document.getElementById('analytics');
  container.innerHTML = 
    '<div class="an-topbar">' +
      '<h2><span>Analytics</span></h2>' +
      '<div class="an-tabs" id="anTabs">' +
        '<button class="an-tab active" data-view="overview" onclick="switchAnalyticsView(\'overview\', this)">Overview</button>' +
        '<button class="an-tab" data-view="departments" onclick="switchAnalyticsView(\'departments\', this)">Departments</button>' +
        '<button class="an-tab" data-view="salaries" onclick="switchAnalyticsView(\'salaries\', this)">Salaries</button>' +
        '<button class="an-tab" data-view="positions" onclick="switchAnalyticsView(\'positions\', this)">Positions</button>' +
        '<button class="an-tab" data-view="experience" onclick="switchAnalyticsView(\'experience\', this)">Experience</button>' +
        '<button class="an-tab" data-view="hiring" onclick="switchAnalyticsView(\'hiring\', this)">Hiring</button>' +
      '</div>' +
      '<button class="btn-action" onclick="window.print()">Export</button>' +
    '</div>' +
    '<div class="an-viewport" id="anViewport"></div>';

  refreshAnalytics();
}

function switchAnalyticsView(view, btn) {
  analyticsView = view;
  document.querySelectorAll('.an-tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  refreshAnalytics();
}

async function refreshAnalytics() {
  analyticsCharts.forEach(function(c) { try { c.destroy(); } catch(e) {} });
  analyticsCharts = [];

  var empRes = await app.api('/employees');
  var allEmp = empRes.employees || [];
  analyticsEmployees = analyticsFilter === 'all' ? allEmp : allEmp.filter(function(e) { return e.department === analyticsFilter; });
  var emp = analyticsEmployees;
  var total = emp.length;
  var now = new Date();

  if (total === 0) {
    document.getElementById('anViewport').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);font-size:16px;letter-spacing:2px">No data for this view</div>';
    return;
  }

  var totalSalary = emp.reduce(function(s, e) { return s + (e.salary || 0); }, 0);
  var avgSalary = total > 0 ? Math.round(totalSalary / total) : 0;

  var depts = {};
  emp.forEach(function(e) { depts[e.department] = (depts[e.department] || 0) + 1; });

  var posMap = {};
  emp.forEach(function(e) { posMap[e.position] = (posMap[e.position] || 0) + 1; });

  var sortedSalary = emp.slice().sort(function(a, b) { return (a.salary || 0) - (b.salary || 0); });

  var minSalary = total > 0 ? Math.min.apply(null, emp.map(function(e) { return e.salary || 1000000000; })) : 0;
  var maxSalary = total > 0 ? Math.max.apply(null, emp.map(function(e) { return e.salary || 0; })) : 0;

  var viewport = document.getElementById('anViewport');
  viewport.innerHTML = '';

  if (analyticsView === 'overview') {
    viewport.innerHTML = buildOverviewHTML();
    setTimeout(function() { buildOverviewCharts(emp, depts, posMap, sortedSalary, avgSalary, total, now); }, 50);
  } else if (analyticsView === 'departments') {
    viewport.innerHTML = buildDepartmentsHTML();
    setTimeout(function() { buildDepartmentsCharts(emp, depts, total, now); }, 50);
  } else if (analyticsView === 'salaries') {
    viewport.innerHTML = buildSalariesHTML();
    setTimeout(function() { buildSalariesCharts(emp, sortedSalary, avgSalary, minSalary, maxSalary, total, depts); }, 50);
  } else if (analyticsView === 'positions') {
    viewport.innerHTML = buildPositionsHTML();
    setTimeout(function() { buildPositionsCharts(emp, posMap); }, 50);
  } else if (analyticsView === 'experience') {
    viewport.innerHTML = buildExperienceHTML();
    setTimeout(function() { buildExperienceCharts(emp, now); }, 50);
  } else if (analyticsView === 'hiring') {
    viewport.innerHTML = buildHiringHTML();
    setTimeout(function() { buildHiringCharts(emp); }, 50);
  }
}

// ═══════════ HTML BUILDERS ═══════════
function buildOverviewHTML() {
  return '<div class="an-scroll"><div class="an-kpi-row" id="anKpi"></div><div class="an-charts-2col"><div class="an-chart-box"><div class="an-chart-header"><h3>Departments</h3></div><div class="an-chart-body"><canvas id="ch1"></canvas></div></div><div class="an-chart-box"><div class="an-chart-header"><h3>Positions</h3></div><div class="an-chart-body"><canvas id="ch2"></canvas></div></div></div><div class="an-charts-2col"><div class="an-chart-box an-chart-full"><div class="an-chart-header"><h3>Salary Distribution</h3></div><div class="an-chart-body"><canvas id="ch3"></canvas></div></div><div class="an-chart-box"><div class="an-chart-header"><h3>Experience Mix</h3></div><div class="an-chart-body"><canvas id="ch4"></canvas></div></div></div><div class="an-charts-1col"><div class="an-chart-box"><div class="an-chart-header"><h3>Hiring Timeline</h3></div><div class="an-chart-body"><canvas id="ch5"></canvas></div></div></div></div>';
}

function buildDepartmentsHTML() {
  return '<div class="an-scroll"><div class="an-charts-2col"><div class="an-chart-box"><div class="an-chart-header"><h3>Headcount</h3></div><div class="an-chart-body"><canvas id="ch1"></canvas></div></div><div class="an-chart-box"><div class="an-chart-header"><h3>Proportion</h3></div><div class="an-chart-body"><canvas id="ch2"></canvas></div></div></div><div class="an-charts-1col"><div class="an-chart-box"><div class="an-chart-header"><h3>Salary Comparison by Department</h3></div><div class="an-chart-body"><canvas id="ch3"></canvas></div></div></div><div class="an-charts-1col"><div class="an-chart-box"><div class="an-chart-header"><h3>Department Details</h3></div><div class="an-chart-body" id="deptDetailTable"></div></div></div></div>';
}

function buildSalariesHTML() {
  return '<div class="an-scroll"><div class="an-kpi-row" id="anKpi"></div><div class="an-charts-2col"><div class="an-chart-box an-chart-full"><div class="an-chart-header"><h3>Salary Curve (each employee)</h3></div><div class="an-chart-body"><canvas id="ch1"></canvas></div></div><div class="an-chart-box"><div class="an-chart-header"><h3>By Department</h3></div><div class="an-chart-body"><canvas id="ch2"></canvas></div></div></div><div class="an-charts-2col"><div class="an-chart-box"><div class="an-chart-header"><h3>Distribution Histogram</h3></div><div class="an-chart-body"><canvas id="ch3"></canvas></div></div><div class="an-chart-box"><div class="an-chart-header"><h3>Top Earners</h3></div><div class="an-chart-body" id="topEarners"></div></div></div></div>';
}

function buildPositionsHTML() {
  return '<div class="an-scroll"><div class="an-charts-2col"><div class="an-chart-box"><div class="an-chart-header"><h3>Count by Position</h3></div><div class="an-chart-body"><canvas id="ch1"></canvas></div></div><div class="an-chart-box"><div class="an-chart-header"><h3>Position Mix</h3></div><div class="an-chart-body"><canvas id="ch2"></canvas></div></div></div><div class="an-charts-1col"><div class="an-chart-box"><div class="an-chart-header"><h3>Salary by Position</h3></div><div class="an-chart-body"><canvas id="ch3"></canvas></div></div></div></div>';
}

function buildExperienceHTML() {
  return '<div class="an-scroll"><div class="an-kpi-row" id="anKpi"></div><div class="an-charts-2col"><div class="an-chart-box"><div class="an-chart-header"><h3>Experience Buckets</h3></div><div class="an-chart-body"><canvas id="ch1"></canvas></div></div><div class="an-chart-box"><div class="an-chart-header"><h3>Pie Split</h3></div><div class="an-chart-body"><canvas id="ch2"></canvas></div></div></div><div class="an-charts-1col"><div class="an-chart-box"><div class="an-chart-header"><h3>Salary vs Experience</h3></div><div class="an-chart-body"><canvas id="ch3"></canvas></div></div></div></div>';
}

function buildHiringHTML() {
  return '<div class="an-scroll"><div class="an-charts-2col"><div class="an-chart-box an-chart-full"><div class="an-chart-header"><h3>Hires by Year</h3></div><div class="an-chart-body"><canvas id="ch1"></canvas></div></div><div class="an-chart-box"><div class="an-chart-header"><h3>Monthly Trend (2024-2026)</h3></div><div class="an-chart-body"><canvas id="ch2"></canvas></div></div></div></div>';
}

// ═══════════ CHART BUILDERS ═══════════
function buildOverviewCharts(emp, depts, posMap, sorted, avg, total, now) {
  setKpiOverview(emp, depts, avg, total, now);
  makeDoughnut('ch1', depts);
  makeBar('ch2', posMap);
  makeLineChart('ch3', sorted, avg, total);
  makeExpPie('ch4', emp, now);
  makeHireChart('ch5', emp);
}

function buildDepartmentsCharts(emp, depts, total, now) {
  makeDoughnut('ch1', depts);
  makePolar('ch2', depts);
  makeDeptSalaryBar('ch3', emp, depts);
  makeDeptDetailTable('deptDetailTable', emp, depts, total);
}

function buildSalariesCharts(emp, sorted, avg, min, max, total, depts) {
  document.getElementById('anKpi').innerHTML = '<div class="kpi-card"><div class="kpi-value">' + Math.round(min/1000) + 'K</div><div class="kpi-label">Minimum</div></div><div class="kpi-card"><div class="kpi-value">' + Math.round(avg/1000) + 'K</div><div class="kpi-label">Average</div></div><div class="kpi-card"><div class="kpi-value">' + Math.round(max/1000) + 'K</div><div class="kpi-label">Maximum</div></div><div class="kpi-card"><div class="kpi-value">' + (max > 0 ? Math.round((max-min)/max*100) : 0) + '%</div><div class="kpi-label">Spread</div></div>';
  makeLineChart('ch1', sorted, avg, total);
  makeDeptSalaryBar('ch2', emp, depts);
  makeSalaryHistogram('ch3', emp);
  makeTopEarners('topEarners', emp, now);
}

function buildPositionsCharts(emp, posMap) {
  makeBar('ch1', posMap);
  makePolar('ch2', posMap);
  makePosSalary('ch3', emp);
}

function buildExperienceCharts(emp, now) {
  var total = emp.length;
  var totalExp = emp.reduce(function(s, e) { return s + (now - new Date(e.hireDate)) / (1000 * 60 * 60 * 24 * 365); }, 0);
  var avgExp = total > 0 ? (totalExp / total).toFixed(1) : 0;
  var maxExp = total > 0 ? Math.max.apply(null, emp.map(function(e) { return (now - new Date(e.hireDate)) / (1000 * 60 * 60 * 24 * 365); })).toFixed(1) : 0;
  document.getElementById('anKpi').innerHTML = '<div class="kpi-card"><div class="kpi-value">' + avgExp + '</div><div class="kpi-label">Avg Years</div></div><div class="kpi-card"><div class="kpi-value">' + maxExp + '</div><div class="kpi-label">Max Years</div></div><div class="kpi-card"><div class="kpi-value">' + emp.filter(function(e) { return (now - new Date(e.hireDate)) / (1000 * 60 * 60 * 24 * 365) < 1; }).length + '</div><div class="kpi-label">New (&lt;1yr)</div></div><div class="kpi-card"><div class="kpi-value">' + emp.filter(function(e) { return (now - new Date(e.hireDate)) / (1000 * 60 * 60 * 24 * 365) >= 3; }).length + '</div><div class="kpi-label">Senior (3+yr)</div></div>';
  makeExpBar('ch1', emp, now);
  makeExpPie('ch2', emp, now);
  makeSalaryVsExp('ch3', emp, now);
}

function buildHiringCharts(emp) {
  makeHireChart('ch1', emp);
  makeMonthlyHires('ch2', emp);
}

// ═══════════ CHART HELPERS ═══════════
function setKpiOverview(emp, depts, avg, total, now) {
  var totalExp = emp.reduce(function(s, e) { return s + (now - new Date(e.hireDate)) / (1000 * 60 * 60 * 24 * 365); }, 0);
  var avgExp = total > 0 ? (totalExp / total).toFixed(1) : 0;
  var payroll = emp.reduce(function(s, e) { return s + (e.salary || 0); }, 0);
  document.getElementById('anKpi').innerHTML = '<div class="kpi-card"><div class="kpi-value">' + total + '</div><div class="kpi-label">Employees</div></div><div class="kpi-card"><div class="kpi-value">' + Object.keys(depts).length + '</div><div class="kpi-label">Departments</div></div><div class="kpi-card"><div class="kpi-value">' + Math.round(avg/1000) + 'K</div><div class="kpi-label">Avg Salary</div></div><div class="kpi-card"><div class="kpi-value">' + avgExp + '</div><div class="kpi-label">Avg Exp</div></div><div class="kpi-card"><div class="kpi-value">' + Math.round(payroll/1000000) + 'M</div><div class="kpi-label">Payroll</div></div>';
}

function makeDoughnut(id, data) {
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: { labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: ['#fff','#ddd','#bbb','#999','#777','#555','#333','#222'], borderColor: '#000', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 }, padding: 14 } } } }
  });
  analyticsCharts.push(chart);
}

function makeBar(id, data) {
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: { labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: '#fff', barThickness: 36 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#555' }, grid: { color: '#1a1a1a' } }, y: { ticks: { color: '#888' }, grid: { display: false } } } }
  });
  analyticsCharts.push(chart);
}

function makePolar(id, data) {
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'polarArea',
    data: { labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: ['rgba(255,255,255,0.9)','rgba(200,200,200,0.7)','rgba(150,150,150,0.6)','rgba(100,100,100,0.5)','rgba(60,60,60,0.4)'], borderColor: '#000', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 } } } }, scales: { r: { ticks: { display: false }, grid: { color: '#1a1a1a' } } } }
  });
  analyticsCharts.push(chart);
}

function makeLineChart(id, sorted, avg, total) {
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: sorted.map(function(_, i) { return i + 1; }),
      datasets: [
        { data: sorted.map(function(e) { return e.salary || 0; }), borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.03)', fill: true, tension: 0.3, pointRadius: total < 20 ? 3 : 0, borderWidth: 2 },
        { data: sorted.map(function() { return avg; }), borderColor: '#555', borderDash: [8,4], borderWidth: 1, pointRadius: 0, fill: false }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#555' }, grid: { display: false } }, y: { ticks: { color: '#555', callback: function(v) { return Math.round(v/1000) + 'K'; } }, grid: { color: '#1a1a1a' } } } }
  });
  analyticsCharts.push(chart);
}

function makeExpPie(id, emp, now) {
  var buckets = { '<1y':0, '1-2y':0, '2-3y':0, '3-5y':0, '5y+':0 };
  emp.forEach(function(e) { var y = (now - new Date(e.hireDate)) / (1000*60*60*24*365); if(y<1) buckets['<1y']++; else if(y<2) buckets['1-2y']++; else if(y<3) buckets['2-3y']++; else if(y<5) buckets['3-5y']++; else buckets['5y+']++; });
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'pie',
    data: { labels: Object.keys(buckets), datasets: [{ data: Object.values(buckets), backgroundColor: ['#fff','#ddd','#bbb','#999','#666'], borderColor: '#000', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 } } } } }
  });
  analyticsCharts.push(chart);
}

function makeHireChart(id, emp) {
  var ymap = {};
  emp.forEach(function(e) { var yr = new Date(e.hireDate).getFullYear(); ymap[yr] = (ymap[yr] || 0) + 1; });
  var yrs = Object.keys(ymap).sort();
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'bar', data: { labels: yrs, datasets: [{ data: yrs.map(function(y) { return ymap[y]; }), backgroundColor: '#fff', barThickness: 44 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#555' }, grid: { display: false } }, y: { ticks: { color: '#555', stepSize: 1 }, grid: { color: '#1a1a1a' }, beginAtZero: true } } }
  });
  analyticsCharts.push(chart);
}

function makeDeptSalaryBar(id, emp, depts) {
  var labels = Object.keys(depts);
  var avgs = labels.map(function(d) { var de = emp.filter(function(e) { return e.department === d; }); var s = de.reduce(function(s, e) { return s + (e.salary||0); }, 0); return de.length > 0 ? Math.round(s/de.length) : 0; });
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'bar', data: { labels: labels, datasets: [{ data: avgs, backgroundColor: '#fff', barThickness: 36 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#555' }, grid: { display: false } }, y: { ticks: { color: '#555', callback: function(v) { return Math.round(v/1000)+'K'; } }, grid: { color: '#1a1a1a' } } } }
  });
  analyticsCharts.push(chart);
}

function makeSalaryHistogram(id, emp) {
  var buckets = {};
  emp.forEach(function(e) { var b = Math.floor((e.salary||0) / 50000) * 50; var key = b + 'K'; buckets[key] = (buckets[key] || 0) + 1; });
  var sortedKeys = Object.keys(buckets).sort(function(a,b) { return parseInt(a) - parseInt(b); });
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'bar', data: { labels: sortedKeys, datasets: [{ data: sortedKeys.map(function(k) { return buckets[k]; }), backgroundColor: '#fff', barThickness: 24 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#555', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#555', stepSize: 1 }, grid: { color: '#1a1a1a' } } } }
  });
  analyticsCharts.push(chart);
}

function makeTopEarners(id, emp, now) {
  var top = emp.slice().sort(function(a,b) { return (b.salary||0) - (a.salary||0); }).slice(0, 8);
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = top.map(function(e, i) {
    var yrs = ((now - new Date(e.hireDate)) / (1000*60*60*24*365)).toFixed(1);
    return '<div class="earner-row"><div class="earner-rank">' + (i+1) + '</div><div class="emp-card-avatar" style="width:40px;height:40px;font-size:14px">' + e.user.firstName[0] + e.user.lastName[0] + '</div><div style="flex:1"><div style="font-weight:600;font-size:13px">' + e.user.lastName + ' ' + e.user.firstName + '</div><div style="font-size:10px;color:#888">' + e.position + ' • ' + yrs + ' yrs</div></div><div style="font-size:18px;font-weight:100">' + Math.round(e.salary/1000) + 'K</div></div>';
  }).join('');
}

function makeDeptDetailTable(id, emp, depts, total) {
  var html = '<table class="dept-table"><tr><th>Department</th><th>Emp</th><th>%</th><th>Avg Sal</th><th>Total</th></tr>';
  Object.keys(depts).forEach(function(d) {
    var de = emp.filter(function(e) { return e.department === d; });
    var s = de.reduce(function(s, e) { return s + (e.salary||0); }, 0);
    var a = de.length > 0 ? Math.round(s/de.length/1000) + 'K' : '—';
    html += '<tr><td><strong>' + d + '</strong></td><td>' + de.length + '</td><td>' + Math.round(de.length/total*100) + '%</td><td>' + a + '</td><td>' + Math.round(s/1000) + 'K</td></tr>';
  });
  html += '</table>';
  var el = document.getElementById(id); if (el) el.innerHTML = html;
}

function makeExpBar(id, emp, now) {
  var buckets = { '<1y':0, '1-2y':0, '2-3y':0, '3-5y':0, '5y+':0 };
  emp.forEach(function(e) { var y = (now - new Date(e.hireDate)) / (1000*60*60*24*365); if(y<1) buckets['<1y']++; else if(y<2) buckets['1-2y']++; else if(y<3) buckets['2-3y']++; else if(y<5) buckets['3-5y']++; else buckets['5y+']++; });
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'bar', data: { labels: Object.keys(buckets), datasets: [{ data: Object.values(buckets), backgroundColor: '#fff', barThickness: 48 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#555' }, grid: { display: false } }, y: { ticks: { color: '#555', stepSize: 1 }, grid: { color: '#1a1a1a' } } } }
  });
  analyticsCharts.push(chart);
}

function makeSalaryVsExp(id, emp, now) {
  var points = emp.map(function(e) { return { x: ((now - new Date(e.hireDate)) / (1000*60*60*24*365)).toFixed(1), y: (e.salary||0) / 1000 }; });
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'scatter',
    data: { datasets: [{ data: points, backgroundColor: '#fff', pointRadius: 5, pointHoverRadius: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return c.raw.y + 'K, ' + c.raw.x + ' yrs'; } } } },
      scales: { x: { title: { display: true, text: 'Years', color: '#555' }, ticks: { color: '#555' }, grid: { color: '#1a1a1a' } }, y: { title: { display: true, text: 'Salary (K)', color: '#555' }, ticks: { color: '#555' }, grid: { color: '#1a1a1a' } } }
    }
  });
  analyticsCharts.push(chart);
}

function makePosSalary(id, emp) {
  var pm = {};
  emp.forEach(function(e) { if (!pm[e.position]) pm[e.position] = []; pm[e.position].push(e.salary||0); });
  var labels = Object.keys(pm);
  var avgs = labels.map(function(p) { var s = pm[p]; return Math.round(s.reduce(function(a,b){return a+b;},0)/s.length); });
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'bar', data: { labels: labels, datasets: [{ data: avgs, backgroundColor: '#fff', barThickness: 36 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#555' }, grid: { display: false } }, y: { ticks: { color: '#555', callback: function(v) { return Math.round(v/1000)+'K'; } }, grid: { color: '#1a1a1a' } } } }
  });
  analyticsCharts.push(chart);
}

function makeMonthlyHires(id, emp) {
  var months = {};
  for (var y = 2020; y <= 2026; y++) { for (var m = 1; m <= 12; m++) { var key = y + '-' + (m < 10 ? '0' : '') + m; months[key] = 0; } }
  emp.forEach(function(e) { var d = new Date(e.hireDate); var key = d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1); if (months[key] !== undefined) months[key]++; });
  var labels = Object.keys(months).filter(function(k) { return k >= '2024-01'; });
  var data = labels.map(function(k) { return months[k]; });
  var ctx = document.getElementById(id); if (!ctx) return;
  var chart = new Chart(ctx.getContext('2d'), {
    type: 'line', data: { labels: labels, datasets: [{ data: data, borderColor: '#fff', fill: true, backgroundColor: 'rgba(255,255,255,0.05)', tension: 0.2, pointRadius: 2, pointBackgroundColor: '#fff', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#555', font: { size: 8 }, maxTicksLimit: 12 }, grid: { display: false } }, y: { ticks: { color: '#555', stepSize: 1 }, grid: { color: '#1a1a1a' } } } }
  });
  analyticsCharts.push(chart);
}
