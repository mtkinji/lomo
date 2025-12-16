type IcsEventArgs = {
  uid: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, '0');
}

function formatIcsDateUtc(date: Date) {
  // YYYYMMDDTHHMMSSZ
  return (
    String(date.getUTCFullYear()) +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    'T' +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes()) +
    pad2(date.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcsText(value: string) {
  // RFC5545 escaping for TEXT values.
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildIcsEvent(args: IcsEventArgs) {
  const createdAt = args.createdAt ?? new Date();
  const updatedAt = args.updatedAt ?? createdAt;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kwilt//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(args.uid)}`,
    `DTSTAMP:${formatIcsDateUtc(updatedAt)}`,
    `CREATED:${formatIcsDateUtc(createdAt)}`,
    `LAST-MODIFIED:${formatIcsDateUtc(updatedAt)}`,
    `DTSTART:${formatIcsDateUtc(args.startAt)}`,
    `DTEND:${formatIcsDateUtc(args.endAt)}`,
    `SUMMARY:${escapeIcsText(args.title)}`,
  ];

  if (args.description && args.description.trim().length > 0) {
    lines.push(`DESCRIPTION:${escapeIcsText(args.description.trim())}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  // CRLF is the preferred line ending for ICS.
  return lines.join('\r\n') + '\r\n';
}


