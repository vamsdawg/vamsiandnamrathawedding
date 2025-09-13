// Image lazy loading enhancement script
// Add to your main.js for better performance

document.addEventListener('DOMContentLoaded', function() {
  // Enhanced lazy loading for better UX
  const images = document.querySelectorAll('img[loading="lazy"]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          
          // Add loaded class for CSS transition
          img.addEventListener('load', () => {
            img.classList.add('loaded');
          });
          
          // Stop observing this image
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
  
  // Preload critical images
  function preloadCriticalImages() {
    const criticalImages = document.querySelectorAll('img[fetchpriority="high"]');
    criticalImages.forEach(img => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = img.src;
      document.head.appendChild(link);
    });
  }
  
  preloadCriticalImages();
  
  // Add error handling for failed image loads
  images.forEach(img => {
    img.addEventListener('error', () => {
      // Try JPEG fallback if WebP fails
      const src = img.src;
      if (src.includes('.webp')) {
        img.src = src.replace('.webp', '.jpg');
      }
    });
  });
});

// Gallery lightbox functionality (optional enhancement)
function initGalleryLightbox() {
  const galleryImages = document.querySelectorAll('.gallery-image');
  
  galleryImages.forEach(img => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => {
      // Create simple lightbox
      const lightbox = document.createElement('div');
      lightbox.className = 'lightbox';
      lightbox.innerHTML = `
        <div class="lightbox-content">
          <img src="${img.src}" alt="${img.alt}">
          <button class="lightbox-close">&times;</button>
        </div>
      `;
      
      document.body.appendChild(lightbox);
      
      // Close lightbox
      lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
        document.body.removeChild(lightbox);
      });
      
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
          document.body.removeChild(lightbox);
        }
      });
    });
  });
}

// Initialize gallery lightbox if gallery exists
if (document.querySelector('.gallery-grid')) {
  initGalleryLightbox();
}
