/** Keep two cards per row; scaled text can wrap and actions can stack vertically. */
export function getProductLayout(width: number, fontScale: number) {
  const available = Math.max(11, width - 32);
  const columns = 2;
  return {
    columns,
    gridCardWidth: (available - 10) / columns,
    horizontalCardWidth: Math.max(1, Math.min((available - 12) / 2, 190)),
    trendingCardWidth: Math.max(1, Math.min(width * 0.41, (available - 12) / 2, 180)),
    dealCardWidth: Math.max(1, width - 56),
    stackActions: fontScale >= 1.3 || width < 360,
  };
}