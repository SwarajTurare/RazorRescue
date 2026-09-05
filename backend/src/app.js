import express from 'express';
import cors from 'cors';
import { router } from './routes/api.js';
import { env } from './config/env.js';
import './database/db.js';

export const app = express();

const allowedOrigin = env.corsOrigin || '*';
app.use(cors({ origin: allowedOrigin, credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.get('/', (req, res) => res.json({ service: 'RazorRescue API', status: 'ok', docs: '/api' }));
app.use('/api', router);
app.use((req, res) => res.status(404).json({ message: 'Route not found', path: req.path }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err?.message || 'Internal server error' });
});
