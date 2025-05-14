import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-switcher";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex items-center px-4 py-3 md:hidden">
        <div className="flex flex-1 justify-between items-center">
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">פתח תפריט</span>
            </Button>
          </SheetTrigger>
          <h1 className="text-xl font-bold text-primary">TimeTracker</h1>
          <ThemeToggle />
        </div>
      </div>
      <SheetContent side="right" className="p-0 w-[270px]">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-end p-4">
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto no-scrollbar">
            <Sidebar isMobile={true} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}