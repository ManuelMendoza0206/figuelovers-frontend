export const truncateId = (
  id: string,
  maxLength = 15
): string =>
  id.length > maxLength
    ? `${id.slice(0, maxLength)}…`
    : id;