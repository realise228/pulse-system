// Замена loadChats в app.js
// Ищем строку: if (tab === 'chats') loadChats();
// Она уже вызывает правильную функцию из chats.js
// Проблема в том что старая loadChats() переопределена локально
// Удаляем локальную loadChats из app.js

// Фикс: переименовываем локальную функцию
var fs = require('fs');
var content = fs.readFileSync('public/js/app.js', 'utf8');
content = content.replace('async function loadChats() {', 'async function _oldLoadChats() {');
content = content.replace("document.getElementById('chats').innerHTML = '<h2><span>Chats</span></h2><p style=\"color:#555;text-align:center;padding:60px\">Coming soon</p>';", 'loadChats();');
fs.writeFileSync('public/js/app.js', content);
console.log('app.js fixed');
