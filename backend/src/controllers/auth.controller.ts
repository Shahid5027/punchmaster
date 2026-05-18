import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'geoshield_jwt_ultra_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  // 1. Basic validation
  if (!email || !password) {
    res.status(400).json({ error: 'Please provide email and password' });
    return;
  }

  try {
    // 2. Retrieve user from db
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(userQuery, [email.toLowerCase().trim()]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // 4. Sign JWT
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shift_start_time: user.shift_start_time,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    // 5. Respond with token & sanitized user details
    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shift_start_time: user.shift_start_time,
      },
    });
  } catch (error) {
    console.error('❌ Login controller error:', error);
    res.status(500).json({ error: 'Internal server error occurred during login' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const userQuery = 'SELECT id, name, email, role, shift_start_time FROM users WHERE id = $1';
    const result = await pool.query(userQuery, [req.user.id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('❌ getMe controller error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
