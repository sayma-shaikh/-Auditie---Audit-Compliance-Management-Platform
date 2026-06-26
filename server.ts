import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './server/api/auth/auth.routes.ts';
import projectRoutes from './server/api/projects/project.routes.ts';
import projectLifecycleRoutes from './server/api/projects/project-lifecycle.routes.ts';
import documentRoutes from './server/api/documents/document.routes.ts';
import auditRoutes from './server/api/audit/audit.routes.ts';
import templateRoutes from './server/api/templates/template.routes.ts';
import generatedDocumentRoutes from './server/api/documents/generated-document.routes.ts';
import registerRoutes from './server/api/register/register.routes.ts';
import repositoryRoutes from './server/api/repository/repository.routes.ts';
import userRoutes from './server/api/users/user.routes.ts';
import dashboardRoutes from './server/api/dashboard/dashboard.routes.ts';

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  app.get('/oauth2callback', (req, res) => {
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    res.redirect(`/api/repository/drive/callback${queryString}`)
  })

  // Static serving for logos and generated files
  const root = process.cwd();
  app.use('/uploads', express.static(path.join(root, 'uploads')));
  app.use('/generated', express.static(path.join(root, 'generated')));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api', projectLifecycleRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api', generatedDocumentRoutes);
  app.use('/api', registerRoutes);
  app.use('/api/repository', repositoryRoutes);
  app.use('/api', userRoutes);
  app.use('/api', dashboardRoutes);

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(root, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
    const desiredPort = Number(process.env.PORT || 3000);
    const maxPort = desiredPort + 10;

    const tryListen = (port: number) => new Promise<any>((resolve, reject) => {
      const srv = app.listen(port, '0.0.0.0', () => resolve(srv));
      srv.on('error', (err: any) => reject(err));
    });

    let server: any = null;
    for (let p = desiredPort; p <= maxPort; p++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        server = await tryListen(p);
        console.log(`Server running at http://localhost:${p}`);
        break;
      } catch (err: any) {
        if (err && err.code === 'EADDRINUSE') {
          console.warn(`Port ${p} in use, trying next port`);
          continue;
        }
        console.error('Server failed to start:', err);
        process.exit(1);
      }
    }

    if (!server) {
      console.error(`Unable to bind server to ports ${desiredPort}-${maxPort}`);
      process.exit(1);
    }

}


startServer();
