/**
 * Aritth Market - Custom React Hooks
 * Reusable hooks for cart, pagination, search, and more
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { cartApi, ordersApi, productsApi } from '@/lib/api';
import type { Order, Product } from '@/types';

// ============================================================================
// TOAST HOOK
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface UseToastReturn {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastType, duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);

        return () => clearTimeout(timer);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ============================================================================
// PAGINATION HOOK
// ============================================================================

interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
}

export function usePagination(
  initialPage = 1,
  initialLimit = 10
): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const resetPage = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    resetPage,
  };
}

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// LOCAL STORAGE HOOK
// ============================================================================

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

interface UseLocalStorageReturn<T> {
  value: T;
  setValue: SetValue<T>;
  removeValue: () => void;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const isInitialized = useRef(false);

  // Initialize from localStorage on first mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isInitialized.current) {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error(`Error reading from localStorage for key "${key}":`, error);
      }
      isInitialized.current = true;
    }
  }, [key]);

  const setValue: SetValue<T> = useCallback(
    (value) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(
          `Error writing to localStorage for key "${key}":`,
          error
        );
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(
        `Error removing from localStorage for key "${key}":`,
        error
      );
    }
  }, [key, initialValue]);

  return { value: storedValue, setValue, removeValue };
}

// ============================================================================
// CART HOOK
// ============================================================================

interface UseCartReturn {
  cartCount: number;
  loading: boolean;
  error: string | null;
  refreshCartCount: () => Promise<void>;
}

export function useCart(): UseCartReturn {
  const { getToken, isLoaded } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCartCount = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setCartCount(0);
        return;
      }

      const response = await cartApi.count(token);

      setCartCount(response.count || 0);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch cart count';
      console.error('Error fetching cart count:', err);
      setError(message);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded]);

  // Refresh cart count on mount
  useEffect(() => {
    if (isLoaded) {
      refreshCartCount();
    }
  }, [isLoaded, refreshCartCount]);

  return { cartCount, loading, error, refreshCartCount };
}

// ============================================================================
// ORDER TRACKING HOOK
// ============================================================================

interface UseOrderTrackingReturn {
  order: Order | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOrderTracking(
  orderId: string,
  intervalMs = 30000
): UseOrderTrackingReturn {
  const { getToken, isLoaded } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoaded || !orderId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const order = await ordersApi.tracking(orderId, token);

      setOrder(order as Order);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch order status';
      console.error(`Error tracking order ${orderId}:`, err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [orderId, getToken, isLoaded]);

  // Fetch on mount and set up polling
  useEffect(() => {
    if (!isLoaded || !orderId) {
      return;
    }

    // Initial fetch
    refresh();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      refresh();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [orderId, isLoaded, intervalMs, refresh]);

  return { order, loading, error, refresh };
}

// ============================================================================
// PRODUCT SEARCH HOOK
// ============================================================================

interface SearchResponse {
  results: Product[];
}

interface UseProductSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  debouncedQuery: string;
  results: Product[];
  loading: boolean;
  error: string | null;
  search: () => Promise<void>;
}

export function useProductSearch(initialQuery = ''): UseProductSearchReturn {
  const { getToken, isLoaded } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (!token && isLoaded) {
        setError('Not authenticated');
        return;
      }

      const response = await productsApi.list(
        { q: debouncedQuery },
        token ?? ''
      ) as SearchResponse;

      setResults(response.results || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Search failed';
      console.error('Error searching products:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}
