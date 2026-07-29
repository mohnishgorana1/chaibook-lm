export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex h-[calc(100dvh-3.5rem)] w-full relative z-0 overflow-hidden bg-base">
            <div className="flex-1 h-full overflow-hidden relative">
                {children}
            </div>
        </div>
    );
}