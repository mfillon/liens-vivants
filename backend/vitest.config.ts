import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    pool: 'forks',
    forks: {
      execArgv: ['--experimental-sqlite'],
    },
    env: {
      DB_PATH: ':memory:',
      ADMIN_USER: 'admin',
      ADMIN_PASS: 'testpass',
      NODE_ENV: 'test',
    },
  },
});
