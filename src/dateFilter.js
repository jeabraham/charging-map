export function filterByDate(station, startDate, endDate) {
  if (!startDate && !endDate) return true;

  // Use DateCreated only
  const dateField = station.DateCreated;
  if (!dateField) return false;

  const created = new Date(dateField);

  // Normalize to UTC midnight for comparisons
  const start = startDate ? new Date(startDate + "T00:00:00Z") : null;
  const end = endDate ? new Date(endDate + "T23:59:59Z") : null;

  return (
    (!start || created >= start) &&
    (!end || created <= end)
  );
}
