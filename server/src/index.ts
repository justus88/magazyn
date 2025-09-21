import http from 'http';
import createApp from './server';

const port = Number(process.env.PORT || 4000);
const app = createApp();

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
