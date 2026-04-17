import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT pt.*, ps.name as status,
              COALESCE((
                SELECT COUNT(*) 
                FROM storage s 
                WHERE s.product_type_id = pt.id 
                  AND s.state_id = (SELECT id FROM storage_state WHERE name = 'onsale')
              ), 0) as storage_count
       FROM product_types pt 
       JOIN product_status ps ON pt.status_id = ps.id 
       WHERE ps.name != 'offsale'
       ORDER BY pt.name`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT pt.*, ps.name as status 
       FROM product_types pt 
       JOIN product_status ps ON pt.status_id = ps.id 
       WHERE pt.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, price, barcode, status = 'listed' } = req.body;
    const result = await query(
      `INSERT INTO product_types (name, price, barcode, status_id) 
       VALUES ($1, $2, $3, (SELECT id FROM product_status WHERE name = $4)) 
       RETURNING *`,
      [name, price, barcode, status]
    );
    res.status(201).json(result.rows[0]);

    await logActivity(req.user?.id || null, 'created product', 'product_types', result.rows[0].id, { name, price: Number(price) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, price, barcode, status } = req.body;
    const result = await query(
      `UPDATE product_types 
       SET name = $1, price = $2, barcode = $3, status_id = (SELECT id FROM product_status WHERE name = $4), updated_at = now() 
       WHERE id = $5 
       RETURNING *`,
      [name, price, barcode, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);

    await logActivity(req.user?.id || null, 'updated product', 'product_types', Number(req.params.id), { name, price: Number(price), status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const productResult = await query('SELECT name FROM product_types WHERE id = $1', [req.params.id]);
    const productName = productResult.rows[0]?.name;
    
    await query('DELETE FROM product_types WHERE id = $1', [req.params.id]);
    res.status(204).send();

    await logActivity(req.user?.id || null, 'deleted product', 'product_types', Number(req.params.id), { name: productName });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;