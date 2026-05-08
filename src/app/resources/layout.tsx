import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources | Liorea',
  description: 'Browse coaching institute module PDFs from ALLEN, AAKASH, Physics Wallah, and Career Will.',
};

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full bg-background">
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
