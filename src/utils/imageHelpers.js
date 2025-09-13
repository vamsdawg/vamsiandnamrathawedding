// Responsive image helper for EJS templates
// Use this in your views to automatically serve the right image size

export function getResponsiveImageSrc(imagePath, size = 'medium') {
  const ext = imagePath.substring(imagePath.lastIndexOf('.'));
  const basePath = imagePath.substring(0, imagePath.lastIndexOf('.'));
  
  // Return optimized version if it exists
  if (size === 'original') {
    return `${basePath}-optimized.webp`;
  }
  return `${basePath}-${size}-optimized.webp`;
}

export function getResponsiveImageSrcSet(imagePath) {
  const ext = imagePath.substring(imagePath.lastIndexOf('.'));
  const basePath = imagePath.substring(0, imagePath.lastIndexOf('.'));
  
  return [
    `${basePath}-small-optimized.webp 640w`,
    `${basePath}-medium-optimized.webp 1280w`,
    `${basePath}-large-optimized.webp 1920w`
  ].join(', ');
}

export function getResponsiveImageFallback(imagePath, size = 'medium') {
  const ext = imagePath.substring(imagePath.lastIndexOf('.'));
  const basePath = imagePath.substring(0, imagePath.lastIndexOf('.'));
  
  if (size === 'original') {
    return `${basePath}-optimized.jpg`;
  }
  return `${basePath}-${size}-optimized.jpg`;
}
