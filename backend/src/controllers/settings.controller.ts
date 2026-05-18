import { Response } from 'express';
import pool from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

/**
 * Fetch Office Geofencing configuration
 */
export const getOfficeConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await pool.query('SELECT latitude, longitude, radius_meters, late_threshold_minutes FROM office_settings LIMIT 1');
    
    if (result.rows.length === 0) {
      // Default configurations matching seed
      res.status(200).json({
        latitude: 12.9715987,
        longitude: 77.5945627,
        radius_meters: 200.00,
        late_threshold_minutes: 15
      });
      return;
    }

    const config = result.rows[0];
    res.status(200).json({
      latitude: parseFloat(config.latitude),
      longitude: parseFloat(config.longitude),
      radius_meters: parseFloat(config.radius_meters),
      late_threshold_minutes: parseInt(config.late_threshold_minutes)
    });
  } catch (error) {
    console.error('❌ getOfficeConfig controller error:', error);
    res.status(500).json({ error: 'Internal server error occurred fetching office geofencing configs.' });
  }
};

/**
 * Update Office Geofencing configuration (Admin only)
 */
export const updateOfficeConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  const { latitude, longitude, radius_meters, late_threshold_minutes } = req.body;

  if (latitude === undefined || longitude === undefined || radius_meters === undefined || late_threshold_minutes === undefined) {
    res.status(400).json({ error: 'All geofencing configurations are required' });
    return;
  }

  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  const radNum = parseFloat(radius_meters);
  const thresholdNum = parseInt(late_threshold_minutes);

  if (isNaN(latNum) || isNaN(lngNum) || isNaN(radNum) || isNaN(thresholdNum)) {
    res.status(400).json({ error: 'Invalid config values provided' });
    return;
  }

  try {
    // Check if configuration already exists
    const checkExist = await pool.query('SELECT id FROM office_settings LIMIT 1');

    if (checkExist.rows.length === 0) {
      // Insert new settings row
      await pool.query(
        `INSERT INTO office_settings (latitude, longitude, radius_meters, late_threshold_minutes)
         VALUES ($1, $2, $3, $4)`,
        [latNum, lngNum, radNum, thresholdNum]
      );
    } else {
      // Update existing settings row
      await pool.query(
        `UPDATE office_settings 
         SET latitude = $1, longitude = $2, radius_meters = $3, late_threshold_minutes = $4, updated_at = CURRENT_TIMESTAMP`,
        [latNum, lngNum, radNum, thresholdNum]
      );
    }

    res.status(200).json({
      message: 'Office geofencing configurations successfully updated',
      config: {
        latitude: latNum,
        longitude: lngNum,
        radius_meters: radNum,
        late_threshold_minutes: thresholdNum
      }
    });
  } catch (error) {
    console.error('❌ updateOfficeConfig controller error:', error);
    res.status(500).json({ error: 'Internal server error occurred saving office configs.' });
  }
};

