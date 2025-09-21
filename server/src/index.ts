import './config/load-env';
import http from 'http';
import { env } from './config/env';
import createApp from './server';

const port = Number(env.PORT);
const app = createApp();

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
