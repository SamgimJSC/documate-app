type StoredFile = { fileSizeBytes?: number };

export function calculateStorageUsedGb(
  documents: StoredFile[],
  receipts: StoredFile[],
  serverStorageUsedGb = 0,
): number {
  const fileBytes = [...documents, ...receipts].reduce(
    (total, item) => total + (Number(item.fileSizeBytes) || 0),
    0,
  );
  return Math.max(serverStorageUsedGb, fileBytes / 1024 ** 3);
}

export function formatStorageUsed(gigabytes: number): string {
  if (gigabytes < 1) {
    return `${Math.round(gigabytes * 1024).toLocaleString()}MB`;
  }
  return `${gigabytes.toFixed(1)}GB`;
}
