/**
 * pgcrypto helpers for Drizzle ORM symmetric encryption.
 *
 * Columns are stored as `text` (base64 armor output of pgp_sym_encrypt).
 * Use the SQL helpers pgEncrypt / pgDecrypt in queries:
 *
 *   INSERT: db.insert(table).values({
 *     sensitiveField: pgEncrypt("my secret value"),
 *   })
 *
 *   SELECT: db.select({
 *     sensitiveField: pgDecrypt(table.sensitiveField),
 *   }).from(table)
 *
 * Requires:
 *   - pgcrypto extension enabled in Postgres (see scripts/init-pgcrypto.sql)
 *   - Postgres session variable `app.pgcrypto_key` set via setPgcryptoKey() before encrypt/decrypt calls
 */

import { sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

/**
 * SQL expression to encrypt a plaintext value using pgp_sym_encrypt.
 * Returns armored text suitable for storage in a text column.
 */
export function pgEncrypt(value: string) {
  return sql`pgp_sym_encrypt(${value}, current_setting('app.pgcrypto_key'))`;
}

/**
 * SQL expression to decrypt an encrypted column using pgp_sym_decrypt.
 * Use in select() to read encrypted data.
 */
export function pgDecrypt(column: AnyColumn) {
  return sql<string>`pgp_sym_decrypt(${column}::bytea, current_setting('app.pgcrypto_key'))`;
}

/**
 * SQL expression to encrypt a JSON object.
 * Serializes to string before encrypting.
 */
export function pgEncryptJson(value: Record<string, unknown>) {
  return pgEncrypt(JSON.stringify(value));
}

/**
 * SQL expression to decrypt an encrypted column containing JSON.
 * Returns the raw decrypted string — parse with JSON.parse() in application code.
 */
export function pgDecryptJson(column: AnyColumn) {
  return pgDecrypt(column);
}

/**
 * Set the pgcrypto key as a transaction-local Postgres session variable.
 * Must be called inside a transaction before using pgEncrypt/pgDecrypt.
 *
 * Usage:
 *   await db.transaction(async (tx) => {
 *     await tx.execute(setPgcryptoKey(process.env.PGCRYPTO_KEY!));
 *     await tx.insert(table).values({ field: pgEncrypt("secret") });
 *   });
 */
export function setPgcryptoKey(key: string) {
  return sql`SELECT set_config('app.pgcrypto_key', ${key}, true)`;
}
