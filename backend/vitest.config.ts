import { defineConfig } from 'vitest/config';

export default defineConfig({
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
