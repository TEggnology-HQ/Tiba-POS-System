import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await query(
      `SELECT u.id, u.username, u.password_hash, u.role_id, ur.name as role
       FROM users u
       JOIN user_roles ur ON u.role_id = ur.id
       WHERE u.username = $1 AND u.status = $2`,
      [username, 'active']
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, role_id: user.role_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { username, password, role = 'cashier' } = req.body;
    
    const currentUser = req.user;
    const requestedRoleIdResult = await query('SELECT id, name FROM user_roles WHERE name = $1', [role]);
    const requestedRoleId = requestedRoleIdResult.rows[0]?.id;
    const requestedRoleName = requestedRoleIdResult.rows[0]?.name;
    
    if (!requestedRoleId) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    if (requestedRoleName === 'owner' && currentUser?.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can create owner accounts' });
    }
    
    if (currentUser?.role === 'admin' && requestedRoleName === 'owner') {
      return res.status(403).json({ error: 'Only owners can create owner accounts' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await query(
      'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id, username',
      [username, hashedPassword, requestedRoleId]
    );

    res.status(201).json({ ...result.rows[0], role });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
