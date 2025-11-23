import pkg from 'pg';
const { Pool } = pkg;

import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

const connectToDatabase = async () => {
  try {
    await pool.connect();
    console.log('Successfully connected to PostgreSQL');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err);
    process.exit(1);
  }
};

export { pool, connectToDatabase };