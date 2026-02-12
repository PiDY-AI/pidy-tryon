import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
import { PredictionFilters } from '../types';

const DEFAULTS: PredictionFilters = {
  search: '',
  productId: '',
  tags: '',
  dateRange: 'all',
  status: 'all',
  page: 1,
  pageSize: 20,
};

export const useTestingFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: PredictionFilters = {
    search: searchParams.get('search') || DEFAULTS.search,
    productId: searchParams.get('productId') || DEFAULTS.productId,
    tags: searchParams.get('tags') || DEFAULTS.tags,
    dateRange: (searchParams.get('dateRange') as PredictionFilters['dateRange']) || DEFAULTS.dateRange,
    status: (searchParams.get('status') as PredictionFilters['status']) || DEFAULTS.status,
    page: parseInt(searchParams.get('page') || '1', 10),
    pageSize: DEFAULTS.pageSize,
  };

  const setFilter = useCallback(
    (key: keyof PredictionFilters, value: string | number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const defaultVal = String(DEFAULTS[key]);

        if (String(value) === defaultVal || value === '') {
          next.delete(String(key));
        } else {
          next.set(String(key), String(value));
        }

        // Reset page when changing filters (except page itself)
        if (key !== 'page') {
          next.delete('page');
        }

        return next;
      });
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.productId !== '' ||
    filters.tags !== '' ||
    filters.dateRange !== 'all' ||
    filters.status !== 'all';

  return { filters, setFilter, clearFilters, hasActiveFilters };
};
