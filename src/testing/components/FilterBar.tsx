import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PredictionFilters } from '../types';

interface FilterBarProps {
  filters: PredictionFilters;
  onFilterChange: (key: keyof PredictionFilters, value: string | number) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export const FilterBar = ({ filters, onFilterChange, onClear, hasActiveFilters }: FilterBarProps) => {
  return (
    <div className="bg-secondary/30 border border-border/30 rounded-xl p-4 flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          placeholder="Search products, notes..."
          className="pl-9 h-9"
        />
      </div>

      {/* Tags */}
      <div className="min-w-[150px]">
        <Input
          value={filters.tags}
          onChange={(e) => onFilterChange('tags', e.target.value)}
          placeholder="Filter tags..."
          className="h-9"
        />
      </div>

      {/* Date Range */}
      <Select value={filters.dateRange} onValueChange={(val) => onFilterChange('dateRange', val)}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="24h">Last 24h</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={filters.status} onValueChange={(val) => onFilterChange('status', val)}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="generating_prompt">Generating</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9 gap-1">
          <X className="w-3 h-3" />
          Clear
          <Badge variant="accent" className="ml-1">filters</Badge>
        </Button>
      )}
    </div>
  );
};
