// Safe defaults so env validation passes in tests without a real .env.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/novelle-tech-test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
process.env.CLIENT_URL ??= 'http://localhost:5173';
// Paystack is always mocked with nock in tests; this key only has to exist so the client code runs.
process.env.PAYSTACK_SECRET_KEY ||= 'sk_test_000000000000000000000000000000000000';
// WhatsApp is mocked with nock in tests. These values make the code path run.
process.env.WHATSAPP_PHONE_NUMBER_ID ||= '100200300400500';
process.env.WHATSAPP_ACCESS_TOKEN ||= 'test-wa-token';
process.env.OWNER_WHATSAPP_NUMBER ||= '08000000001';
