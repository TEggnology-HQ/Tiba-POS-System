import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const { user_id, username, action, date_from, date_to } = req.query;
    
    let sql = `SELECT al.*, u.username 
       FROM activity_log al 
       LEFT JOIN users u ON al.user_id = u.id 
       WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (user_id) {
      sql += ` AND al.user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    if (username) {
      sql += ` AND u.username ILIKE $${paramIndex++}`;
      params.push(`%${username}%`);
    }

    if (action) {
      sql += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }

    if (date_from) {
      sql += ` AND al.created_at >= $${paramIndex++}`;
      params.push(date_from);
    }

    if (date_to) {
      sql += ` AND al.created_at <= $${paramIndex++}`;
      params.push(date_to);
    }

    sql += ` ORDER BY al.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);
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

router.get('/actions', async (req, res) => {
  try {
    const result = await query('SELECT DISTINCT action FROM activity_log ORDER BY action');
    res.json(result.rows.map(r => r.action));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch action types' });
  }
});

export default router;
