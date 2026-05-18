"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_js_1 = require("../controllers/settings.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const router = (0, express_1.Router)();
// Secure geofence parameters retrieval under JWT validation middleware
router.get('/office', auth_middleware_js_1.authenticateJWT, settings_controller_js_1.getOfficeConfig);
// Update geofence parameters under strict Admin role check
router.put('/office', auth_middleware_js_1.authenticateJWT, (0, auth_middleware_js_1.authorizeRoles)('admin'), settings_controller_js_1.updateOfficeConfig);
exports.default = router;
