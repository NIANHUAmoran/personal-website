const fullDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

const shortDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

export function formatDate(date: Date) {
  return fullDateFormatter.format(date).replaceAll('/', '.');
}

export function formatShortDate(date: Date) {
  return shortDateFormatter.format(date).replaceAll('/', '-');
}
