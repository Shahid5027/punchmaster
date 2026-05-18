import bcrypt from 'bcryptjs';
import pool from './config/database.js';

const seedDatabase = async () => {
  console.log('🌱 Starting high-fidelity workforce analytics database seeding...');

  try {
    // 1. Create tables inside a transaction
    await pool.query('BEGIN');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
        department VARCHAR(100) NOT NULL DEFAULT 'Engineering',
        shift_start_time TIME NOT NULL DEFAULT '09:00:00',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create email lookup index
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');

    // Create office_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS office_settings (
        id SERIAL PRIMARY KEY,
        latitude NUMERIC(10, 8) NOT NULL,
        longitude NUMERIC(11, 8) NOT NULL,
        radius_meters NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
        late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create attendance table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
        check_in_lat NUMERIC(10, 8) NOT NULL,
        check_in_lng NUMERIC(11, 8) NOT NULL,
        check_out_time TIMESTAMP WITH TIME ZONE,
        check_out_lat NUMERIC(10, 8),
        check_out_lng NUMERIC(11, 8),
        working_hours NUMERIC(4, 2),
        is_late BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(20) NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'LATE', 'WFH', 'ABSENT', 'EXCUSED')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_daily_attendance UNIQUE (user_id, date)
      );
    `);

    // Create attendance_logs audit table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('CHECK_IN_SUCCESS', 'CHECK_IN_FAIL', 'CHECK_OUT_SUCCESS', 'CHECK_OUT_FAIL')),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        lat NUMERIC(10, 8) NOT NULL,
        lng NUMERIC(11, 8) NOT NULL,
        distance_from_office NUMERIC(8, 2) NOT NULL,
        accepted BOOLEAN NOT NULL,
        reason TEXT NOT NULL
      );
    `);

    // Create indexing on audit logs
    await pool.query('CREATE INDEX IF NOT EXISTS idx_logs_user_timestamp ON attendance_logs(user_id, timestamp DESC);');

    // Create attendance_insights analysis table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
        confidence_status VARCHAR(100) NOT NULL,
        failed_checkin_count INTEGER NOT NULL DEFAULT 0,
        unusual_location_detected BOOLEAN NOT NULL DEFAULT FALSE,
        unusual_time_detected BOOLEAN NOT NULL DEFAULT FALSE,
        details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index on insights
    await pool.query('CREATE INDEX IF NOT EXISTS idx_insights_user ON attendance_insights(user_id);');

    // Clean out existing seeded data so we get a completely fresh, high-fidelity experience
    await pool.query('TRUNCATE office_settings, attendance_insights, attendance_logs, attendance, users CASCADE;');

    // 2. Seed Default Office Settings (AMCEC / Central HQ Bangalore)
    console.log('📌 Seeding office settings (Bangalore HQ)...');
    await pool.query(`
      INSERT INTO office_settings (latitude, longitude, radius_meters, late_threshold_minutes)
      VALUES (12.9715987, 77.5945627, 200.00, 15)
    `);

    // 3. Hash passwords and seed diverse employee list
    const adminHash = await bcrypt.hash('admin123', 10);
    const employeeHash = await bcrypt.hash('employee123', 10);

    const employees = [
      { name: 'Alex Mercer', email: 'employee1@geoshield.ai', shift: '09:00:00' },
      { name: 'Sarah Connor', email: 'employee2@geoshield.ai', shift: '08:30:00' },
      { name: 'Marcus Wright', email: 'employee3@geoshield.ai', shift: '09:00:00' },
      { name: 'David Lightman', email: 'employee4@geoshield.ai', shift: '09:00:00' },
      { name: 'John Connor', email: 'employee5@geoshield.ai', shift: '08:30:00' },
      { name: 'Ellen Ripley', email: 'employee6@geoshield.ai', shift: '09:00:00' },
    ];

    // Seed admin
    const adminRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, shift_start_time)
       VALUES ($1, $2, $3, 'admin', '09:00:00') RETURNING id`,
      ['System Admin', 'admin@geoshield.ai', adminHash]
    );
    console.log('👤 Seeded Admin: admin@geoshield.ai');

    // Seed employees and map their IDs
    const empIds: { [email: string]: string } = {};
    for (const emp of employees) {
      const res = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, shift_start_time)
         VALUES ($1, $2, $3, 'employee', $4) RETURNING id`,
        [emp.name, emp.email, employeeHash, emp.shift]
      );
      empIds[emp.email] = res.rows[0].id;
      console.log(`👤 Seeded Employee: ${emp.name} (${emp.email})`);
    }

    // 4. Generate dynamic business days (weekdays) relative to current local time
    const datesToSeed: string[] = [];
    const today = new Date();
    
    // Compile last 12 weekdays leading up to yesterday
    for (let i = 1; i <= 15; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // skip weekends
        datesToSeed.push(d.toISOString().split('T')[0]);
      }
      if (datesToSeed.length >= 10) break; // keep historical range to 10 solid days
    }
    datesToSeed.reverse(); // seed chronologically

    const todayStr = today.toISOString().split('T')[0];
    console.log(`📅 Dynamically seeding historical range: [${datesToSeed.join(', ')}]`);
    console.log(`📅 Dynamically seeding today: ${todayStr}`);

    // HQ coordinates: 12.9715987, 77.5945627
    const hqLat = 12.9715987;
    const hqLng = 77.5945627;

    // Helper to generate a small, successful coordinate offset (in-zone)
    const getInZoneCoords = () => {
      const offsetLat = (Math.random() - 0.5) * 0.0005; // very close
      const offsetLng = (Math.random() - 0.5) * 0.0005;
      return { lat: hqLat + offsetLat, lng: hqLng + offsetLng };
    };

    // 5. Seed historical dates
    for (const date of datesToSeed) {
      // Alex Mercer (Perfect attendance, on-time)
      {
        const userId = empIds['employee1@geoshield.ai'];
        const checkInTime = `${date}T08:52:${Math.floor(10 + Math.random() * 40)}Z`;
        const checkOutTime = `${date}T17:05:00Z`;
        const coords = getInZoneCoords();
        const att = await pool.query(
          `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, check_out_time, check_out_lat, check_out_lng, working_hours, is_late, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 8.2, false, 'PRESENT') RETURNING id`,
          [userId, date, checkInTime, coords.lat, coords.lng, checkOutTime, coords.lat, coords.lng]
        );
        const attId = att.rows[0].id;
        await pool.query(
          `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
           VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, 1.4, true, 'Location verified in-zone')`,
          [userId, checkInTime, coords.lat, coords.lng]
        );
        await pool.query(
          `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, details)
           VALUES ($1, $2, 98, 'Normal', 0, 'On-time verification inside corporate geofence')`,
          [attId, userId]
        );
      }

      // Sarah Connor (Custom shift 08:30, occasionally late)
      {
        const userId = empIds['employee2@geoshield.ai'];
        const isLate = Math.random() > 0.7;
        const hour = isLate ? '08:52' : '08:24';
        const checkInTime = `${date}T${hour}:${Math.floor(10 + Math.random() * 40)}Z`;
        const checkOutTime = `${date}T17:15:00Z`;
        const coords = getInZoneCoords();
        const att = await pool.query(
          `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, check_out_time, check_out_lat, check_out_lng, working_hours, is_late, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 8.5, $9, $10) RETURNING id`,
          [userId, date, checkInTime, coords.lat, coords.lng, checkOutTime, coords.lat, coords.lng, isLate, isLate ? 'LATE' : 'PRESENT']
        );
        const attId = att.rows[0].id;
        await pool.query(
          `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
           VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, 1.8, true, 'Location verified in-zone')`,
          [userId, checkInTime, coords.lat, coords.lng]
        );
        await pool.query(
          `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, details)
           VALUES ($1, $2, 96, 'Normal', 0, $3)`,
          [attId, userId, isLate ? 'Slightly late arrival, geofence normal' : 'On-time shift start']
        );
      }

      // Marcus Wright (Checked in but with coordinate drift / location mismatches)
      {
        const userId = empIds['employee3@geoshield.ai'];
        // Seed 40% of his logs with low confidence location drifts
        const hasDrift = Math.random() > 0.6;
        const checkInTime = `${date}T08:58:${Math.floor(10 + Math.random() * 40)}Z`;
        const checkOutTime = `${date}T17:02:00Z`;
        
        // Coords: close standard check-in vs drifted (~135m away)
        const lat = hasDrift ? hqLat + 0.00115 : hqLat + 0.0001;
        const lng = hasDrift ? hqLng + 0.00095 : hqLng + 0.0001;
        const dist = hasDrift ? 134.5 : 1.5;
        const score = hasDrift ? 52 : 95;
        const status = hasDrift ? 'Unusual location' : 'Normal';
        const details = hasDrift 
          ? `Check-in coordinates drifted ${dist}m from office centroid.`
          : 'Standard verified corporate HQ validation';

        const att = await pool.query(
          `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, check_out_time, check_out_lat, check_out_lng, working_hours, is_late, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 8.0, false, 'PRESENT') RETURNING id`,
          [userId, date, checkInTime, lat, lng, checkOutTime, lat, lng]
        );
        const attId = att.rows[0].id;
        await pool.query(
          `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
           VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, $5, true, 'Location within geofence outer ring')`,
          [userId, checkInTime, lat, lng, dist]
        );
        await pool.query(
          `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, unusual_location_detected, details)
           VALUES ($1, $2, $3, $4, 0, $5, $6)`,
          [attId, userId, score, status, hasDrift, details]
        );
      }

      // David Lightman (Pre-filled standard history, but has 2 out-of-zone attempts in logs on one day)
      {
        const userId = empIds['employee4@geoshield.ai'];
        const checkInTime = `${date}T08:54:12Z`;
        const checkOutTime = `${date}T17:00:00Z`;
        const coords = getInZoneCoords();
        const att = await pool.query(
          `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, check_out_time, check_out_lat, check_out_lng, working_hours, is_late, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 8.1, false, 'PRESENT') RETURNING id`,
          [userId, date, checkInTime, coords.lat, coords.lng, checkOutTime, coords.lat, coords.lng]
        );
        const attId = att.rows[0].id;
        await pool.query(
          `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
           VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, 1.2, true, 'Verified corporate HQ geofence')`,
          [userId, checkInTime, coords.lat, coords.lng]
        );
        await pool.query(
          `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, details)
           VALUES ($1, $2, 97, 'Normal', 0, 'On-time verification')`,
          [attId, userId]
        );

        // Seed 1 historical out-of-zone attempt for David on an older date to show up in logs
        if (date === datesToSeed[2]) {
          await pool.query(
            `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
             VALUES ($1, 'CHECK_IN_FAIL', $2, 12.985200, 77.604200, 1540.0, false, 'Check-in blocked: Coordinates out-of-zone')`,
            [userId, `${date}T08:42:15Z`]
          );
        }
      }

      // John Connor (Tardiness pattern, frequently late)
      {
        const userId = empIds['employee5@geoshield.ai'];
        // High late arrival rate
        const isLate = Math.random() > 0.3;
        const checkInTime = `${date}T${isLate ? '09:12' : '08:26'}:${Math.floor(10 + Math.random() * 40)}Z`;
        const checkOutTime = `${date}T17:15:00Z`;
        const coords = getInZoneCoords();
        const att = await pool.query(
          `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, check_out_time, check_out_lat, check_out_lng, working_hours, is_late, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 7.8, $9, $10) RETURNING id`,
          [userId, date, checkInTime, coords.lat, coords.lng, checkOutTime, coords.lat, coords.lng, isLate, isLate ? 'LATE' : 'PRESENT']
        );
        const attId = att.rows[0].id;
        await pool.query(
          `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
           VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, 1.3, true, 'Verified corporate HQ geofence')`,
          [userId, checkInTime, coords.lat, coords.lng]
        );
        await pool.query(
          `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, details)
           VALUES ($1, $2, 97, 'Normal', 0, $3)`,
          [attId, userId, isLate ? 'Late arrival recorded' : 'Normal']
        );
      }

      // Ellen Ripley (Perfect check-in records)
      {
        const userId = empIds['employee6@geoshield.ai'];
        const checkInTime = `${date}T08:48:${Math.floor(10 + Math.random() * 40)}Z`;
        const checkOutTime = `${date}T17:00:00Z`;
        const coords = getInZoneCoords();
        const att = await pool.query(
          `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, check_out_time, check_out_lat, check_out_lng, working_hours, is_late, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 8.2, false, 'PRESENT') RETURNING id`,
          [userId, date, checkInTime, coords.lat, coords.lng, checkOutTime, coords.lat, coords.lng]
        );
        const attId = att.rows[0].id;
        await pool.query(
          `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
           VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, 0.9, true, 'Verified corporate HQ geofence')`,
          [userId, checkInTime, coords.lat, coords.lng]
        );
        await pool.query(
          `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, details)
           VALUES ($1, $2, 99, 'Normal', 0, 'Exemplary on-time record')`,
          [attId, userId]
        );
      }
    }

    // 6. Seed TODAY specifically to make it look alive!
    console.log('📌 Seeding today\'s active roster records...');
    
    // Alex Mercer: Successful check-in today
    {
      const userId = empIds['employee1@geoshield.ai'];
      const checkInTime = `${todayStr}T08:52:14Z`;
      const coords = getInZoneCoords();
      const att = await pool.query(
        `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, status)
         VALUES ($1, $2, $3, $4, $5, 'PRESENT') RETURNING id`,
        [userId, todayStr, checkInTime, coords.lat, coords.lng]
      );
      const attId = att.rows[0].id;
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, 1.2, true, 'Verified corporate HQ geofence')`,
        [userId, checkInTime, coords.lat, coords.lng]
      );
      await pool.query(
        `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, details)
         VALUES ($1, $2, 98, 'Normal', 0, 'On-time dynamic check-in')`,
        [attId, userId]
      );
      console.log('✓ Today: Alex Mercer checked in successfully.');
    }

    // Ellen Ripley: Successful check-in today
    {
      const userId = empIds['employee6@geoshield.ai'];
      const checkInTime = `${todayStr}T08:46:11Z`;
      const coords = getInZoneCoords();
      const att = await pool.query(
        `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, status)
         VALUES ($1, $2, $3, $4, $5, 'PRESENT') RETURNING id`,
        [userId, todayStr, checkInTime, coords.lat, coords.lng]
      );
      const attId = att.rows[0].id;
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, 1.1, true, 'Verified corporate HQ geofence')`,
        [userId, checkInTime, coords.lat, coords.lng]
      );
      await pool.query(
        `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, details)
         VALUES ($1, $2, 99, 'Normal', 0, 'Perfect dynamic check-in')`,
        [attId, userId]
      );
      console.log('✓ Today: Ellen Ripley checked in successfully.');
    }

    // Marcus Wright: Checked in today but has COORDINATE DRIFT (Location mismatch)
    {
      const userId = empIds['employee3@geoshield.ai'];
      const checkInTime = `${todayStr}T08:58:12Z`;
      // Coordinates drifted ~185m away
      const lat = hqLat + 0.0016;
      const lng = hqLng + 0.0012;
      const dist = 184.2;
      
      const att = await pool.query(
        `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, status)
         VALUES ($1, $2, $3, $4, $5, 'PRESENT') RETURNING id`,
        [userId, todayStr, checkInTime, lat, lng]
      );
      const attId = att.rows[0].id;
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, $5, true, 'Verified check-in inside outer ring')`,
        [userId, checkInTime, lat, lng, dist]
      );
      await pool.query(
        `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, unusual_location_detected, details)
         VALUES ($1, $2, 45, 'Unusual location', 0, true, 'Check-in coordinates drifted 184.2m from Bangalore office boundary.')`,
        [attId, userId]
      );
      console.log('✓ Today: Marcus Wright checked in with coordinate drift.');
    }

    // John Connor: Checked in late today
    {
      const userId = empIds['employee5@geoshield.ai'];
      const checkInTime = `${todayStr}T09:12:00Z`; // Shift start 08:30, late threshold 15m
      const coords = getInZoneCoords();
      const att = await pool.query(
        `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, is_late, status)
         VALUES ($1, $2, $3, $4, $5, true, 'LATE') RETURNING id`,
        [userId, todayStr, checkInTime, coords.lat, coords.lng]
      );
      const attId = att.rows[0].id;
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, 1.5, true, 'Location verified in-zone')`,
        [userId, checkInTime, coords.lat, coords.lng]
      );
      await pool.query(
        `INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, details)
         VALUES ($1, $2, 95, 'Normal', 0, 'Late check-in dynamically recorded')`,
        [attId, userId]
      );
      console.log('✓ Today: John Connor checked in (Late).');
    }

    // David Lightman: 2 Repeated Out-of-Zone Attempts today (absent on active roster)
    {
      const userId = empIds['employee4@geoshield.ai'];
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, timestamp, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_IN_FAIL', $2, 12.981000, 77.602500, 1350.0, false, 'Check-in blocked: Coordinates out-of-zone'),
                ($1, 'CHECK_IN_FAIL', $3, 12.980500, 77.602200, 1290.0, false, 'Check-in blocked: Coordinates out-of-zone')`,
        [userId, `${todayStr}T08:45:12Z`, `${todayStr}T08:55:40Z`]
      );
      console.log('✓ Today: David Lightman generated out-of-zone attempts (Absent).');
    }

    // Sarah Connor is not checked in yet today (Absent). This represents PENDING check-in beautifully!

    await pool.query('COMMIT');
    console.log('✅ Workforce Analytics database seeding completed successfully!');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error during database seeding transaction:', error);
  } finally {
    // Graceful release of client
    await pool.end();
  }
};

// Execute if run directly from command line
seedDatabase().catch((err) => {
  console.error('❌ Seeding process crashed:', err);
  process.exit(1);
});
