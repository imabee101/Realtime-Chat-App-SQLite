const socket = io();

const usernameContainer = document.getElementById('username-container');
const usernameInput = document.getElementById('username');
const submitUsername = document.getElementById('submit-username');
const chatContent = document.getElementById('chat-content');
const messages = document.getElementById('messages');
const form = document.getElementById('form');
const messageInput = document.getElementById('message');

let username = '';

submitUsername.addEventListener('click', () => {
  username = usernameInput.value.trim();
  if (username) {
    usernameContainer.style.display = 'none';
    chatContent.removeAttribute('hidden');
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (messageInput.value) {
    const msg = {
      username,
      content: messageInput.value,
    };
    socket.emit('chat message', msg);
    messageInput.value = '';
  }
});

socket.on('load messages', (msgs) => {
  msgs.forEach((msg) => addMessage(msg));
});

socket.on('chat message', (msg) => {
  addMessage(msg);
});

function addMessage(msg) {
  const li = document.createElement('li');
  li.innerHTML = `<span>${msg.username}:</span> ${msg.content}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}
