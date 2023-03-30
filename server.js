const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database('./chat.db', (err) => {
  if (err) throw err;
  console.log('Connected to SQLite');

  db.run(
    'CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, content TEXT)',
    (err) => {
      if (err) throw err;

      io.on('connection', (socket) => {
        console.log('A user connected');

        db.all('SELECT * FROM messages', (err, messages) => {
          if (err) throw err;
          socket.emit('load messages', messages);
        });

        socket.on('chat message', (msg) => {
          db.run(
            'INSERT INTO messages (username, content) VALUES (?, ?)',
            [msg.username, msg.content],
            (err) => {
              if (err) throw err;
              io.emit('chat message', msg);
            }
          );
        });

        socket.on('disconnect', () => {
          console.log('A user disconnected');
        });
      });

      app.use(express.static('public'));

      server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });
    }
  );
});
