import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure SQLite database is initialized via Python script on startup
function ensureSqliteDatabase() {
  const initScript = path.join(__dirname, 'database', 'init_db.py');
  if (fs.existsSync(initScript)) {
    const res = spawnSync('python3', [initScript], { encoding: 'utf-8' });
    if (res.stdout) console.log(res.stdout.trim());
    if (res.stderr) console.error(res.stderr.trim());
  }
}

async function startServer() {
  ensureSqliteDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Endpoint to read the organized project source files for Viva & Code Inspection
  app.get('/api/project-files', (_req, res) => {
    const filesToRead = [
      { path: 'database/schema.sql', section: 'Database (SQLite)', title: 'schema.sql' },
      { path: 'database/init_db.py', section: 'Database (SQLite)', title: 'init_db.py' },
      { path: 'backend/app.py', section: 'Backend (Python Flask)', title: 'app.py' },
      { path: 'backend/requirements.txt', section: 'Backend (Python Flask)', title: 'requirements.txt' },
      { path: 'frontend/index.html', section: 'Frontend (HTML/CSS/JS)', title: 'index.html' },
      { path: 'frontend/style.css', section: 'Frontend (HTML/CSS/JS)', title: 'style.css' },
      { path: 'frontend/script.js', section: 'Frontend (HTML/CSS/JS)', title: 'script.js' },
    ];

    const files = filesToRead.map((item) => {
      const fullPath = path.join(__dirname, item.path);
      const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : '';
      return { ...item, content };
    });

    res.json({ files });
  });

  // Delegate all /api/* REST calls to Python backend/app.py (SQLite3)
  app.use('/api', (req, res) => {
    const pyScript = path.join(__dirname, 'backend', 'app.py');
    const cleanPath = req.originalUrl.split('?')[0];
    const payload = JSON.stringify({
      method: req.method,
      path: cleanPath,
      query: req.query || {},
      body: req.body || {},
    });

    const result = spawnSync('python3', [pyScript, '--cli-json'], {
      input: payload,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      res.status(500).json({ error: `Python execution error: ${result.error.message}` });
      return;
    }

    try {
      const output = JSON.parse(result.stdout.trim());
      res.status(output.status || 200).json(output.data);
    } catch (err) {
      console.error('Python stderr:', result.stderr);
      res.status(500).json({
        error: 'Failed to parse response from Python SQLite backend.',
        details: result.stderr || result.stdout,
      });
    }
  });

  // Serve Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ServiceBid server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
