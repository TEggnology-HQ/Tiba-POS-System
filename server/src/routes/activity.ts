import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const result = await query(
      `SELECT al.*, u.username 
       FROM activity_log al 
       LEFT JOIN users u ON al.user_id = u.id 
       ORDER BY al.created_at DESC 
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { user_id, action, table_name, record_id, details } = req.body;
    const result = await query(
      'INSERT INTO activity_log (user_id, action, table_name, record_id, details) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, action, table_name, record_id, JSON.stringify(details)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

export default router;
