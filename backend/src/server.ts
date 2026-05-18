import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing (CORS) with support for customizable client origins
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Built-in JSON request parser middleware
app.use(express.json());

// Main entry point for all REST APIs
app.use('/api', apiRouter);

// Base Health Check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global central error handler middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Express server error:', err);
  res.status(500).json({ error: 'An unexpected backend error occurred.' });
});

app.listen(PORT, () => {
  console.log(`🚀 GeoShield AI Server running on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/health`);
});
