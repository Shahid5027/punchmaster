"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const index_js_1 = __importDefault(require("./routes/index.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable Cross-Origin Resource Sharing (CORS) with support for customizable client origins
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Built-in JSON request parser middleware
app.use(express_1.default.json());
// Main entry point for all REST APIs
app.use('/api', index_js_1.default);
// Base Health Check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Global central error handler middleware
app.use((err, req, res, next) => {
    console.error('❌ Express server error:', err);
    res.status(500).json({ error: 'An unexpected backend error occurred.' });
});
app.listen(PORT, () => {
    console.log(`🚀 GeoShield AI Server running on port ${PORT}`);
    console.log(`👉 Health check: http://localhost:${PORT}/health`);
});
