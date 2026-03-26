import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Check if window is defined (prevents SSR issues)
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia(query);
      
      // Set the initial value
      setMatches(mediaQuery.matches);
      
      // Create event listener function
      const listener = (e: MediaQueryListEvent) => {
        setMatches(e.matches);
      };
      
      // Add event listener
      mediaQuery.addEventListener('change', listener);
      
      // Clean up
      return () => {
        mediaQuery.removeEventListener('change', listener);
      };
    }
  }, [query]);

  return matches;
}

// Common breakpoints
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
};

// Example usage:
// const isDesktop = useMediaQuery(breakpoints.lg);
// const isTablet = useMediaQuery(breakpoints.md);
// const isMobile = useMediaQuery('(max-width: 768px)');
