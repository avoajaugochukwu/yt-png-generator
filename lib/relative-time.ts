const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < MINUTE) return 'just now';
  if (diffSec < HOUR) {
    const m = Math.floor(diffSec / MINUTE);
    return `${m} minute${m > 1 ? 's' : ''} ago`;
  }
  if (diffSec < DAY) {
    const h = Math.floor(diffSec / HOUR);
    return `${h} hour${h > 1 ? 's' : ''} ago`;
  }
  if (diffSec < DAY * 2) return 'yesterday';
  if (diffSec < WEEK) return DAY_NAMES[date.getDay()];

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
