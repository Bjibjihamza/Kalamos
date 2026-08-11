import { io } from 'socket.io-client';

export const socket = io({ autoConnect: false });

export function connectToProject(slug) {
  socket.connect();
  socket.emit('project:join', slug);
}

export function disconnectFromProject() {
  socket.emit('project:leave');
  socket.disconnect();
}
