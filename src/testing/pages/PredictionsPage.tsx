import { Link } from 'react-router-dom';
import { LayoutGrid, FlaskConical, AlertCircle } from 'lucide-react';
import { TestingLayout } from '../components/TestingLayout';
import { FilterBar } from '../components/FilterBar';
import { PredictionCard } from '../components/PredictionCard';
import { PredictionCardSkeleton } from '../components/PredictionCardSkeleton';
import { EmptyState } from '../components/EmptyState';
import { usePredictions } from '../hooks/usePredictions';
import { useTestingFilters } from '../hooks/useTestingFilters';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const PredictionsPage = () => {
  const { filters, setFilter, clearFilters, hasActiveFilters } = useTestingFilters();
  const { predictions, totalCount, isLoading, error } = usePredictions(filters);

  const totalPages = Math.ceil(totalCount / filters.pageSize);

  return (
    <TestingLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h2 text-foreground">Predictions</h1>
            <p className="text-caption text-muted-foreground mt-1">
              {totalCount > 0 ? `${totalCount} prediction${totalCount !== 1 ? 's' : ''}` : 'Browse your try-on predictions'}
            </p>
          </div>
          <Link to="/testing">
            <Button variant="secondary" size="sm" className="gap-2">
              <FlaskConical className="w-4 h-4" />
              New Test
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilter}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-body text-destructive">{error}</p>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <PredictionCardSkeleton key={i} />
            ))}
          </div>
        ) : predictions.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title={hasActiveFilters ? 'No results found' : 'No predictions yet'}
            description={
              hasActiveFilters
                ? 'Try adjusting your filters or clearing them.'
                : 'Run your first test to see predictions here.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Link to="/testing">
                  <Button className="gap-2">
                    <FlaskConical className="w-4 h-4" />
                    Run First Test
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {predictions.map((prediction) => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              {filters.page > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setFilter('page', filters.page - 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (filters.page <= 3) {
                  pageNum = i + 1;
                } else if (filters.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = filters.page - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === filters.page}
                      onClick={() => setFilter('page', pageNum)}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              {filters.page < totalPages && (
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setFilter('page', filters.page + 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </TestingLayout>
  );
};

export default PredictionsPage;
