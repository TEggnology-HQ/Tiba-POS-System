import { Router } from 'express';
import { query } from '../db/index.js';

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

router.post('/', async (req, res) => {
  try {
    const { transaction_id, cashier_id, amount, payment_method, payment_type = 'payment' } = req.body;
    const result = await query(
      'INSERT INTO payments (transaction_id, cashier_id, amount, payment_method, payment_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [transaction_id, cashier_id, amount, payment_method, payment_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;
