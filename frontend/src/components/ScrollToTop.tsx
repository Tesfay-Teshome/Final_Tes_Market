import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop ensures that on every route change the window scrolls to the top.
 * This fixes cases where navigation lands near the footer due to preserved scroll position.
 */
export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // If the URL contains a hash and a matching element exists, let the browser handle it.
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) return; // will jump to the anchor naturally
    }

    // Otherwise, reset scroll to the top-left.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
