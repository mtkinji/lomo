import { sendPhoneAgentSms } from '../phoneAgentDelivery';

test('sends a form-encoded Twilio message and requires its durable SID', async () => {
  const fetcher = jest.fn(async () => new Response(JSON.stringify({ sid: 'SM-out-1' }), { status: 201 }));
  await expect(sendPhoneAgentSms({
    to: '+14155550123', body: 'Here is your plan.', accountSid: 'AC1', authToken: 'secret',
    from: '+14155550999', fetcher: fetcher as typeof fetch,
  })).resolves.toEqual({ sid: 'SM-out-1' });
  expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/Accounts/AC1/Messages.json'), expect.objectContaining({
    method: 'POST', body: expect.stringContaining('Body=Here+is+your+plan.'),
  }));
});

test('rejects failed or malformed Twilio responses', async () => {
  const base = { to: '+14155550123', body: 'Hi', accountSid: 'AC1', authToken: 'secret', from: '+14155550999' };
  await expect(sendPhoneAgentSms({ ...base, fetcher: jest.fn(async () => new Response('no', { status: 503 })) as typeof fetch }))
    .rejects.toThrow('twilio_send_failed');
  await expect(sendPhoneAgentSms({ ...base, fetcher: jest.fn(async () => new Response('{}', { status: 201 })) as typeof fetch }))
    .rejects.toThrow('twilio_response_malformed');
});
