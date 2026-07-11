import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import paymentRoutes from './routes/payments.js';
import activityRoutes from './routes/activity.js';
import storageRoutes from './routes/storage.js';
import userRoutes from './routes/users.js';
import { query } from './db/index.js';
import bcrypt from 'bcrypt';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/users', userRoutes);

app.get('/api/roles', async (req, res) => {
  try {
    const result = await query('SELECT id, name FROM user_roles ORDER BY id');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function bootstrapOwner() {
  try {
    const userCount = await query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('No users found. Bootstrapping initial owner...');
      const username = process.env.INITIAL_OWNER_USERNAME || 'admin';
      const password = process.env.INITIAL_OWNER_PASSWORD || 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const roleResult = await query('SELECT id FROM user_roles WHERE name = \'owner\'');
      const ownerRoleId = roleResult.rows[0]?.id;
      
      if (!ownerRoleId) {
        throw new Error('Owner role not found in user_roles table');
      }

      await query(
        'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3)',
        [username, hashedPassword, ownerRoleId]
      );
      console.log(`Initial owner created: ${username}`);
    }
  } catch (error) {
    console.error('Error bootstrapping owner:', error);
  }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await bootstrapOwner();
});
