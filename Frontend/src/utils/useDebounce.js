import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * inactivity. Use this as the dependency of data-fetch useEffects so rapid
 * filter changes (e.g. typing in a search box) don't fire a request on every
 * keystroke — only after the user pauses.
 *
 * @param {*}      value  - Value to debounce (string, object, etc.)
 * @param {number} delay  - Milliseconds to wait (default 300)
 * @returns {*} Debounced value
 *
 * @example
 * const debouncedFilters = useDebounce(filters, 300);
 * useEffect(() => { fetchData(debouncedFilters); }, [debouncedFilters]);
 */
export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
