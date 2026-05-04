import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practice | Liorea",
  description: "Isolated Practice section for NEET/JEE subjects.",
};

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full w-full bg-background">
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
