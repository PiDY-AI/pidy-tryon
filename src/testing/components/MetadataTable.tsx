interface MetadataItem {
  label: string;
  value: React.ReactNode;
}

interface MetadataTableProps {
  items: MetadataItem[];
  className?: string;
}

export const MetadataTable = ({ items, className = '' }: MetadataTableProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
          <span className="text-caption text-muted-foreground shrink-0">{item.label}</span>
          <span className="text-caption text-foreground text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
};
