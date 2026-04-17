import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.product_type_id, pt.name as product_name, pt.price, s.entry_date, s.expire_date, ss.name as state
       FROM storage s 
       JOIN product_types pt ON s.product_type_id = pt.id
       JOIN storage_state ss ON s.state_id = ss.id
       ORDER BY s.entry_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch storage' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { product_type_id, entry_date, expire_date } = req.body;
    const result = await query(
      'INSERT INTO storage (product_type_id, entry_date, expire_date, state_id) VALUES ($1, $2, $3, (SELECT id FROM storage_state WHERE name = $4)) RETURNING *',
      [product_type_id, entry_date, expire_date, 'onsale']
    );
    res.status(201).json(result.rows[0]);

    const productResult = await query('SELECT name FROM product_types WHERE id = $1', [product_type_id]);
    await logActivity(req.user?.id || null, 'added storage', 'storage', result.rows[0].id, { product_type_id, product_name: productResult.rows[0]?.name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add storage item' });
  }
});

router.patch('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { state } = req.body;
    const oldResult = await query('SELECT state_id FROM storage WHERE id = $1', [req.params.id]);
    const oldStateId = oldResult.rows[0]?.state_id;
    const oldStateResult = await query('SELECT name FROM storage_state WHERE id = $1', [oldStateId]);
    const oldState = oldStateResult.rows[0]?.name;

    const result = await query(
      'UPDATE storage SET state_id = (SELECT id FROM storage_state WHERE name = $1) WHERE id = $2 RETURNING *',
      [state, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
    res.json(result.rows[0]);

    await logActivity(req.user?.id || null, 'updated storage state', 'storage', Number(req.params.id), { old_state: oldState, new_state: state });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update storage item' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const storageResult = await query('SELECT product_type_id FROM storage WHERE id = $1', [req.params.id]);
    const productTypeId = storageResult.rows[0]?.product_type_id;
    const productResult = await query('SELECT name FROM product_types WHERE id = $1', [productTypeId]);
    const productName = productResult.rows[0]?.name;

    await query('DELETE FROM storage WHERE id = $1', [req.params.id]);
    res.status(204).send();

    await logActivity(req.user?.id || null, 'deleted storage', 'storage', Number(req.params.id), { product_type_id: productTypeId, product_name: productName });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete storage item' });
  }
});

export default router;