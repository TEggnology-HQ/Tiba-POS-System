import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/index.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.role_id, u.status, u.created_at, ur.name as role_name
       FROM users u
       JOIN user_roles ur ON u.role_id = ur.id
       ORDER BY u.id`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { username, password, role_id } = req.body;
    const currentUser = req.user;
    
    const roleResult = await query('SELECT name FROM user_roles WHERE id = $1', [role_id]);
    const roleName = roleResult.rows[0]?.name;
    
    if (currentUser?.role === 'admin') {
      if (roleName !== 'cashier') {
        return res.status(403).json({ error: 'Admins can only create cashier accounts' });
      }
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await query(
      'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id, username, role_id, status, created_at',
      [username, hashedPassword, role_id]
    );
    
    const user = result.rows[0];
    res.status(201).json({
      ...user,
      role_name: roleName
    });

    await logActivity(req.user?.id || null, 'created user', 'users', user.id, { username, role_id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { username, password, role_id, status } = req.body;
    const currentUser = req.user;
    const targetUserId = Number(id);
    
    const targetUserResult = await query('SELECT role_id, name FROM users u JOIN user_roles ur ON u.role_id = ur.id WHERE u.id = $1', [targetUserId]);
    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetRoleName = targetUserResult.rows[0].name;
    
    if (currentUser?.role === 'admin' && Number(currentUser?.id) === targetUserId) {
      if (username !== undefined || role_id !== undefined || status !== undefined) {
        return res.status(403).json({ error: 'You can only change your own password' });
      }
    } else if (currentUser?.role === 'admin') {
      if (targetRoleName === 'owner' || targetRoleName === 'admin') {
        return res.status(403).json({ error: 'Admins cannot edit owners or other admins' });
      }
      if (username !== undefined || status !== undefined) {
        return res.status(403).json({ error: 'Admins can only change password and role for cashiers' });
      }
      if (role_id !== undefined) {
        const newRoleResult = await query('SELECT name FROM user_roles WHERE id = $1', [role_id]);
        const newRoleName = newRoleResult.rows[0]?.name;
        if (newRoleName !== 'cashier') {
          return res.status(403).json({ error: 'Admins can only assign cashier role' });
        }
      }
    }
    
    if (currentUser?.role === 'owner' && Number(currentUser?.id) === targetUserId) {
      if (role_id !== undefined || status !== undefined) {
        return res.status(403).json({ error: 'You cannot change your own role or status' });
      }
    }
    
    let updates = [];
    let values = [];
    let paramIndex = 1;
    
    if (username) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }
    
    if (role_id) {
      updates.push(`role_id = $${paramIndex++}`);
      values.push(role_id);
    }
    
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = now()`);
    
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, role_id, status, created_at`,
      [...values, targetUserId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    const roleResult = await query('SELECT name FROM user_roles WHERE id = $1', [user.role_id]);
    res.json({
      ...user,
      role_name: roleResult.rows[0]?.name
    });

    const updatedFields: string[] = [];
    if (username) updatedFields.push('username');
    if (password) updatedFields.push('password');
    if (role_id) updatedFields.push('role_id');
    if (status) updatedFields.push('status');
    await logActivity(req.user?.id || null, 'updated user', 'users', user.id, { updated_fields: updatedFields });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const targetUserId = Number(id);
    
    if (currentUser?.id === targetUserId) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }
    
    const targetUserResult = await query('SELECT name FROM users u JOIN user_roles ur ON u.role_id = ur.id WHERE u.id = $1', [targetUserId]);
    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetRoleName = targetUserResult.rows[0].name;
    
    if (currentUser?.role === 'admin') {
      if (targetRoleName === 'owner' || targetRoleName === 'admin') {
        return res.status(403).json({ error: 'Admins cannot delete owners or other admins' });
      }
    }
    
    if (targetRoleName === 'owner' && currentUser?.role === 'owner') {
      const ownerCount = await query("SELECT COUNT(*) as count FROM users u JOIN user_roles ur ON u.role_id = ur.id WHERE ur.name = 'owner' AND u.status = 'active'");
      if (Number(ownerCount.rows[0].count) <= 1) {
        return res.status(403).json({ error: 'Cannot delete the last owner' });
      }
    }
    
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id, username', [targetUserId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });

    await logActivity(req.user?.id || null, 'deleted user', 'users', targetUserId, { username: result.rows[0].username });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;