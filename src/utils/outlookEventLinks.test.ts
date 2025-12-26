import { buildOutlookEventLinks, formatOutlookDateTime } from './outlookEventLinks';

describe('outlookEventLinks', () => {
  test('formatOutlookDateTime strips milliseconds', () => {
    const d = new Date('2025-12-24T12:34:56.789Z');
    expect(formatOutlookDateTime(d)).toBe('2025-12-24T12:34:56Z');
  });

  test('buildOutlookEventLinks includes subject/body and start/end', () => {
    const startAt = new Date('2025-12-24T12:00:00.123Z');
    const endAt = new Date('2025-12-24T12:30:00.999Z');

    const { nativeUrl, webUrl } = buildOutlookEventLinks({
      subject: 'My Activity',
      body: 'Goal: Test\n\nNotes: Hello world',
      startAt,
      endAt,
    });

    const start = encodeURIComponent('2025-12-24T12:00:00Z');
    const end = encodeURIComponent('2025-12-24T12:30:00Z');

    expect(nativeUrl.startsWith('ms-outlook://events/new?')).toBe(true);
    expect(nativeUrl).toContain(`subject=${encodeURIComponent('My Activity')}`);
    expect(nativeUrl).toContain(`body=${encodeURIComponent('Goal: Test\n\nNotes: Hello world')}`);
    expect(nativeUrl).toContain(`startdt=${start}`);
    expect(nativeUrl).toContain(`enddt=${end}`);

    expect(webUrl.startsWith('https://outlook.office.com/calendar/0/deeplink/compose?')).toBe(true);
    expect(webUrl).toContain(`subject=${encodeURIComponent('My Activity')}`);
    expect(webUrl).toContain(`body=${encodeURIComponent('Goal: Test\n\nNotes: Hello world')}`);
    expect(webUrl).toContain(`startdt=${start}`);
    expect(webUrl).toContain(`enddt=${end}`);
  });
});


