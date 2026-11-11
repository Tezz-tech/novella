// Safe defaults so env validation passes in tests without a real .env.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/novelle-tech-test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
process.env.CLIENT_URL ??= 'http://localhost:5173';
