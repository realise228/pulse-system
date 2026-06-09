// ═══════════════ 1C CRM CONSTRUCTOR — TILDA STYLE ═══════════════
var crmConfig = null;
var crmSelectedId = null;
var crmDragType = null;
var crmDragBlockId = null;

var BLOCK_TYPES = {
  catalog:    { name: 'Справочник', icon: '📁', color: '#fff', desc: 'Хранение списков: клиенты, товары, контрагенты' },
  document:   { name: 'Документ', icon: '📄', color: '#ccc', desc: 'Операции: заказы, счета, накладные' },
  register:   { name: 'Регистр', icon: '📊', color: '#aaa', desc: 'Накопление данных: остатки, обороты, цены' },
  report:     { name: 'Отчёт', icon: '📋', color: '#888', desc: 'Вывод данных: продажи по месяцам, анализ' },
  enum:       { name: 'Перечисление', icon: '🔢', color: '#666', desc: 'Фиксированные наборы значений: статусы, типы' },
  exchange:   { name: 'План обмена', icon: '🔄', color: '#555', desc: 'Обмен данными между базами 1С' }
};

var FIELD_TYPES = ['Строка', 'Число', 'Дата', 'Булево', 'Ссылка', 'Табличная часть', 'Составной тип'];

function loadCrm() {
  document.getElementById('crm').innerHTML = `
    <div class="crm-toolbar">
      <h2 style="border:none;padding:0;margin:0;font-size:22px"><span>1C CRM Constructor</span></h2>
      <div class="crm-toolbar-actions">
        <button class="btn-action" onclick="crmNew()">+ Новая конфигурация</button>
        <button class="btn-action" onclick="crmSave()">💾 Сохранить</button>
        <button class="btn-action" onclick="crmExport()">⬇ Экспорт XML</button>
        <button class="btn-action" onclick="crmPreview()">👁 Структура</button>
      </div>
      <span id="crmConfigLabel" style="color:var(--text-tertiary);font-size:12px;white-space:nowrap"></span>
    </div>

    <div class="crm-workspace">
      <div class="crm-palette">
        <div class="crm-palette-title">Компоненты</div>
        <div class="crm-palette-grid" id="crmPalette"></div>
        <div class="crm-palette-hint">Кликните по блоку или перетащите на холст</div>
      </div>

      <div class="crm-canvas" id="crmCanvas"
        ondragover="event.preventDefault(); document.getElementById('crmCanvas').classList.add('drag-over')"
        ondragleave="document.getElementById('crmCanvas').classList.remove('drag-over')"
        ondrop="crmCanvasDrop(event)"
        onclick="crmDeselectAll(event)">
        <div class="crm-canvas-empty" id="crmCanvasEmpty">
          <div class="crm-canvas-empty-icon">⌬</div>
          <p>Перетащите блоки сюда</p>
          <small>Справочники, документы, регистры, отчёты</small>
        </div>
        <div class="crm-canvas-arrows" id="crmCanvasArrows"></div>
      </div>

      <div class="crm-props" id="crmProps">
        <div class="crm-palette-title">Свойства</div>
        <div id="crmPropsContent"><p style="color:var(--text-tertiary);font-size:12px;text-align:center;padding:40px">Выберите блок для редактирования</p></div>
      </div>
    </div>

    <div id="crmModal" class="modal" onclick="if(event.target===this)crmCloseModal()">
      <div class="modal-content" id="crmModalContent"></div>
    </div>`;

  initPalette();
  crmLoadLast();
}

function initPalette() {
  var html = '';
  Object.keys(BLOCK_TYPES).forEach(function(k) {
    var t = BLOCK_TYPES[k];
    html += '<div class="crm-palette-block" draggable="true" ondragstart="crmDragStart(event,\'' + k + '\')" onclick="crmAddBlock(\'' + k + '\')">' +
      '<span class="crm-palette-icon">' + t.icon + '</span>' +
      '<div class="crm-palette-info"><span class="crm-palette-name">' + t.name + '</span><span class="crm-palette-desc">' + t.desc + '</span></div>' +
    '</div>';
  });
  document.getElementById('crmPalette').innerHTML = html;
}

async function crmLoadLast() {
  var data = await app.api('/crm/templates');
  var templates = data.templates || [];
  if (templates.length > 0) {
    crmConfig = templates[0];
    try { crmConfig.blocks = JSON.parse(crmConfig.modules || '[]'); } catch(e) { crmConfig.blocks = []; }
  } else {
    crmNew();
  }
  crmRefresh();
}

function crmNew() {
  crmConfig = { id: null, name: 'Новая конфигурация', description: '', blocks: [] };
  crmRefresh();
}

function crmDragStart(e, type) {
  crmDragType = type;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', type);
}

function crmCanvasDrop(e) {
  e.preventDefault();
  document.getElementById('crmCanvas').classList.remove('drag-over');
  var type = e.dataTransfer.getData('text/plain') || crmDragType;
  if (type && BLOCK_TYPES[type]) {
    // Определяем позицию дропа для вставки между блоками
    var y = e.clientY;
    var blocks = document.querySelectorAll('.crm-canvas-block');
    var insertIndex = crmConfig.blocks.length;
    blocks.forEach(function(b, i) {
      var rect = b.getBoundingClientRect();
      if (y < rect.top + rect.height / 2 && insertIndex === crmConfig.blocks.length) {
        insertIndex = i;
      }
    });
    crmAddBlockAt(type, insertIndex);
  }
  crmDragType = null;
}

function crmAddBlock(type) { crmAddBlockAt(type, crmConfig.blocks.length); }

function crmAddBlockAt(type, index) {
  var t = BLOCK_TYPES[type];
  var block = {
    id: 'blk_' + Date.now(),
    type: type,
    name: t.name + ' ' + (crmConfig.blocks.filter(function(b) { return b.type === type; }).length + 1),
    fields: [],
    links: []
  };
  crmConfig.blocks.splice(index, 0, block);
  crmSelectBlock(block.id);
  crmRefresh();
}

// ═══════════ РЕНДЕР ХОЛСТА ═══════════
function crmRefresh() {
  var canvas = document.getElementById('crmCanvas');
  var empty = document.getElementById('crmCanvasEmpty');
  var label = document.getElementById('crmConfigLabel');
  
  label.textContent = crmConfig.name + ' • ' + crmConfig.blocks.length + ' блоков';
  empty.style.display = crmConfig.blocks.length === 0 ? 'flex' : 'none';
  
  canvas.querySelectorAll('.crm-canvas-block').forEach(function(el) { el.remove(); });
  
  crmConfig.blocks.forEach(function(block, index) {
    var t = BLOCK_TYPES[block.type] || { icon: '?', name: block.type, color: '#fff', desc: '' };
    var isSelected = crmSelectedId === block.id;
    
    var el = document.createElement('div');
    el.className = 'crm-canvas-block' + (isSelected ? ' selected' : '');
    el.setAttribute('data-id', block.id);
    el.setAttribute('draggable', 'true');
    
    el.ondragstart = function(e) {
      crmDragBlockId = block.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/blockid', block.id);
      el.style.opacity = '0.4';
    };
    el.ondragend = function(e) {
      el.style.opacity = '1';
      document.querySelectorAll('.crm-canvas-block').forEach(function(b) { b.classList.remove('drop-target'); });
      crmDragBlockId = null;
    };
    el.ondragover = function(e) {
      e.preventDefault();
      if (crmDragBlockId && crmDragBlockId !== block.id) {
        el.classList.add('drop-target');
      }
    };
    el.ondragleave = function(e) { el.classList.remove('drop-target'); };
    el.ondrop = function(e) {
      e.preventDefault();
      el.classList.remove('drop-target');
      if (crmDragBlockId && crmDragBlockId !== block.id) {
        var fromIdx = crmConfig.blocks.findIndex(function(b) { return b.id === crmDragBlockId; });
        var toIdx = crmConfig.blocks.findIndex(function(b) { return b.id === block.id; });
        if (fromIdx > -1 && toIdx > -1) {
          var moved = crmConfig.blocks.splice(fromIdx, 1)[0];
          crmConfig.blocks.splice(toIdx, 0, moved);
          crmRefresh();
        }
      }
    };
    
    el.onclick = function(e) { e.stopPropagation(); crmSelectBlock(block.id); };
    
    var links = crmConfig.blocks.filter(function(b) { return (b.links || []).indexOf(block.id) > -1; });
    
    el.innerHTML = 
      '<div class="crm-block-head" style="border-left:3px solid ' + t.color + '">' +
        '<span class="crm-block-head-icon">' + t.icon + '</span>' +
        '<span class="crm-block-head-name">' + block.name + '</span>' +
        '<span class="crm-block-head-type" style="color:' + t.color + '">' + t.name + '</span>' +
        (links.length > 0 ? '<span class="crm-block-head-links" title="Связан с: ' + links.map(function(l) { return l.name; }).join(', ') + '">🔗' + links.length + '</span>' : '') +
        '<button class="crm-block-head-del" onclick="event.stopPropagation();crmDeleteBlock(\'' + block.id + '\')">✕</button>' +
      '</div>' +
      '<div class="crm-block-body">' +
        (block.fields.length > 0 
          ? '<div class="crm-block-fields-list">' + block.fields.map(function(f) {
              return '<div class="crm-field-badge"><strong>' + f.name + '</strong><span>' + f.type + '</span></div>';
            }).join('') + '</div>'
          : '<div class="crm-block-body-empty">Нет реквизитов. Добавьте в свойствах →</div>') +
      '</div>';
    
    canvas.appendChild(el);
  });

  // Обновляем панель свойств если выделен блок
  if (crmSelectedId) {
    var block = crmConfig.blocks.find(function(b) { return b.id === crmSelectedId; });
    if (block) crmRenderProps(block);
    else crmClearProps();
  } else {
    crmClearProps();
  }
}

// ═══════════ ПАНЕЛЬ СВОЙСТВ ═══════════
function crmSelectBlock(id) {
  crmSelectedId = id;
  var block = crmConfig.blocks.find(function(b) { return b.id === id; });
  crmRefresh();
}

function crmDeselectAll(e) {
  if (e && e.target.closest('.crm-canvas-block')) return;
  if (e && e.target.closest('.crm-props')) return;
  if (e && e.target.closest('button')) return;
  crmSelectedId = null;
  crmRefresh();
}

function crmClearProps() {
  document.getElementById('crmPropsContent').innerHTML = '<p style="color:var(--text-tertiary);font-size:12px;text-align:center;padding:40px">Выберите блок для редактирования</p>';
}

function crmRenderProps(block) {
  var t = BLOCK_TYPES[block.type];
  var availableLinks = crmConfig.blocks.filter(function(b) { return b.id !== block.id; });
  
  var html = 
    '<div class="crm-prop-group"><label>Название</label><input class="crm-prop-input" value="' + block.name + '" onchange="crmUpdateBlock(\'' + block.id + '\',\'name\',this.value)" placeholder="Название блока"></div>' +
    '<div class="crm-prop-group"><label>Тип</label><select class="crm-prop-input" onchange="crmUpdateBlock(\'' + block.id + '\',\'type\',this.value)">' +
      Object.keys(BLOCK_TYPES).map(function(k) {
        return '<option value="' + k + '"' + (block.type === k ? ' selected' : '') + '>' + BLOCK_TYPES[k].name + '</option>';
      }).join('') +
    '</select></div>' +
    '<div class="crm-prop-group"><label>Связи (ссылки на другие блоки)</label>' +
      (availableLinks.length > 0 
        ? '<div class="crm-links-grid">' + availableLinks.map(function(l) {
            var linked = (block.links || []).indexOf(l.id) > -1;
            return '<label class="crm-link-item' + (linked ? ' active' : '') + '"><input type="checkbox" ' + (linked ? 'checked' : '') + ' onchange="crmToggleLink(\'' + block.id + '\',\'' + l.id + '\', this.checked)">' + BLOCK_TYPES[l.type].icon + ' ' + l.name + '</label>';
          }).join('') + '</div>'
        : '<span style="color:var(--text-tertiary);font-size:10px">Нет доступных блоков для связи</span>') +
    '</div>' +
    '<div class="crm-prop-group"><label>Реквизиты (' + block.fields.length + ')</label>' +
      '<div class="crm-fields-editor">' +
        block.fields.map(function(f, i) {
          return '<div class="crm-field-row"><input value="' + f.name + '" onchange="crmUpdateField(\'' + block.id + '\',' + i + ',\'name\',this.value)" placeholder="Имя реквизита"><select onchange="crmUpdateField(\'' + block.id + '\',' + i + ',\'type\',this.value)">' +
            FIELD_TYPES.map(function(ft) { return '<option' + (f.type === ft ? ' selected' : '') + '>' + ft + '</option>'; }).join('') +
          '</select><button class="crm-field-del" onclick="crmDeleteField(\'' + block.id + '\',' + i + ')">✕</button></div>';
        }).join('') +
        '<button class="crm-add-field-btn" onclick="crmAddField(\'' + block.id + '\')">+ Добавить реквизит</button>' +
      '</div>' +
    '</div>' +
    '<button class="btn-action" style="width:100%;text-align:center;border-color:#ff4444;color:#ff4444;margin-top:16px" onclick="crmDeleteBlock(\'' + block.id + '\')">🗑 Удалить блок</button>';
  
  document.getElementById('crmPropsContent').innerHTML = html;
}

function crmUpdateBlock(id, prop, val) {
  var block = crmConfig.blocks.find(function(b) { return b.id === id; });
  if (!block) return;
  block[prop] = val;
  if (prop === 'type') { block.links = []; }
  crmRefresh();
}

function crmToggleLink(blockId, linkId, checked) {
  var block = crmConfig.blocks.find(function(b) { return b.id === blockId; });
  if (!block) return;
  if (!block.links) block.links = [];
  if (checked) {
    if (block.links.indexOf(linkId) === -1) block.links.push(linkId);
  } else {
    block.links = block.links.filter(function(l) { return l !== linkId; });
  }
  crmRefresh();
}

function crmAddField(blockId) {
  var block = crmConfig.blocks.find(function(b) { return b.id === blockId; });
  if (!block) return;
  block.fields.push({ name: 'НовыйРеквизит' + (block.fields.length + 1), type: 'Строка' });
  crmRefresh();
}

function crmUpdateField(blockId, idx, prop, val) {
  var block = crmConfig.blocks.find(function(b) { return b.id === blockId; });
  if (!block || !block.fields[idx]) return;
  block.fields[idx][prop] = val;
}

function crmDeleteField(blockId, idx) {
  var block = crmConfig.blocks.find(function(b) { return b.id === blockId; });
  if (!block) return;
  block.fields.splice(idx, 1);
  crmRefresh();
}

function crmDeleteBlock(id) {
  if (!confirm('Удалить этот блок?')) return;
  // Удаляем ссылки на этот блок из других блоков
  crmConfig.blocks.forEach(function(b) {
    if (b.links) b.links = b.links.filter(function(l) { return l !== id; });
  });
  crmConfig.blocks = crmConfig.blocks.filter(function(b) { return b.id !== id; });
  crmSelectedId = null;
  crmRefresh();
}

// ═══════════ СОХРАНЕНИЕ И ЭКСПОРТ ═══════════
async function crmSave() {
  if (!crmConfig) return alert('Нечего сохранять');
  var payload = {
    name: crmConfig.name,
    description: crmConfig.description || '',
    modules: JSON.stringify(crmConfig.blocks),
    config: '{}'
  };
  
  if (crmConfig.id) {
    await app.api('/crm/templates/' + crmConfig.id, 'PUT', payload);
  } else {
    var data = await app.api('/crm/templates', 'POST', payload);
    if (data.template) crmConfig.id = data.template.id;
  }
  alert('✅ Конфигурация сохранена');
}

async function crmExport() {
  if (!crmConfig) return alert('Нечего экспортировать');
  await crmSave();
  
  var data = await app.api('/crm/templates/' + crmConfig.id + '/export', 'POST');
  if (data.xmlContent) {
    document.getElementById('crmModalContent').innerHTML = 
      '<button class="modal-close" onclick="crmCloseModal()">&times;</button>' +
      '<h3>1C XML — Готов к импорту</h3>' +
      '<div style="margin-bottom:12px;font-size:11px;color:var(--text-tertiary)">Скопируйте этот XML и загрузите в Конфигуратор 1С</div>' +
      '<pre style="background:#0a0a0a;padding:20px;border:1px solid var(--border);color:#aaa;font-size:11px;max-height:450px;overflow-y:auto;white-space:pre-wrap;font-family:monospace">' + 
        data.xmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') + 
      '</pre>' +
      '<button class="btn-primary" style="margin-top:16px" onclick="crmDownloadXML()">📥 Скачать .xml файл</button>' +
      '<button class="btn-action" style="margin-top:8px;width:100%;text-align:center" onclick="crmCloseModal()">Закрыть</button>';
    document.getElementById('crmModal').classList.add('active');
  }
}

function crmDownloadXML() {
  var a = document.createElement('a');
  a.href = API + '/crm/templates/' + crmConfig.id + '/export/download';
  a.download = (crmConfig.name || 'config').replace(/\s/g, '_') + '.xml';
  a.click();
}

function crmPreview() {
  if (!crmConfig || crmConfig.blocks.length === 0) {
    return alert('Добавьте блоки для предпросмотра');
  }
  
  var html = '<button class="modal-close" onclick="crmCloseModal()">&times;</button><h3>Структура конфигурации</h3>';
  html += '<div style="font-size:12px;color:var(--text-tertiary);margin-bottom:16px">' + crmConfig.blocks.length + ' блоков</div>';
  
  crmConfig.blocks.forEach(function(b) {
    var t = BLOCK_TYPES[b.type];
    var links = crmConfig.blocks.filter(function(lb) { return (b.links || []).indexOf(lb.id) > -1; });
    html += '<div style="border:1px solid var(--border);padding:12px;margin-bottom:8px;border-left:3px solid ' + t.color + '">' +
      '<strong>' + t.icon + ' ' + b.name + '</strong> <span style="color:var(--text-tertiary);font-size:10px">' + t.name + '</span>' +
      '<div style="margin-top:6px;font-size:11px">' +
        (b.fields.length > 0 ? 'Реквизиты: ' + b.fields.map(function(f) { return f.name + ' (' + f.type + ')'; }).join(', ') : 'Нет реквизитов') +
      '</div>' +
      (links.length > 0 ? '<div style="margin-top:4px;font-size:10px;color:#888">Ссылается на: ' + links.map(function(l) { return l.name; }).join(', ') + '</div>' : '') +
    '</div>';
  });
  
  document.getElementById('crmModalContent').innerHTML = html;
  document.getElementById('crmModal').classList.add('active');
}

function crmCloseModal() {
  document.getElementById('crmModal').classList.remove('active');
}
