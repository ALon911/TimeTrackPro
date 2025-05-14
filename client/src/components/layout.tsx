import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <MobileSidebar />
        <main className="flex-1 p-4 md:p-6 max-w-screen overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}