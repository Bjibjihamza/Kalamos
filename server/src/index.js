import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';
import { Server } from 'socket.io';
import apiRouter from './routes/api.js';
import { PORT, DIST_DIR, PROJECTS_DIR, TEMPLATES_DIR } from './config.js';
import { errorHandler, notFound } from './http.js';
import { events } from './events.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: 'text/plain', limit: '50mb' }));
app.use('/api', apiRouter);

fs.mkdirSync(PROJECTS_DIR, { recursive: true });
fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api|\/socket\.io).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.use('/api', notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  socket.on('project:join', (slug) => {
    if (typeof slug === 'string') socket.join(`project:${slug}`);
  });
  socket.on('project:leave', (slug) => {
    if (typeof slug === 'string') socket.leave(`project:${slug}`);
  });
});

const eventNames = ['compile:start', 'compile:log', 'compile:done'];
for (const name of eventNames) {
  events.on(name, (payload) => {
    io.to(`project:${payload.slug}`).emit(name, payload);
  });
}

server.listen(PORT, () => {
  console.log(`preleaf server listening on http://localhost:${PORT}`);
});
