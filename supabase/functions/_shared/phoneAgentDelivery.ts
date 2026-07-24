export async function sendPhoneAgentSms({
  to,
  body,
  accountSid,
  authToken,
  from,
  fetcher = fetch,
}: {
  to: string;
  body: string;
  accountSid: string;
  authToken: string;
  from: string;
  fetcher?: typeof fetch;
}): Promise<{ sid: string }> {
  if (!to.trim() || !body.trim() || !accountSid.trim() || !authToken.trim() || !from.trim()) {
    throw new Error('twilio_not_configured');
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const response = await fetcher(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`twilio_send_failed:${response.status}:${text.slice(0, 200)}`);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('twilio_response_malformed'); }
  const sid = parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>).sid === 'string'
    ? String((parsed as Record<string, unknown>).sid).trim()
    : '';
  if (!sid) throw new Error('twilio_response_malformed');
  return { sid };
}
