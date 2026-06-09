const API = '/api';
let token = '';
let user = null;
let socket = null;
let onlineUsers = 0;

const auth = {
  async login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.error) return alert(data.error);
    token = data.token; user = data.user;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('userName').textContent = `${user.lastName} ${user.firstName}`;
    document.getElementById('userRole').textContent = user.role;
    document.getElementById('userAvatar').textContent = (user.firstName[0] + user.lastName[0]).toUpperCase();
    if (typeof io !== 'undefined') {
      socket = io('/', { auth: { token } });
      socket.on('users:online', function(count) {
        onlineUsers = count;
        var el = document.getElementById('onlineCount');
        if (el) el.textContent = count;
        var st = document.getElementById('dashOnlineStatus');
        if (st) st.textContent = count + ' online';
      });
    }
    app.init();
  },
  fillAndLogin: function(email) {
    document.getElementById('email').value = email;
    document.getElementById('password').value = 'password123';
    this.login();
  },
  logout: function() {
    if (socket) socket.disconnect();
    token = ''; user = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
  }
};

var app = {
  currentTab: 'dashboard',
  clockInterval: null,

  api: async function(endpoint, method, body) {
    method = method || 'GET';
    body = body || null;
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var opts = { method: method, headers: headers };
    if (body) opts.body = JSON.stringify(body);
    var res = await fetch(API + endpoint, opts);
    return res.json();
  },

  init: function() {
    var self = this;
    document.querySelectorAll('.nav-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var tab = this.dataset.tab;
        if (tab) self.navigate(tab);
      });
    });
    this.navigate('dashboard');
  },

  navigate: function(tab) {
    if (this.clockInterval) { clearInterval(this.clockInterval); this.clockInterval = null; }
    this.currentTab = tab;
    
    document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    
    var tabEl = document.getElementById(tab);
    if (tabEl) tabEl.classList.add('active');
    
    var navEl = document.querySelector('[data-tab="' + tab + '"]');
    if (navEl) navEl.classList.add('active');

    if (tab === 'dashboard') loadDashboard();
    if (tab === 'employees') loadEmployees();
    if (tab === 'chats') loadChats();
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'crm') loadCrm();
    if (tab === 'infobanks') loadKnowledge();
    if (tab === 'files') loadFiles();
  },

  showModal: function(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.add('active');
  },
  closeModal: function() {
    document.getElementById('modal').classList.remove('active');
  }
};

var chartInstance = null;

function updateClock() {
  var el = document.getElementById('liveTime');
  if (el) el.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function loadDashboard() {
  document.getElementById('dashboard').innerHTML = '<div class="dash-hero"><div class="dash-greeting"><h2>Welcome back, <span>' + user.firstName + '</span></h2><p>' + new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) + ' <span class="dash-status" id="dashOnlineStatus">' + onlineUsers + ' online</span></p></div><div class="dash-time" id="liveTime"></div></div><div class="dash-stats" id="dashStats"><div class="dash-stat-card"><div class="dash-stat-icon">☰</div><div class="dash-stat-info"><span class="dash-stat-value">—</span><span class="dash-stat-label">Employees</span></div></div><div class="dash-stat-card"><div class="dash-stat-icon">⬡</div><div class="dash-stat-info"><span class="dash-stat-value">—</span><span class="dash-stat-label">Departments</span></div></div><div class="dash-stat-card"><div class="dash-stat-icon">◈</div><div class="dash-stat-info"><span class="dash-stat-value">—</span><span class="dash-stat-label">Chats</span></div></div><div class="dash-stat-card"><div class="dash-stat-icon">▣</div><div class="dash-stat-info"><span class="dash-stat-value">—</span><span class="dash-stat-label">Info Banks</span></div></div></div><div class="dash-grid"><div class="dash-chart-container"><h3>Distribution by Department</h3><canvas id="dashDeptChart"></canvas></div><div class="dash-activity"><h3>Recent Activity</h3><div id="activityFeed"><p class="activity-empty">Loading...</p></div></div></div>';
  
  updateClock();
  app.clockInterval = setInterval(updateClock, 1000);

  try {
    var empRes = await app.api('/employees');
    var chatRes = await app.api('/chats');
    var bankRes = await app.api('/info-banks');
    var analytRes = await app.api('/analytics/data/employees-by-department');
    
    var vals = document.querySelectorAll('.dash-stat-value');
    vals[0].textContent = (empRes.employees || []).length;
    vals[1].textContent = (analytRes.data || []).length;
    vals[2].textContent = (chatRes.chats || []).length;
    vals[3].textContent = (bankRes.banks || []).length;

    var activities = [];
    (empRes.employees || []).slice(0, 5).forEach(function(e) {
      activities.push({ text: e.user.lastName + ' ' + e.user.firstName + ' • ' + e.position, time: e.department });
    });
    document.getElementById('activityFeed').innerHTML = activities.length > 0
      ? activities.map(function(a) { return '<div class="activity-item"><div class="activity-dot"></div><div class="activity-content"><p>' + a.text + '</p><small>' + a.time + '</small></div></div>'; }).join('')
      : '<p class="activity-empty">No activity yet</p>';

    var deptData = analytRes.data || [];
    if (typeof Chart !== 'undefined' && deptData.length > 0) {
      setTimeout(function() {
        var c = document.getElementById('dashDeptChart');
        if (!c) return;
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(c.getContext('2d'), {
          type: 'bar',
          data: { labels: deptData.map(function(d) { return d.department; }), datasets: [{ data: deptData.map(function(d) { return d.count; }), backgroundColor: '#fff', barThickness: 48 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#555' }, grid: { display: false } }, y: { ticks: { color: '#555', stepSize: 1 }, grid: { color: '#1a1a1a' }, beginAtZero: true } } }
        });
      }, 100);
    }
  } catch(e) { console.error(e); }
}

async function _oldLoadChats() {
  loadChats();
}

async function _oldAnalytics() {
  var data = await app.api('/analytics/data/employees-by-department');
  var items = data.data || [];
  document.getElementById('analytics').innerHTML = '<h2><span>Analytics</span></h2><div class="stats-grid">' + items.map(function(d) { return '<div class="stat-card"><h3>' + d.department + '</h3><div class="stat-value">' + d.count + '</div></div>'; }).join('') + '</div><div style="background:var(--surface);border:1px solid var(--border);padding:30px"><canvas id="anChart" height="300"></canvas></div>';
  if (typeof Chart !== 'undefined') {
    setTimeout(function() {
      var c = document.getElementById('anChart');
      if (c) new Chart(c.getContext('2d'), { type: 'bar', data: { labels: items.map(function(d) { return d.department; }), datasets: [{ data: items.map(function(d) { return d.count; }), backgroundColor: '#fff' }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#888' }, grid: { color: '#1a1a1a' } }, y: { ticks: { color: '#888' }, grid: { color: '#1a1a1a' }, beginAtZero: true } } } });
    }, 100);
  }
}

async function _oldCrm() {
  var data = await app.api('/crm/templates');
  var html = '<h2><span>CRM 1C</span></h2><button class="btn-action" onclick="crmModal2()">+ New</button>';
  (data.templates || []).forEach(function(t) {
    html += '<div class="chat-card" onclick="exportCrm2(\'' + t.id + '\')"><h3>' + t.name + '</h3><small>Click to export</small></div>';
  });
  document.getElementById('crm').innerHTML = html;
}

function crmModal2() {
  app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>New Template</h3><div class="input-group"><label>Name</label><input id="crmName"></div><div class="input-group"><label>Description</label><input id="crmDesc"></div><button class="btn-primary" onclick="submitCrm2()">Create</button>');
}

async function submitCrm2() {
  var d = await app.api('/crm/templates', 'POST', {
    name: document.getElementById('crmName').value,
    description: document.getElementById('crmDesc').value,
    modules: [], config: {}
  });
  if (d.error) return alert(d.error);
  app.closeModal();
  loadCrm();
}

async function exportCrm2(id) {
  var d = await app.api('/crm/templates/' + id + '/export', 'POST');
  if (d.xmlContent) {
    app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>Export</h3><pre style="background:#0a0a0a;padding:16px;border:1px solid #2a2a2a;color:#fff;font-size:11px;max-height:400px;overflow-y:auto">' + d.xmlContent.replace(/</g, '&lt;') + '</pre><button class="btn-primary" style="margin-top:20px" onclick="app.closeModal()">Close</button>');
  }
}

async function _oldLoadInfoBanks() {
  var data = await app.api('/info-banks');
  var html = '<h2><span>Info Banks</span></h2><button class="btn-action" onclick="bankModal2()">+ New</button>';
  (data.banks || []).forEach(function(b) {
    html += '<div class="chat-card" onclick="viewBank2(\'' + b.id + '\')"><h3>' + b.name + '</h3><small>' + b.category + ' • ' + (b._count ? b._count.items : 0) + ' items</small></div>';
  });
  document.getElementById('infobanks').innerHTML = html;
}

function bankModal2() {
  app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>New Bank</h3><div class="input-group"><label>Name</label><input id="bankName"></div><div class="input-group"><label>Description</label><input id="bankDesc"></div><div class="input-group"><label>Category</label><input id="bankCat"></div><button class="btn-primary" onclick="submitBank2()">Create</button>');
}

async function submitBank2() {
  var d = await app.api('/info-banks', 'POST', {
    name: document.getElementById('bankName').value,
    description: document.getElementById('bankDesc').value,
    category: document.getElementById('bankCat').value,
    tags: ''
  });
  if (d.error) return alert(d.error);
  app.closeModal();
  loadInfoBanks();
}

async function viewBank2(id) {
  var d = await app.api('/info-banks/' + id);
  var b = d.bank;
  var html = '<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>' + b.name + '</h3><p style="color:#888;margin-bottom:20px">' + (b.description || '') + '</p>';
  (b.items || []).forEach(function(i) {
    html += '<div class="chat-card"><h3>' + i.title + '</h3><p>' + i.content + '</p></div>';
  });
  html += '<button class="btn-primary" onclick="app.closeModal()">Close</button>';
  app.showModal(html);
}

async function loadFiles() {
  var data = await app.api('/upload');
  var html = '<h2><span>Files</span></h2><div style="margin-bottom:24px"><input type="file" id="fileInput" style="color:#fff;font-family:Inter"><button class="btn-action" onclick="uploadFile2()" style="margin-left:10px">Upload</button></div>';
  (data.files || []).forEach(function(f) {
    html += '<div class="chat-card"><h3>' + f.name + '</h3><small>' + (f.size / 1024).toFixed(1) + ' KB</small></div>';
  });
  document.getElementById('files').innerHTML = html;
}

async function uploadFile2() {
  var file = document.getElementById('fileInput').files[0];
  if (!file) return alert('Select file');
  var fd = new FormData();
  fd.append('file', file);
  var res = await fetch(API + '/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
  var data = await res.json();
  if (data.error) return alert(data.error);
  loadFiles();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') auth.login();
});
