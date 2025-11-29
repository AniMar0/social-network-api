export function timeAgo(timestamp: string, naveBar?: boolean) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();

  const diffMins = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  switch (naveBar) {
    case true:
      if (diffDays > 0) {
        return `${diffDays}d`;
      } else if (diffHours > 0) {
        return `${diffHours}h`;
      } else if (diffMins > 0) {
        return `${diffMins}m`;
      } else {
        return "now";
      }
    default:
      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      } else if (diffMins > 0) {
        return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      } else {
        return "seen just now";
      }
  }
}
