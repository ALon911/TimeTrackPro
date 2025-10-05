import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { MobileSidebar } from "./mobile-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserProfileDialog } from "./user-profile-dialog";

export function MobileHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  
  return (
    <header className="bg-background dark:bg-slate-800 shadow-sm p-4 flex md:hidden items-center justify-between sticky top-0 z-10">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-1 text-foreground">
            <Menu className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0">
          <MobileSidebar onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      
      <h1 className="text-xl font-bold text-primary">TimeTracker</h1>
      
      <UserProfileDialog>
        <Avatar className="h-8 w-8 bg-primary text-white dark:text-slate-800 cursor-pointer">
          <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'מ'}</AvatarFallback>
        </Avatar>
      </UserProfileDialog>
    </header>
  );
}