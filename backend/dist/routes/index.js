"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_js_1 = __importDefault(require("./auth.routes.js"));
const attendance_routes_js_1 = __importDefault(require("./attendance.routes.js"));
const settings_routes_js_1 = __importDefault(require("./settings.routes.js"));
const admin_routes_js_1 = __importDefault(require("./admin.routes.js"));
const router = (0, express_1.Router)();
// Hook up sub-routes
router.use('/auth', auth_routes_js_1.default);
router.use('/attendance', attendance_routes_js_1.default);
router.use('/settings', settings_routes_js_1.default);
router.use('/admin', admin_routes_js_1.default);
exports.default = router;
