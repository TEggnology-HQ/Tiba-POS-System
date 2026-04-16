import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import paymentRoutes from './routes/payments.js';
import activityRoutes from './routes/activity.js';
import storageRoutes from './routes/storage.js';

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
