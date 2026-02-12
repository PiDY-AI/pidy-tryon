import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'error' | 'secondary' | 'accent'; label: string }> = {
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'error', label: 'Failed' },
  generating_prompt: { variant: 'warning', label: 'Generating Prompt' },
  generating_image: { variant: 'warning', label: 'Generating Image' },
  pending: { variant: 'secondary', label: 'Pending' },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status] || { variant: 'secondary' as const, label: status };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};
