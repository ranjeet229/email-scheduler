import './loadEnv.js';
import app from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';

connectDb()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`API listening on port ${env.port}`);
    });
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });
