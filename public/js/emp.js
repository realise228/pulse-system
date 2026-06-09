var allEmployees = [];
var currentFilter = 'all';
var currentSort = 'name';
var viewMode = 'grid';

function loadEmployees() {
  var container = document.getElementById('employees');
  container.innerHTML = '<div class="emp-hero"><div class="emp-hero-left"><h2><span>Employees</span></h2><div class="emp-hero-stats" id="empHeroStats"></div></div><div class="emp-hero-right"><button class="btn-action" onclick="showAddEmployeeModal()">+ Add</button><button class="btn-action" onclick="exportCSV()">⬇ Export</button></div></div><div class="emp-toolbar"><div class="emp-search"><input type="text" id="empSearch" placeholder="Search by name, position, department, skill, phone..." onkeyup="filterEmployees()"></div><div class="emp-filters" id="empFilters"></div><div class="emp-sort"><select id="empSortSelect" onchange="changeSort(this.value)"><option value="name">Sort: Name</option><option value="salary-desc">Salary ↓</option><option value="salary-asc">Salary ↑</option><option value="date-desc">Newest</option><option value="date-asc">Oldest</option><option value="dept">Department</option></select></div></div><div class="emp-count-bar"><span id="empCount"></span><div class="emp-view-toggle"><button class="view-btn active" onclick="setView(\'grid\', this)">▦</button><button class="view-btn" onclick="setView(\'list\', this)">☰</button></div></div><div class="emp-content" id="empContent"></div>';

  refreshEmployees();
}

async function refreshEmployees() {
  var data = await app.api('/employees');
  allEmployees = data.employees || [];
  
  var departments = {};
  allEmployees.forEach(function(e) {
    departments[e.department] = (departments[e.department] || 0) + 1;
  });
  var deptCount = Object.keys(departments).length;
  var totalSalary = allEmployees.reduce(function(s, e) { return s + (e.salary || 0); }, 0);
  var avgSalary = allEmployees.length > 0 ? Math.round(totalSalary / allEmployees.length) : 0;
  
  document.getElementById('empHeroStats').innerHTML = '<div class="hero-stat"><span class="hero-stat-val">' + allEmployees.length + '</span><span class="hero-stat-lbl">Total</span></div><div class="hero-stat"><span class="hero-stat-val">' + deptCount + '</span><span class="hero-stat-lbl">Departments</span></div><div class="hero-stat"><span class="hero-stat-val">' + (avgSalary ? Math.round(avgSalary/1000) + 'K' : '—') + '</span><span class="hero-stat-lbl">Avg Salary</span></div>';
  
  var deptList = Object.keys(departments).sort();
  var filterHTML = '<button class="emp-filter-btn active" onclick="setFilter(\'all\', this)">All</button>';
  deptList.forEach(function(d) {
    filterHTML += '<button class="emp-filter-btn" onclick="setFilter(\'' + d + '\', this)">' + d + '</button>';
  });
  document.getElementById('empFilters').innerHTML = filterHTML;
  
  renderEmployees();
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.emp-filter-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderEmployees();
}

function changeSort(sort) { currentSort = sort; renderEmployees(); }

function setView(mode, btn) {
  viewMode = mode;
  document.querySelectorAll('.view-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderEmployees();
}

function filterEmployees() { renderEmployees(); }

function renderEmployees() {
  var q = (document.getElementById('empSearch')?.value || '').toLowerCase();
  var filtered = allEmployees.slice();
  
  if (currentFilter !== 'all') {
    filtered = filtered.filter(function(e) { return e.department === currentFilter; });
  }
  
  if (q) {
    filtered = filtered.filter(function(e) {
      return (e.user.firstName || '').toLowerCase().indexOf(q) > -1 ||
             (e.user.lastName || '').toLowerCase().indexOf(q) > -1 ||
             (e.position || '').toLowerCase().indexOf(q) > -1 ||
             (e.department || '').toLowerCase().indexOf(q) > -1 ||
             (e.skills || '').toLowerCase().indexOf(q) > -1 ||
             (e.phone || '').indexOf(q) > -1 ||
             (e.employeeId || '').toLowerCase().indexOf(q) > -1;
    });
  }
  
  if (currentSort === 'salary-desc') {
    filtered.sort(function(a, b) { return (b.salary || 0) - (a.salary || 0); });
  } else if (currentSort === 'salary-asc') {
    filtered.sort(function(a, b) { return (a.salary || 0) - (b.salary || 0); });
  } else if (currentSort === 'date-desc') {
    filtered.sort(function(a, b) { return new Date(b.hireDate) - new Date(a.hireDate); });
  } else if (currentSort === 'date-asc') {
    filtered.sort(function(a, b) { return new Date(a.hireDate) - new Date(b.hireDate); });
  } else if (currentSort === 'dept') {
    filtered.sort(function(a, b) { return a.department.localeCompare(b.department); });
  } else {
    filtered.sort(function(a, b) { return a.user.lastName.localeCompare(b.user.lastName); });
  }
  
  document.getElementById('empCount').textContent = filtered.length + ' employee' + (filtered.length !== 1 ? 's' : '');
  var content = document.getElementById('empContent');
  
  if (filtered.length === 0) {
    content.innerHTML = '<div class="emp-empty"><div class="emp-empty-icon">☰</div><p>No employees found</p><small>Try adjusting your search or filter</small></div>';
    return;
  }
  
  if (viewMode === 'list') {
    content.className = 'emp-list';
    content.innerHTML = filtered.map(function(e) {
      return '<div class="emp-list-row"><div class="emp-list-avatar" onclick="event.stopPropagation();showEmployeeDetail(\'' + e.id + '\')">' + e.user.firstName[0] + e.user.lastName[0] + '</div><div class="emp-list-name" onclick="showEmployeeDetail(\'' + e.id + '\')">' + e.user.lastName + ' ' + e.user.firstName + '</div><div class="emp-list-pos" onclick="showEmployeeDetail(\'' + e.id + '\')">' + e.position + '</div><div class="emp-list-dept" onclick="showEmployeeDetail(\'' + e.id + '\')">' + e.department + '</div><div class="emp-list-salary" onclick="showEmployeeDetail(\'' + e.id + '\')">' + (e.salary ? Math.round(e.salary/1000).toLocaleString() + 'K' : '—') + '</div><button class="emp-delete-btn" onclick="event.stopPropagation();deleteEmployee(\'' + e.id + '\')">✕</button></div>';
    }).join('');
  } else {
    content.className = 'emp-grid';
    content.innerHTML = filtered.map(function(e) {
      var skills = (e.skills || '').split(',').filter(function(s) { return s.trim(); }).slice(0, 3);
      return '<div class="emp-card"><div class="emp-card-top" onclick="showEmployeeDetail(\'' + e.id + '\')"><div class="emp-card-avatar">' + e.user.firstName[0] + e.user.lastName[0] + '</div><div class="emp-card-info"><div class="emp-card-name">' + e.user.lastName + ' ' + e.user.firstName + '</div><div class="emp-card-pos">' + e.position + '</div><div class="emp-card-dept">' + e.department + '</div></div><button class="emp-delete-btn" onclick="event.stopPropagation();deleteEmployee(\'' + e.id + '\')">✕</button></div><div class="emp-card-bottom"><div class="emp-card-salary">' + (e.salary ? Math.round(e.salary/1000).toLocaleString() + 'K ₽' : '—') + '</div><div class="emp-card-skills">' + skills.map(function(s) { return '<span class="emp-skill-tag">' + s.trim() + '</span>'; }).join('') + '</div></div></div>';
    }).join('');
  }
}

async function deleteEmployee(id) {
  if (!confirm('Delete this employee?')) return;
  try {
    var res = await fetch(API + '/employees/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.status === 204 || res.ok) {
      refreshEmployees();
    } else {
      var data = await res.json();
      alert('Error: ' + (data.error || 'Cannot delete'));
    }
  } catch(e) {
    alert('Error: ' + e.message);
  }
}

function showEmployeeDetail(id) {
  var emp = allEmployees.find(function(e) { return e.id === id; });
  if (!emp) return;

  var skills = (emp.skills || '').split(',').filter(function(s) { return s.trim(); });
  var hireDate = new Date(emp.hireDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  
  app.showModal(
    '<button class="modal-close" onclick="app.closeModal()">&times;</button>' +
    '<div class="emp-detail-header"><div class="emp-card-avatar" style="width:72px;height:72px;font-size:24px">' + emp.user.firstName[0] + emp.user.lastName[0] + '</div><div><h3 style="margin:0;padding:0;border:none;font-size:28px">' + emp.user.lastName + ' ' + emp.user.firstName + '</h3><p style="color:var(--text-secondary);font-size:15px;margin-top:4px">' + emp.position + '</p></div></div>' +
    '<div class="emp-detail-grid"><div class="emp-detail-item"><label>Department</label><span>' + emp.department + '</span></div><div class="emp-detail-item"><label>Employee ID</label><span>' + emp.employeeId + '</span></div><div class="emp-detail-item"><label>Salary</label><span>' + (emp.salary ? Math.round(emp.salary).toLocaleString() + ' ₽' : '—') + '</span></div><div class="emp-detail-item"><label>Phone</label><span>' + (emp.phone || '—') + '</span></div><div class="emp-detail-item"><label>Hire Date</label><span>' + hireDate + '</span></div><div class="emp-detail-item"><label>Email</label><span style="font-size:14px">' + emp.user.email + '</span></div></div>' +
    (skills.length > 0 ? '<div class="emp-detail-item" style="margin-bottom:24px"><label>Skills</label><div class="emp-detail-skills">' + skills.map(function(s) { return '<span class="emp-skill-tag">' + s.trim() + '</span>'; }).join('') + '</div></div>' : '') +
    '<div style="display:flex;gap:10px"><button class="btn-primary" onclick="app.closeModal()">Close</button><button class="btn-action" style="border-color:#ff4444;color:#ff4444" onclick="app.closeModal();deleteEmployee(\'' + emp.id + '\')">Delete</button></div>'
  );
}

function showAddEmployeeModal() {
  app.showModal(
    '<button class="modal-close" onclick="app.closeModal()">&times;</button>' +
    '<h3>Add Employee</h3>' +
    '<div class="emp-form-grid"><div class="input-group"><label>First Name</label><input id="empFirstName"></div><div class="input-group"><label>Last Name</label><input id="empLastName"></div><div class="input-group"><label>Email</label><input id="empEmail"></div><div class="input-group"><label>Employee ID</label><input id="empId"></div><div class="input-group"><label>Position</label><input id="empPos"></div><div class="input-group"><label>Department</label><input id="empDept"></div><div class="input-group"><label>Salary</label><input id="empSalary" type="number"></div><div class="input-group"><label>Phone</label><input id="empPhone"></div></div>' +
    '<div class="input-group"><label>Skills (comma separated)</label><input id="empSkills" placeholder="react, node.js, postgres"></div>' +
    '<button class="btn-primary" onclick="submitEmployee()">Create Employee</button>'
  );
}

async function submitEmployee() {
  var userRes = await app.api('/auth/register', 'POST', {
    email: document.getElementById('empEmail').value,
    password: 'password123',
    firstName: document.getElementById('empFirstName').value,
    lastName: document.getElementById('empLastName').value,
    roleId: '6655c379-f673-4b61-b654-e4953708a9af'
  });
  var userId = userRes.user?.id || '';
  var data = await app.api('/employees', 'POST', {
    userId: userId,
    employeeId: document.getElementById('empId').value,
    position: document.getElementById('empPos').value,
    department: document.getElementById('empDept').value,
    salary: parseFloat(document.getElementById('empSalary').value) || 0,
    phone: document.getElementById('empPhone').value,
    skills: document.getElementById('empSkills').value,
    hireDate: new Date().toISOString()
  });
  if (data.error) return alert('Error: ' + data.error);
  app.closeModal();
  refreshEmployees();
}

async function exportCSV() {
  try {
    var res = await fetch(API + '/export/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ employees: allEmployees })
    });
    if (!res.ok) throw new Error('Export failed');
    var blob = await res.blob();
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'employees_export.xlsx';
    link.click();
  } catch(e) { alert('Export error: ' + e.message); }
}
