import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const AUDIT_FILE = path.resolve(process.cwd(), 'audit_logs/tool-calls.jsonl');
const SECRET_KEY =
  /token|secret|password|passwd|api[_-]?key|authorization|cookie|card|cvv|iban/i;
const CONFIRMATION_TOKEN = /conf_tok_\w+/g;

/** Deep-copies `value`, masking secret-looking keys and confirmation tokens embedded in strings. */
export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(CONFIRMATION_TOKEN, '[REDACTED]');
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SECRET_KEY.test(k) ? '[REDACTED]' : redact(v),
      ]),
    );
  }
  return value;
}

/** Appends one redacted JSON line to the audit trail. */
export async function appendAuditEntry(
  entry: Record<string, unknown>,
): Promise<void> {
  await fs.mkdir(path.dirname(AUDIT_FILE), { recursive: true });
  await fs.appendFile(
    AUDIT_FILE,
    JSON.stringify(redact({ time: new Date().toISOString(), ...entry })) + '\n',
  );
}
