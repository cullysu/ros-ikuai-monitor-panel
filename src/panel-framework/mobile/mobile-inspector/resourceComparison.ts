export function resourceRelativeStatus(selectedLatest: number | null, relatedLatest: number | null): string {
  if (selectedLatest === null || relatedLatest === null) return "相对值不可比较";
  const delta = relatedLatest - selectedLatest;
  if (delta === 0) return "与当前对象同值";
  return delta > 0
    ? `较当前对象高 ${delta} 个百分点`
    : `较当前对象低 ${Math.abs(delta)} 个百分点`;
}
