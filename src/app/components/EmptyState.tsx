import { Package } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div 
        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--color-gray-200)' }}
      >
        {icon || <Package className="w-10 h-10" style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} strokeWidth={1.5} />}
      </div>
      <h4 className="font-semibold mb-2" style={{ color: 'var(--color-navy)' }}>
        {title}
      </h4>
      <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {description}
      </p>
    </div>
  );
}
