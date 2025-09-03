// Theme switching functionality
(function() {
  // Check for saved theme preference or default to 'light'
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const defaultTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  
  // Apply theme immediately to prevent flash
  document.documentElement.setAttribute('data-theme', defaultTheme);
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Update theme
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update button accessibility
        toggleBtn.setAttribute('aria-label', 
          newTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
        );
      });
      
      // Set initial aria label
      const currentTheme = document.documentElement.getAttribute('data-theme');
      toggleBtn.setAttribute('aria-label', 
        currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      );
    }
  });
  
  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
      }
    });
  }
})();