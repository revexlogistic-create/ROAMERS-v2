/* Local preview launcher — sets the env the server requires, then boots it.
   Dev-only convenience; production (Vercel) uses real env vars. */
process.env.PORT           = process.env.PORT || '3100';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test_admin_123';
process.env.ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'admin@test.local';
process.env.ADMIN_NAME     = process.env.ADMIN_NAME || 'Test';
process.env.JWT_SECRET     = process.env.JWT_SECRET || 'test_secret_local_only_padding_0123456789abcdef';
process.chdir(__dirname);
require('./server.js');
