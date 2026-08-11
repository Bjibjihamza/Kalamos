import { createApp } from './app.js';
import { PORT } from './config.js';

const { server } = createApp();

server.listen(PORT, () => {
  console.log(`kalamos server listening on http://localhost:${PORT}`);
});
