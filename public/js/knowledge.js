var kbBanks = [];
var kbFiles = [];
var kbAllItems = [];
var kbFilter = 'all';
var kbSort = 'date-desc';
var kbView = 'grid';
var kbSearchQ = '';
var kbSearchMode = 'local';

function loadKnowledge() {
  document.getElementById('infobanks').innerHTML = 
    '<div class="kb-toolbar">' +
      '<h2 style="border:none;padding:0;margin:0;font-size:26px"><span>Knowledge Base</span></h2>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<input type="text" id="kbGlobalSearch" placeholder="Search banks, documents, files..." onkeyup="kbSearch()" style="width:320px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:Inter;font-size:13px">' +
        '<select id="kbSortSelect" onchange="kbChangeSort(this.value)" style="padding:10px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:Inter;font-size:12px"><option value="date-desc">Newest</option><option value="date-asc">Oldest</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option></select>' +
        '<button class="btn-action" onclick="kbCreateBank()">+ New Bank</button>' +
        '<button class="btn-action" onclick="kbUploadFile()">⬆ Upload</button>' +
      '</div>' +
    '</div>' +
    '<div class="kb-layout">' +
      '<div class="kb-sidebar" id="kbSidebar"></div>' +
      '<div class="kb-main">' +
        '<div class="kb-main-header"><span id="kbItemCount"></span></div>' +
        '<div class="kb-content" id="kbContent"></div>' +
        '<div class="kb-footer"><button class="btn-action" style="border-color:#ff4444;color:#ff4444" onclick="kbDeleteSelected()">Delete Selected</button></div>' +
      '</div>' +
    '</div>' +
    '<input type="file" id="kbFileInput" style="display:none" onchange="kbHandleUpload(event)">';
  kbRefresh();
}

async function kbRefresh() {
  var br = await app.api('/info-banks'); kbBanks = br.banks || [];
  var fr = await app.api('/upload'); kbFiles = fr.files || [];
  kbBuildItems();
  kbRenderSidebar();
  kbRenderContent();
}

function kbBuildItems() {
  kbAllItems = [];
  kbBanks.forEach(function(b) { kbAllItems.push({ id: b.id, type: 'bank', name: b.name, desc: b.description || '', category: b.category || 'General', count: b._count ? b._count.items : 0, date: b.updatedAt || b.createdAt }); });
  kbFiles.forEach(function(f) { kbAllItems.push({ id: f.name, type: 'file', name: f.name, desc: (f.size ? (f.size/1024).toFixed(1)+' KB' : ''), category: 'Files', url: f.url, size: f.size }); });
}

async function kbSearch() {
  kbSearchQ = document.getElementById('kbGlobalSearch')?.value?.trim() || '';
  if (kbSearchQ.length > 0) {
    // Глобальный поиск через API
    var data = await app.api('/info-banks/search?q=' + encodeURIComponent(kbSearchQ));
    var banks = data.banks || [];
    var docs = data.items || [];
    kbSearchMode = 'global';
    
    // Смешиваем результаты
    kbAllItems = [];
    banks.forEach(function(b) { kbAllItems.push({ id: b.id, type: 'bank', name: b.name, desc: b.description || '', category: b.category || 'General', count: b._count ? b._count.items : 0, date: b.updatedAt || b.createdAt }); });
    docs.forEach(function(d) { kbAllItems.push({ id: d.id, type: 'document', name: d.title, desc: (d.content||'').substring(0,200), category: (d.bank ? d.bank.name : 'Document'), bankId: d.bankId, date: d.updatedAt || d.createdAt }); });
    kbFiles.forEach(function(f) { if (f.name.toLowerCase().indexOf(kbSearchQ.toLowerCase()) > -1) kbAllItems.push({ id: f.name, type: 'file', name: f.name, desc: (f.size ? (f.size/1024).toFixed(1)+' KB' : ''), category: 'Files', url: f.url, size: f.size }); });
  } else {
    kbSearchMode = 'local';
    kbBuildItems();
  }
  kbRenderSidebar();
  kbRenderContent();
}

function kbChangeSort(v) { kbSort = v; kbRenderContent(); }

function kbRenderSidebar() {
  var cats = {};
  kbAllItems.forEach(function(i) { cats[i.category] = (cats[i.category] || 0) + 1; });
  var h = '<div class="kb-sidebar-section"><div class="kb-sidebar-title">Categories</div>';
  h += '<div class="kb-filter-item ' + (kbFilter === 'all' ? 'active' : '') + '" onclick="kbSetFilter(\'all\',this)">All <span class="kb-filter-count">' + kbAllItems.length + '</span></div>';
  Object.keys(cats).sort().forEach(function(c) { h += '<div class="kb-filter-item ' + (kbFilter === c ? 'active' : '') + '" onclick="kbSetFilter(\'' + c + '\',this)">' + c + ' <span class="kb-filter-count">' + cats[c] + '</span></div>'; });
  h += '</div><div class="kb-sidebar-section"><div class="kb-sidebar-title">Stats</div><div class="kb-quick-stat">Banks: ' + kbBanks.length + '</div><div class="kb-quick-stat">Docs: ' + kbAllItems.filter(function(i){return i.type==='document'}).length + '</div><div class="kb-quick-stat">Files: ' + kbFiles.length + '</div></div>';
  document.getElementById('kbSidebar').innerHTML = h;
}

function kbSetFilter(f, el) { kbFilter = f; document.querySelectorAll('.kb-filter-item').forEach(function(i){i.classList.remove('active')}); if(el) el.classList.add('active'); kbRenderContent(); }

function kbRenderContent() {
  var items = kbAllItems.slice();
  if (kbFilter !== 'all') items = items.filter(function(i) { return i.category === kbFilter; });
  if (kbSort === 'date-desc') items.sort(function(a,b){return new Date(b.date||0)-new Date(a.date||0)});
  else if (kbSort === 'date-asc') items.sort(function(a,b){return new Date(a.date||0)-new Date(b.date||0)});
  else if (kbSort === 'name-asc') items.sort(function(a,b){return a.name.localeCompare(b.name)});
  else if (kbSort === 'name-desc') items.sort(function(a,b){return b.name.localeCompare(a.name)});
  
  document.getElementById('kbItemCount').textContent = items.length + ' item' + (items.length !== 1 ? 's' : '');
  var content = document.getElementById('kbContent');
  content.innerHTML = '';
  content.className = (kbView === 'list') ? 'kb-list' : 'kb-grid';
  
  if (items.length === 0) { content.innerHTML = '<div class="kb-empty"><div class="kb-empty-icon">▣</div><p>Nothing found</p></div>'; return; }
  
  items.forEach(function(item) {
    var el = document.createElement('div');
    el.className = (kbView === 'list') ? 'kb-list-row' : 'kb-card';
    el.style.cursor = 'pointer';
    el.addEventListener('click', function() { content.querySelectorAll('.kb-list-row,.kb-card').forEach(function(c){c.classList.remove('selected')}); el.classList.add('selected'); el._kbItem = item; });
    el.addEventListener('dblclick', function() {
      if (item.type === 'bank') kbViewBank(item.id);
      else if (item.type === 'document') kbViewDocument(item.bankId, item.id);
      else if (item.type === 'file') kbViewFile(item.url, item.name);
    });
    var icon = item.type === 'bank' ? '▣' : item.type === 'document' ? '📄' : '⇩';
    if (kbView === 'list') el.innerHTML = '<div class="kb-list-icon">' + icon + '</div><div class="kb-list-name">' + item.name + '</div><div class="kb-list-type"><span class="kb-badge kb-badge-' + item.type + '">' + item.type + '</span></div><div class="kb-list-cat">' + item.category + '</div><div class="kb-list-date">' + (item.date ? new Date(item.date).toLocaleDateString() : '') + '</div>';
    else el.innerHTML = '<div class="kb-card-head"><span class="kb-card-icon">' + icon + '</span><span class="kb-badge kb-badge-' + item.type + '">' + item.type + '</span></div><div class="kb-card-name">' + item.name + '</div><div class="kb-card-desc">' + item.desc + '</div><div class="kb-card-meta">' + item.category + (item.count ? ' • ' + item.count + ' docs' : '') + (item.size ? ' • ' + (item.size/1024).toFixed(1)+' KB' : '') + '</div>';
    content.appendChild(el);
  });
}

function kbDeleteSelected() {
  var sel = document.querySelector('.kb-list-row.selected, .kb-card.selected');
  if (!sel || !sel._kbItem) return alert('Select an item first');
  var item = sel._kbItem;
  if (!confirm('Delete "' + item.name + '"?')) return;
  if (item.type === 'bank') fetch(API + '/info-banks/' + item.id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } }).then(kbRefresh);
  else if (item.type === 'document') fetch(API + '/info-banks/items/' + item.id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } }).then(kbRefresh);
  else if (item.type === 'file') alert('File deletion not implemented');
}

// ═══════════ BANK CRUD ═══════════
function kbCreateBank() { app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>Create Bank</h3><div class="input-group"><label>Name</label><input id="kbBankName"></div><div class="input-group"><label>Description</label><input id="kbBankDesc"></div><div class="input-group"><label>Category</label><input id="kbBankCat" placeholder="HR, Finance..."></div><div class="input-group"><label>Tags</label><input id="kbBankTags" placeholder="tag1, tag2"></div><button class="btn-primary" onclick="kbSaveBank()">Create</button>'); }
async function kbSaveBank() { var n = document.getElementById('kbBankName').value.trim(); if (!n) return alert('Enter name'); await app.api('/info-banks', 'POST', { name: n, description: document.getElementById('kbBankDesc').value, category: document.getElementById('kbBankCat').value || 'General', tags: document.getElementById('kbBankTags').value || '' }); app.closeModal(); kbRefresh(); }

async function kbViewBank(id) {
  var d = await app.api('/info-banks/' + id); var b = d.bank;
  if (!b) return;
  var items = b.items || [];
  var itemsHTML = items.map(function(doc) { return '<div style="padding:10px;border:1px solid var(--border);margin-bottom:4px;display:flex;justify-content:space-between;align-items:center"><div onclick="kbViewDocument(\'' + b.id + '\',\'' + doc.id + '\')" style="cursor:pointer;flex:1"><strong>' + doc.title + '</strong><p style="font-size:10px;color:var(--text-tertiary);margin-top:2px">' + (doc.content||'').substring(0,80) + '</p></div><button class="emp-delete-btn" onclick="event.stopPropagation();kbDeleteDocConfirm(\'' + b.id + '\',\'' + doc.id + '\')">✕</button></div>'; }).join('');
  app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>▣ ' + b.name + '</h3><div style="font-size:11px;color:var(--text-tertiary);margin-bottom:12px">' + (b.category||'') + ' • ' + items.length + ' docs' + (b.tags ? ' • ' + b.tags : '') + '</div><p style="color:var(--text-secondary);margin-bottom:16px">' + (b.description||'') + '</p><button class="btn-action" onclick="kbAddDoc(\'' + b.id + '\')">+ Add Document</button><button class="btn-action" onclick="kbEditBank(\'' + b.id + '\')">✎ Edit</button><div style="max-height:350px;overflow-y:auto;margin-top:16px">' + (itemsHTML || '<p style="color:var(--text-tertiary);text-align:center;padding:20px">No documents</p>') + '</div><div style="margin-top:16px;display:flex;gap:8px"><button class="btn-primary" onclick="app.closeModal()">Close</button><button class="btn-action" style="border-color:#ff4444;color:#ff4444" onclick="kbDeleteBankConfirm(\'' + b.id + '\')">Delete</button></div>');
}

function kbEditBank(id) { var b = kbBanks.find(function(x){return x.id===id}); if(!b) return; app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>Edit Bank</h3><div class="input-group"><label>Name</label><input id="kbBankName" value="' + b.name + '"></div><div class="input-group"><label>Description</label><input id="kbBankDesc" value="' + (b.description||'') + '"></div><div class="input-group"><label>Category</label><input id="kbBankCat" value="' + (b.category||'') + '"></div><div class="input-group"><label>Tags</label><input id="kbBankTags" value="' + (b.tags||'') + '"></div><button class="btn-primary" onclick="kbUpdateBank(\'' + id + '\')">Save</button>'); }
async function kbUpdateBank(id) { await app.api('/info-banks/' + id, 'PUT', { name: document.getElementById('kbBankName').value, description: document.getElementById('kbBankDesc').value, category: document.getElementById('kbBankCat').value, tags: document.getElementById('kbBankTags').value }); app.closeModal(); kbRefresh(); }

function kbAddDoc(bankId) { app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>Add Document</h3><div class="input-group"><label>Title</label><input id="kbDocTitle"></div><div class="input-group"><label>Content</label><textarea id="kbDocContent" rows="6" style="width:100%;padding:10px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:Inter;font-size:13px;resize:vertical"></textarea></div><div class="input-group"><label>Tags</label><input id="kbDocTags" placeholder="tag1, tag2"></div><button class="btn-primary" onclick="kbSaveDoc(\'' + bankId + '\')">Save</button>'); }
async function kbSaveDoc(bankId) { var t = document.getElementById('kbDocTitle').value.trim(); if (!t) return alert('Enter title'); await app.api('/info-banks/' + bankId + '/items', 'POST', { title: t, content: document.getElementById('kbDocContent').value, tags: document.getElementById('kbDocTags').value || '' }); app.closeModal(); kbViewBank(bankId); }

function kbViewDocument(bankId, docId) {
  app.api('/info-banks/' + bankId).then(function(res) {
    var doc = (res.bank?.items||[]).find(function(i){return i.id===docId}); if (!doc) return;
    app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>📄 ' + doc.title + '</h3><div style="color:var(--text-tertiary);font-size:10px;margin-bottom:12px">' + res.bank.name + ' • ' + new Date(doc.updatedAt||doc.createdAt).toLocaleDateString() + '</div><div style="background:var(--surface);border:1px solid var(--border);padding:20px;max-height:350px;overflow-y:auto;white-space:pre-wrap;font-size:14px;line-height:1.6">' + (doc.content||'') + '</div><div style="margin-top:16px;display:flex;gap:8px"><button class="btn-primary" onclick="app.closeModal()">Close</button><button class="btn-action" onclick="kbEditDocument(\'' + bankId + '\',\'' + docId + '\')">✎ Edit</button><button class="btn-action" style="border-color:#ff4444;color:#ff4444" onclick="kbDeleteDocConfirm(\'' + bankId + '\',\'' + docId + '\')">Delete</button></div>');
  });
}

function kbEditDocument(bankId, docId) {
  app.api('/info-banks/' + bankId).then(function(res) {
    var doc = (res.bank?.items||[]).find(function(i){return i.id===docId}); if (!doc) return;
    app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>Edit Document</h3><div class="input-group"><label>Title</label><input id="kbDocTitle" value="' + doc.title + '"></div><div class="input-group"><label>Content</label><textarea id="kbDocContent" rows="6" style="width:100%;padding:10px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:Inter;font-size:13px;resize:vertical">' + (doc.content||'') + '</textarea></div><div class="input-group"><label>Tags</label><input id="kbDocTags" value="' + (doc.tags||'') + '"></div><button class="btn-primary" onclick="kbUpdateDoc(\'' + bankId + '\',\'' + docId + '\')">Save Changes</button>');
  });
}

async function kbUpdateDoc(bankId, docId) { await app.api('/info-banks/items/' + docId, 'PUT', { title: document.getElementById('kbDocTitle').value, content: document.getElementById('kbDocContent').value, tags: document.getElementById('kbDocTags').value }); app.closeModal(); kbRefresh(); }
function kbDeleteDocConfirm(bankId, docId) { if (!confirm('Delete?')) return; fetch(API + '/info-banks/items/' + docId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } }).then(function(){ app.closeModal(); kbRefresh(); }); }
function kbDeleteBankConfirm(id) { if (!confirm('Delete bank and ALL documents?')) return; fetch(API + '/info-banks/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } }).then(function(){ app.closeModal(); kbRefresh(); }); }

function kbUploadFile() { document.getElementById('kbFileInput').click(); }
async function kbHandleUpload(e) { var f = e.target.files[0]; if (!f) return; var fd = new FormData(); fd.append('file', f); await fetch(API + '/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd }); e.target.value = ''; kbRefresh(); }
function kbViewFile(url, name) { var ext = (name||'').split('.').pop().toLowerCase(); var isImg = ['jpg','jpeg','png','gif','webp'].indexOf(ext) > -1; app.showModal('<button class="modal-close" onclick="app.closeModal()">&times;</button><h3>⇩ ' + (name||'File') + '</h3>' + (isImg ? '<img src="' + url + '" style="max-width:100%;max-height:450px;display:block;margin:0 auto">' : '<div style="text-align:center;padding:50px;font-size:56px">⇩</div>') + '<a href="' + url + '" download style="display:block;text-align:center;margin-top:16px;padding:12px;border:1px solid var(--border);color:var(--text);text-decoration:none;font-weight:600;letter-spacing:2px">Download</a>'); }
