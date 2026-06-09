var activeChatId = null;
var chatSocket = null;
var allChats = [];

function loadChats() {
  var container = document.getElementById('chats');
  container.innerHTML = '<div class="chat-layout"><div class="chat-sidebar" id="chatSidebar"><div class="chat-sidebar-header"><h2 style="border:none;padding:0;margin:0;font-size:20px"><span>Chats</span></h2><button class="btn-action" onclick="showCreateChatModal()" style="margin:0">+ New</button></div><div class="chat-list" id="chatList"><p style="color:var(--text-tertiary);text-align:center;padding:40px">Loading...</p></div></div><div class="chat-main"><div class="chat-empty" id="chatEmpty"><div class="chat-empty-icon">◈</div><p>Select a chat</p><small>or create a new one</small></div><div class="chat-window" id="chatWindow" style="display:none"><div class="chat-window-header" id="chatWindowHeader"></div><div class="chat-messages" id="chatMessages"></div><div class="chat-typing" id="chatTyping" style="display:none"></div><div class="chat-input-bar"><input type="text" id="msgInput" placeholder="Type a message..." onkeydown="handleChatKey(event)"><button class="btn-action" onclick="sendMessage()" style="margin:0">Send</button></div></div></div></div>';

  refreshChats();
  connectChatSocket();
}

async function refreshChats() {
  var data = await app.api('/chats');
  allChats = data.chats || [];
  renderChatList();
}

function renderChatList() {
  var list = document.getElementById('chatList');
  if (allChats.length === 0) {
    list.innerHTML = '<div class="chat-empty-list"><p>No chats yet</p><small>Create one to start messaging</small></div>';
    return;
  }
  
  list.innerHTML = allChats.map(function(c) {
    var isActive = activeChatId === c.id ? ' active' : '';
    return '<div class="chat-list-item' + isActive + '" onclick="openChat(\'' + c.id + '\')"><div class="chat-list-avatar">' + c.name.charAt(0).toUpperCase() + '</div><div class="chat-list-info"><div class="chat-list-name">' + c.name + '</div><div class="chat-list-desc">' + (c.description || 'No description') + '</div></div><button class="emp-delete-btn" onclick="event.stopPropagation();deleteChat(\'' + c.id + '\')" title="Delete chat">✕</button></div>';
  }).join('');
}

function connectChatSocket() {
  if (chatSocket) return;
  chatSocket = io('/', { auth: { token: token } });
  
  chatSocket.on('chat:new-message', function(msg) {
    if (activeChatId === msg.chatId) appendMessage(msg);
    refreshChats();
  });
  
  chatSocket.on('chat:user-typing', function(data) {
    if (activeChatId === data.chatId) {
      var typingEl = document.getElementById('chatTyping');
      typingEl.textContent = data.userName + ' is typing...';
      typingEl.style.display = 'block';
      clearTimeout(typingEl._timeout);
      typingEl._timeout = setTimeout(function() { typingEl.style.display = 'none'; }, 2000);
    }
  });
}

async function openChat(chatId) {
  activeChatId = chatId;
  document.getElementById('chatEmpty').style.display = 'none';
  document.getElementById('chatWindow').style.display = 'flex';
  
  var chat = allChats.find(function(c) { return c.id === chatId; });
  if (chat) {
    var members = chat.members || [];
    document.getElementById('chatWindowHeader').innerHTML = '<div class="chat-window-avatar">' + chat.name.charAt(0).toUpperCase() + '</div><div><div class="chat-window-name">' + chat.name + '</div><div class="chat-window-desc">' + (chat.description || '') + '</div></div><div style="display:flex;gap:8px;margin-left:auto"><button class="btn-action" onclick="showAddMemberModal(\'' + chatId + '\')" style="margin:0;font-size:10px;padding:6px 12px">+ Add Member</button><button class="emp-delete-btn" onclick="deleteChat(\'' + chatId + '\')" title="Delete chat">✕</button></div>';
  }
  
  if (chatSocket) chatSocket.emit('chat:join', chatId);
  renderChatList();
  await loadMessages(chatId);
}

async function loadMessages(chatId) {
  var data = await app.api('/chats/' + chatId);
  var chat = data.chat;
  var messagesEl = document.getElementById('chatMessages');
  
  if (!chat || !chat.messages || chat.messages.length === 0) {
    messagesEl.innerHTML = '<div class="chat-empty-messages"><p>No messages yet</p><small>Start the conversation</small></div>';
  } else {
    messagesEl.innerHTML = chat.messages.map(function(m) {
      var isOwn = m.userId === user.id;
      var time = new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return '<div class="msg' + (isOwn ? ' msg-own' : '') + '"><div class="msg-author">' + (m.user ? m.user.lastName + ' ' + m.user.firstName : 'User') + '</div><div class="msg-bubble">' + m.content + '</div><div class="msg-time">' + time + '</div></div>';
    }).join('');
    scrollToBottom();
  }
}

function appendMessage(msg) {
  var messagesEl = document.getElementById('chatMessages');
  var isOwn = msg.userId === user.id;
  var time = new Date(msg.timestamp || Date.now()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  var emptyState = messagesEl.querySelector('.chat-empty-messages');
  if (emptyState) messagesEl.innerHTML = '';
  messagesEl.insertAdjacentHTML('beforeend', '<div class="msg' + (isOwn ? ' msg-own' : '') + '"><div class="msg-author">' + (msg.userName || 'User') + '</div><div class="msg-bubble">' + msg.content + '</div><div class="msg-time">' + time + '</div></div>');
  scrollToBottom();
}

function scrollToBottom() {
  var el = document.getElementById('chatMessages');
  if (el) el.scrollTop = el.scrollHeight;
}

async function sendMessage() {
  var input = document.getElementById('msgInput');
  var content = input.value.trim();
  if (!content || !activeChatId) return;
  input.value = '';
  if (chatSocket) chatSocket.emit('chat:message', { chatId: activeChatId, content: content });
  await app.api('/chats/' + activeChatId + '/messages', 'POST', { content: content });
  loadMessages(activeChatId);
}

function handleChatKey(e) {
  if (e.key === 'Enter') sendMessage();
  if (chatSocket && activeChatId) chatSocket.emit('chat:typing', activeChatId);
}

function showCreateChatModal() {
  app.showModal(
    '<button class="modal-close" onclick="app.closeModal()">&times;</button>' +
    '<h3>New Chat</h3>' +
    '<div class="input-group"><label>Chat Name</label><input id="chatName" placeholder="General, Project X, etc."></div>' +
    '<div class="input-group"><label>Description</label><input id="chatDesc" placeholder="What is this chat about?"></div>' +
    '<button class="btn-primary" onclick="submitCreateChat()">Create Chat</button>'
  );
}

async function submitCreateChat() {
  var name = document.getElementById('chatName').value.trim();
  var desc = document.getElementById('chatDesc').value.trim();
  if (!name) return alert('Enter chat name');
  var data = await app.api('/chats', 'POST', { name: name, description: desc, memberIds: [user.id] });
  if (data.error) return alert(data.error);
  app.closeModal();
  refreshChats();
}

// ДОБАВЛЕНИЕ СОТРУДНИКОВ В ЧАТ
async function showAddMemberModal(chatId) {
  var empRes = await app.api('/employees');
  var employees = empRes.employees || [];
  var chat = allChats.find(function(c) { return c.id === chatId; });
  var memberIds = (chat?.members || []).map(function(m) { return m.userId; });
  
  var empListHTML = employees.map(function(e) {
    var isMember = memberIds.indexOf(e.userId) > -1;
    return '<div class="member-select-item' + (isMember ? ' selected' : '') + '" onclick="toggleMember(\'' + e.userId + '\', this)" data-userid="' + e.userId + '"><div class="emp-card-avatar" style="width:36px;height:36px;font-size:13px">' + e.user.firstName[0] + e.user.lastName[0] + '</div><div>' + e.user.lastName + ' ' + e.user.firstName + '</div><div style="font-size:11px;color:var(--text-tertiary)">' + e.position + '</div>' + (isMember ? '<span style="color:#0f0;margin-left:auto">✓</span>' : '<span style="color:var(--text-tertiary);margin-left:auto">+</span>') + '</div>';
  }).join('');
  
  app.showModal(
    '<button class="modal-close" onclick="app.closeModal()">&times;</button>' +
    '<h3>Add Members</h3>' +
    '<div style="max-height:400px;overflow-y:auto;margin-bottom:20px">' + empListHTML + '</div>' +
    '<button class="btn-primary" onclick="saveMembers(\'' + chatId + '\')">Save</button>'
  );
}

var selectedMembers = [];

function toggleMember(userId, el) {
  var idx = selectedMembers.indexOf(userId);
  if (idx > -1) {
    selectedMembers.splice(idx, 1);
    el.classList.remove('selected');
    el.querySelector('span:last-child').textContent = '+';
  } else {
    selectedMembers.push(userId);
    el.classList.add('selected');
    el.querySelector('span:last-child').textContent = '✓';
    el.querySelector('span:last-child').style.color = '#0f0';
  }
}

async function saveMembers(chatId) {
  for (var i = 0; i < selectedMembers.length; i++) {
    await app.api('/chats/' + chatId + '/members', 'POST', { userId: selectedMembers[i] });
  }
  selectedMembers = [];
  app.closeModal();
  refreshChats();
  if (activeChatId === chatId) openChat(chatId);
}

async function deleteChat(chatId) {
  if (!confirm('Delete this chat?')) return;
  try {
    await app.api('/chats/' + chatId, 'DELETE');
    if (activeChatId === chatId) {
      activeChatId = null;
      document.getElementById('chatEmpty').style.display = 'flex';
      document.getElementById('chatWindow').style.display = 'none';
    }
    refreshChats();
  } catch(e) {
    alert('Error: ' + e.message);
  }
}
