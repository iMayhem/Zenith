import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Liorea Mobile",
    description: "Your personalized virtual workspace on the go.",
};

export default function MobileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // The RootLayout provides the HTML/Body tags, fonts, and global Providers.
    // This layout specifically wraps the /mobile sub-routes in a mobile-optimized shell.
    return (
        <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden selection:bg-accent/30">
            {/* The active mobile page content */}
            <main className="flex-1 w-full overflow-y-auto no-scrollbar relative min-h-0 pb-[72px]">
                {children}
            </main>

            {/* A persistent custom Mobile Bottom Navigation Bar can be added here later */}
        </div>
    );
}
