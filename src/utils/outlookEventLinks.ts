type OutlookEventLinkArgs = {
  subject: string;
  body?: string;
  startAt: Date;
  endAt: Date;
};

export function formatOutlookDateTime(date: Date): string {
  // Outlook deep links can be picky; avoid milliseconds.
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function encodeQuery(params: Array<[string, string | undefined | null]>): string {
  return params
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

export function buildOutlookEventLinks(args: OutlookEventLinkArgs): { nativeUrl: string; webUrl: string } {
  const start = formatOutlookDateTime(args.startAt);
  const end = formatOutlookDateTime(args.endAt);
  const subject = args.subject;
  const body = args.body?.trim() ? args.body.trim() : undefined;

  // Try multiple synonymous keys for better compatibility across Outlook builds.
  const nativeQs = encodeQuery([
    ['subject', subject],
    ['title', subject],
    ['body', body],
    ['description', body],
    ['startdt', start],
    ['enddt', end],
    // Back-compat: some examples on the web use start/end.
    ['start', start],
    ['end', end],
  ]);

  const nativeUrl = `ms-outlook://events/new?${nativeQs}`;

  const webQs = encodeQuery([
    ['subject', subject],
    ['startdt', start],
    ['enddt', end],
    ['body', body],
  ]);

  const webUrl = `https://outlook.office.com/calendar/0/deeplink/compose?${webQs}`;

  return { nativeUrl, webUrl };
}


