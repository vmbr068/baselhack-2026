export interface ApprovalRequest {
  hotel: string;
  action: string;
  details: Record<string, unknown>;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)}</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; background: #f6f6f4; color: #1f1e1d; margin: 0; padding: 24px 16px; }
  main { max-width: 480px; margin: 0 auto; background: #fff; border: 1px solid #ddd; border-radius: 12px; padding: 24px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 16px 0; }
  dt { color: #6c6862; }
  dd { margin: 0; overflow-wrap: anywhere; }
  form { display: inline-block; margin: 8px 8px 0 0; }
  button { font: inherit; padding: 10px 16px; border-radius: 8px; border: 1px solid #1f1e1d; background: #fff; cursor: pointer; }
  .approve { background: #1f1e1d; color: #fff; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

export function renderApprovalPage(
  token: string,
  request: ApprovalRequest,
): string {
  const rows = Object.entries(request.details)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(
      ([label, value]) =>
        `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`,
    )
    .join('');
  const action = `/confirm/${encodeURIComponent(token)}`;
  return page(
    'Approve this action',
    `<h1>Do you approve this action?</h1>
<p>An AI agent wants to run <strong>${escapeHtml(request.action)}</strong> on <strong>${escapeHtml(request.hotel)}</strong>. Nothing happens unless you approve.</p>
<dl>${rows}</dl>
<form method="post" action="${action}"><button class="approve" type="submit">Approve</button></form>
<form method="post" action="${action}/reject"><button type="submit">Reject</button></form>`,
  );
}

export function renderApprovalResult(title: string, message: string): string {
  return page(
    title,
    `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`,
  );
}
