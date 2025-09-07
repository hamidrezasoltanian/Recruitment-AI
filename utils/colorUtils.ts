export const getJobColor = (jobTitle: string): string => {
  if (!jobTitle) {
    return 'hsl(0, 0%, 85%)'; // a neutral grey for empty job title
  }
  let hash = 0;
  for (let i = 0; i < jobTitle.length; i++) {
    hash = jobTitle.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  const hue = Math.abs(hash % 360);
  // Using HSL for pastel colors: 70% saturation, 85% lightness
  return `hsl(${hue}, 70%, 85%)`;
};
