import { defineConfig } from 'vite';

export default defineConfig({
  root: '_site',
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  plugins: [{
    name: 'responsive-regression-preview',
    configureServer(server) {
      server.middlewares.use('/__qa', (req, res) => {
        const query = new URL(req.url, 'http://localhost').searchParams;
        const width = Math.max(320, Math.min(1440, Number(query.get('width')) || 390));
        const height = Math.max(320, Math.min(1200, Number(query.get('height')) || 844));
        const path = query.get('path') || '/pl/';
        const escaped = path.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><html><head><title>Responsive regression preview</title><style>body{margin:0;background:#18201d}iframe{display:block;width:${width}px;height:${height}px;border:0;margin:auto}</style></head><body><iframe title="Portfolio preview" src="${escaped}"></iframe></body></html>`);
      });
    }
  }]
});
