import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileHeader } from "./mobile-header";
import { MobileNavigation } from "./mobile-navigation";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row" dir="rtl">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-6 max-w-screen overflow-x-hidden mb-16 md:mb-0">
          {children}
        </main>
        <MobileNavigation />
      </div>
    </div>
  );
}