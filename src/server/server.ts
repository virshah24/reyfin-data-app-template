import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const host = '0.0.0.0';

createApp().listen(port, host, () => {
  console.log(`Reyfin data app template listening on http://${host}:${port}`);
});
