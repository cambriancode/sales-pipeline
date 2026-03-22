function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toIcsDate(value: string): string {
  return value.replace(/-/g, '');
}

function toIcsTime(value: string): string {
  return value.slice(0, 5).replace(':', '') + '00';
}

export function buildFloatingDateTime(date: string, time: string): string {
  return `${toIcsDate(date)}T${toIcsTime(time)}`;
}

export function buildActivityIcs(args: {
  uid: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  timezone: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  organizerEmail?: string | null;
}) {
  const {
    uid,
    summary,
    description,
    location,
    timezone,
    startDate,
    startTime,
    endDate,
    endTime,
    organizerEmail,
  } = args;

  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calavera Ventas//Sales Pipeline//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${escapeIcsText(timezone)}:${buildFloatingDateTime(startDate, startTime)}`,
    `DTEND;TZID=${escapeIcsText(timezone)}:${buildFloatingDateTime(endDate, endTime)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
  ];

  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  if (organizerEmail) lines.push(`ORGANIZER:mailto:${escapeIcsText(organizerEmail)}`);

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
