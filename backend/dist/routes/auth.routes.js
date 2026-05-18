"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const router = (0, express_1.Router)();
// Public routes
router.post('/login', auth_controller_js_1.login);
// Protected routes
router.get('/me', auth_middleware_js_1.authenticateJWT, auth_controller_js_1.getMe);
exports.default = router;
