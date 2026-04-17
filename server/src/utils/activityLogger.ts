import { query } from '../db/index.js';

export async function logActivity(
  userId: number | null,
  action: string,
  tableName: string,
  recordId?: number,
  details?: Record<string, any>
) {
  try {
    await query(
      'INSERT INTO activity_log (user_id, action, table_name, record_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, tableName, recordId || null, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}