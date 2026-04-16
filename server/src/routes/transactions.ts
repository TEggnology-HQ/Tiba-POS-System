import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status, type, date_from, date_to, amount_min, amount_max, ids } = req.query;
    
    let sql = `SELECT t.*, tt.name as type, ts.name as status
               FROM transactions t
               JOIN transaction_type tt ON t.type = tt.id
               JOIN transaction_status ts ON t.status = ts.id
               WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND ts.name = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (type) {
      sql += ` AND tt.name = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    if (date_from) {
      sql += ` AND t.created_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    if (date_to) {
      sql += ` AND t.created_at <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    if (amount_min) {
      sql += ` AND t.total_amount >= $${paramIndex}`;
      params.push(amount_min);
      paramIndex++;
    }
    if (amount_max) {
      sql += ` AND t.total_amount <= $${paramIndex}`;
      params.push(amount_max);
      paramIndex++;
    }
    if (ids) {
      const idList = (ids as string).split(',').map(Number);
      sql += ` AND t.id = ANY($${paramIndex})`;
      params.push(idList);
    }

    sql += ' ORDER BY t.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/filter-options', async (req, res) => {
  try {
    const statusResult = await query('SELECT name FROM transaction_status ORDER BY name');
    const typeResult = await query('SELECT name FROM transaction_type ORDER BY name');
    res.json({
      statuses: statusResult.rows.map(r => r.name),
      types: typeResult.rows.map(r => r.name)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const transactionResult = await query(
      `SELECT t.*, tt.name as type, ts.name as status
       FROM transactions t
       JOIN transaction_type tt ON t.type = tt.id
       JOIN transaction_status ts ON t.status = ts.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const itemsResult = await query(
      'SELECT * FROM transaction_items WHERE transaction_id = $1',
      [req.params.id]
    );
    
    res.json({
      ...transactionResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { cashier_id, total_amount, type, items, customer, paid_amount } = req.body;
    
    const paid = parseFloat(paid_amount) || 0;
    const total = parseFloat(total_amount);
    
    let status = 'pending';
    if (type === 'immediate' && paid >= total) {
      status = 'completed';
    }
    
    const transactionResult = await query(
      `INSERT INTO transactions (cashier_id, total_amount, paid_amount, type, status) 
       VALUES ($1, $2, $3, (SELECT id FROM transaction_type WHERE name = $4), (SELECT id FROM transaction_status WHERE name = $5)) 
       RETURNING *`,
      [cashier_id, total, paid, type, status]
    );
    
    const transactionId = transactionResult.rows[0].id;
    
    for (const item of items) {
      await query(
        'INSERT INTO transaction_items (transaction_id, product_type_id, product_name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
        [transactionId, item.product_type_id, item.product_name, item.quantity, item.unit_price]
      );
      
      let remainingQty = item.quantity;
      while (remainingQty > 0) {
        const storageResult = await query(
          `SELECT id FROM storage 
           WHERE product_type_id = $1 AND state_id = (SELECT id FROM storage_state WHERE name = 'onsale')
           LIMIT 1`,
          [item.product_type_id]
        );
        if (storageResult.rows.length === 0) break;
        await query(
          'UPDATE storage SET state_id = (SELECT id FROM storage_state WHERE name = $1) WHERE id = $2',
          ['sold', storageResult.rows[0].id]
        );
        remainingQty--;
      }
    }
    
    if (type === 'deferred' && customer) {
      await query(
        'INSERT INTO deferred (transaction_id, customer_name, customer_phone, customer_email, customer_address) VALUES ($1, $2, $3, $4, $5)',
        [transactionId, customer.name, customer.phone, customer.email, customer.address]
      );
    }
    
    res.status(201).json(transactionResult.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await query(
      `UPDATE transactions 
       SET status = (SELECT id FROM transaction_status WHERE name = $1), updated_at = now() 
       WHERE id = $2 
       RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
});

router.get('/:id/items', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM transaction_items WHERE transaction_id = $1',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction items' });
  }
});

router.get('/deferred/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM deferred WHERE transaction_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deferred details not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deferred details' });
  }
});

router.get('/deferred/search', async (req, res) => {
  try {
    const { field, value } = req.query;
    if (!field || !value) {
      return res.status(400).json({ error: 'Field and value are required' });
    }
    const allowedFields = ['customer_name', 'customer_phone', 'customer_email', 'customer_address'];
    if (!allowedFields.includes(field as string)) {
      return res.status(400).json({ error: 'Invalid field' });
    }
    const result = await query(
      `SELECT d.transaction_id FROM deferred d 
       WHERE d.${field} ILIKE $1`,
      [`%${value}%`]
    );
    res.json(result.rows.map(r => r.transaction_id));
  } catch (error) {
    res.status(500).json({ error: 'Failed to search deferred transactions' });
  }
});

export default router;