import { Link, useLocation } from 'react-router-dom';
import { FlaskConical, LayoutGrid } from 'lucide-react';

const navItems = [
  { to: '/testing', label: 'Test Runner', icon: FlaskConical },
  { to: '/testing/predictions', label: 'Predictions', icon: LayoutGrid },
];

export const TestingNav = () => {
  const location = useLocation();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map(({ to, label, icon: Icon }) => {
        const isActive = location.pathname === to ||
          (to === '/testing/predictions' && location.pathname.startsWith('/testing/predictions'));

        return (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
};
