import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM payments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.get('/transaction/:transactionId', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM payments WHERE transaction_id = $1 ORDER BY created_at',
      [req.params.transactionId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { transaction_id, cashier_id, amount, payment_method, payment_type = 'payment' } = req.body;
    const result = await query(
      'INSERT INTO payments (transaction_id, cashier_id, amount, payment_method, payment_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [transaction_id, cashier_id, amount, payment_method, payment_type]
    );
    res.status(201).json(result.rows[0]);

    await logActivity(req.user?.id || null, 'added payment', 'payments', result.rows[0].payment_id, { transaction_id, amount: Number(amount), payment_method, payment_type });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;
