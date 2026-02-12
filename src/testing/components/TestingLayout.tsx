import { ReactNode } from 'react';
import { TestingNav } from './TestingNav';
import pidyLogo from '@/assets/pidy_logo_white.png';
import { Link } from 'react-router-dom';

interface TestingLayoutProps {
  children: ReactNode;
}

export const TestingLayout = ({ children }: TestingLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/testing" className="flex items-center gap-2">
              <img src={pidyLogo} alt="PIDY" className="w-7 h-7 object-contain" />
              <span className="text-subtitle text-foreground font-semibold">Testing</span>
            </Link>
            <div className="h-5 w-px bg-border/50" />
            <TestingNav />
          </div>
        </div>
      </header>
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
};
