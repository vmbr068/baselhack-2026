import { redact } from './audit-log.js';

describe('redact', () => {
  it('masks secret keys and confirmation tokens, keeps the rest', () => {
    expect(
      redact({
        room_title: 'Deluxe',
        confirmation_token: 'conf_tok_1_abc',
        nested: [{ apiKey: 'k', githubToken: 'ghp_x', ok: 1 }],
        instructions: "call again with confirmation_token='conf_tok_2_def'.",
      }),
    ).toEqual({
      room_title: 'Deluxe',
      confirmation_token: '[REDACTED]',
      nested: [{ apiKey: '[REDACTED]', githubToken: '[REDACTED]', ok: 1 }],
      instructions: "call again with confirmation_token='[REDACTED]'.",
    });
  });
});
