export function formatStorageUsed(gigabytes: number): string {
  if (gigabytes < 1) {
    return `${Math.round(gigabytes * 1024).toLocaleString()}MB`;
  }
  return `${gigabytes.toFixed(1)}GB`;
}
