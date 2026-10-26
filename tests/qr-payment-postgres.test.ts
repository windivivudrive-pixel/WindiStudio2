import { expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createPaymentModule, createPostgresStore } from '../kits/qr-payment/src/index.js';

test('portable PostgreSQL DDL, persistence, idempotency and atomic rollback run on PGlite', async () => {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon, authenticated;`);
  let failEvent = false;
  const locks: string[] = [];
  // PGlite is an embedded single-connection PostgreSQL; record lock statements,
  // whose cross-process semantics need a real PostgreSQL deployment to validate.
  const pool = {
    connect: async () => ({
      query: async (sql: string, args: unknown[] = []) => {
        if (sql.includes('pg_advisory_xact_lock')) { locks.push(sql); return { rows: [] }; }
        if (failEvent && sql.startsWith('INSERT INTO windi_qr_private.windi_qr_events')) throw new Error('event write failed');
        return db.query<Record<string, unknown>>(sql, args);
      },
      release() {},
    }),
    end: () => db.close(),
  };
  const store = await createPostgresStore(pool);
  const payments = await createPaymentModule({ store, now: () => Date.parse('2026-10-15T03:00:00Z'), env: {
    QR_BANK_BIN: '970422', QR_BANK_ACCOUNT: '00123', QR_BANK_NAME: 'TEST ONLY', QR_API_KEY: 'private-test-backend-key-0000000000000',
    SEPAY_WEBHOOK_API_KEY: 'private-test-sepay-key-00000', QR_PROJECT_ID: 'postgres-test',
  } });
  const input = { amount: 69000, idempotencyKey: 'pg-invoice-1' };
  try {
    const order = await payments.createOrder(input);
    expect((await payments.createOrder(input)).id).toBe(order.id);
    const request = () => new Request('http://localhost/api/payments/webhook', { method: 'POST', headers: { Authorization: 'Apikey private-test-sepay-key-00000' },
      body: JSON.stringify({ id: 1, accountNumber: '00123', transferType: 'in', transferAmount: 69000, content: order.code, transactionDate: '2026-10-15 10:00:00' }) });
    failEvent = true;
    expect((await payments.handle(request())).status).toBe(503);
    expect((await payments.getOrder(order.id))?.status).toBe('pending');
    expect((await db.query('SELECT * FROM windi_qr_private.windi_qr_events')).rows).toHaveLength(0);
    failEvent = false;
    expect((await payments.webhook(request())).status).toBe('paid');
    expect((await payments.webhook(request())).status).toBe('duplicate');
    expect((await db.query('SELECT * FROM windi_qr_private.windi_qr_events')).rows).toHaveLength(1);
    expect(locks.some(sql => sql.includes('hashtextextended($1'))).toBe(true);
    expect((await db.query<{ relrowsecurity: boolean }>(`SELECT relrowsecurity FROM pg_class WHERE oid='windi_qr_private.windi_qr_orders'::regclass`)).rows[0].relrowsecurity).toBe(true);
    await db.exec('SET ROLE anon');
    await expect(db.query('SELECT data FROM windi_qr_private.windi_qr_orders')).rejects.toThrow(/permission denied/);
    await db.exec('RESET ROLE; SET ROLE authenticated');
    await expect(db.query('SELECT data FROM windi_qr_private.windi_qr_orders')).rejects.toThrow(/permission denied/);
    await db.exec('RESET ROLE');
  } finally { await payments.close(); }
}, 20000);
