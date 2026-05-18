"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_js_1 = __importDefault(require("./database.js"));
async function migrate() {
    console.log('🔄 Running employee management schema migrations...');
    try {
        // 1. Add department column to users table if not exists
        await database_js_1.default.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Engineering';
    `);
        console.log('✅ Added department column to users table.');
        // 2. Resolve existing status constraints on attendance
        const checkConstraintQuery = `
      SELECT concon.conname 
      FROM pg_constraint concon
      JOIN pg_class c ON concon.conrelid = c.oid
      WHERE c.relname = 'attendance' AND concon.contype = 'c';
    `;
        const res = await database_js_1.default.query(checkConstraintQuery);
        for (const row of res.rows) {
            if (row.conname.includes('status')) {
                console.log(`Dropping constraint: ${row.conname}`);
                await database_js_1.default.query(`ALTER TABLE attendance DROP CONSTRAINT IF EXISTS ${row.conname};`);
            }
        }
        // Add updated status check constraint supporting 'INVALID'
        await database_js_1.default.query(`
      ALTER TABLE attendance 
      ADD CONSTRAINT check_attendance_status 
      CHECK (status IN ('PRESENT', 'LATE', 'WFH', 'ABSENT', 'EXCUSED', 'INVALID'));
    `);
        console.log('✅ Updated attendance status constraints to include WFH, EXCUSED, and INVALID.');
        // 3. Resolve existing event_type constraints on attendance_logs
        const logConstraintQuery = `
      SELECT concon.conname 
      FROM pg_constraint concon
      JOIN pg_class c ON concon.conrelid = c.oid
      WHERE c.relname = 'attendance_logs' AND concon.contype = 'c';
    `;
        const resLogs = await database_js_1.default.query(logConstraintQuery);
        for (const row of resLogs.rows) {
            if (row.conname.includes('event_type')) {
                console.log(`Dropping constraint: ${row.conname}`);
                await database_js_1.default.query(`ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS ${row.conname};`);
            }
        }
        // Add updated event_type check constraint supporting 'ADMIN_INVALIDATE'
        await database_js_1.default.query(`
      ALTER TABLE attendance_logs 
      ADD CONSTRAINT check_log_event_type 
      CHECK (event_type IN ('CHECK_IN_SUCCESS', 'CHECK_IN_FAIL', 'CHECK_OUT_SUCCESS', 'CHECK_OUT_FAIL', 'ADMIN_INVALIDATE'));
    `);
        console.log('✅ Updated attendance_logs event_type constraints to include ADMIN_INVALIDATE.');
        console.log('🎉 Migrations successfully completed!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}
migrate();
