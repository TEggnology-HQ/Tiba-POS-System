import { Router } from 'express';
import { query } from '../db/index.js';

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

router.post('/', async (req, res) => {
  try {
    const { product_type_id, entry_date, expire_date } = req.body;
    const result = await query(
      'INSERT INTO storage (product_type_id, entry_date, expire_date, state_id) VALUES ($1, $2, $3, (SELECT id FROM storage_state WHERE name = $4)) RETURNING *',
      [product_type_id, entry_date, expire_date, 'onsale']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add storage item' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { state } = req.body;
    const result = await query(
      'UPDATE storage SET state_id = (SELECT id FROM storage_state WHERE name = $1) WHERE id = $2 RETURNING *',
      [state, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update storage item' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM storage WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete storage item' });
  }
});

export default router;