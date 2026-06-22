export function normalizePlacementIds(placementIds = []) {
  return placementIds.map((placement) => String(placement?._id ?? placement));
}
