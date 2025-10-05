import { useAuth } from "@/hooks/use-auth";
import { useTeams } from "@/hooks/use-teams";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-switcher";
import { BellIcon } from "lucide-react";
import { UserProfileDialog } from "./user-profile-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { myInvitations, isLoadingMyInvitations } = useTeams();
  
  return (
    <aside className="hidden md:flex md:w-64 bg-card shadow-md flex-col h-screen sticky top-0" dir="rtl">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">TimeTracker</h1>
          <ThemeToggle />
        </div>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
        <ul>
          <li className="mb-1">
            <div className="mx-2">
              <Link href="/">
                <div className={`flex items-center px-4 py-3 font-medium rounded-md ${
                  location === "/" 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground hover:bg-muted"
                }`}>
                  <span className="material-icons ml-3">dashboard</span>
                  <span>לוח מחוונים</span>
                </div>
              </Link>
            </div>
          </li>
          <li className="mb-1">
            <div className="mx-2">
              <Link href="/time-entries">
                <div className={`flex items-center px-4 py-3 font-medium rounded-md ${
                  location === "/time-entries" 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground hover:bg-muted"
                }`}>
                  <span className="material-icons ml-3">timer</span>
                  <span>מעקב זמן</span>
                </div>
              </Link>
            </div>
          </li>
          <li className="mb-1">
            <div className="mx-2">
              <Link href="/topics">
                <div className={`flex items-center px-4 py-3 font-medium rounded-md ${
                  location === "/topics" 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground hover:bg-muted"
                }`}>
                  <span className="material-icons ml-3">folder</span>
                  <span>נושאים</span>
                </div>
              </Link>
            </div>
          </li>
          <li className="mb-1">
            <div className="mx-2">
              <Link href="/suggestions">
                <div className={`flex items-center px-4 py-3 font-medium rounded-md ${
                  location === "/suggestions" 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground hover:bg-muted"
                }`}>
                  <span className="material-icons ml-3">lightbulb</span>
                  <span>הצעות AI</span>
                </div>
              </Link>
            </div>
          </li>
          <li className="mb-1">
            <div className="mx-2">
              <Link href="/insights">
                <div className={`flex items-center px-4 py-3 font-medium rounded-md ${
                  location === "/insights" 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground hover:bg-muted"
                }`}>
                  <span className="material-icons ml-3">analytics</span>
                  <span>סקירה ותובנות</span>
                </div>
              </Link>
            </div>
          </li>
          <li className="mb-1">
            <div className="mx-2">
              <Link href="/reports">
                <div className={`flex items-center px-4 py-3 font-medium rounded-md ${
                  location === "/reports" 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground hover:bg-muted"
                }`}>
                  <span className="material-icons ml-3">bar_chart</span>
                  <span>דוחות</span>
                </div>
              </Link>
            </div>
          </li>
          <li className="mb-1">
            <div className="mx-2">
              <Link href="/teams">
                <div className={`flex items-center px-4 py-3 font-medium rounded-md ${
                  location === "/teams" 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground hover:bg-muted"
                }`}>
                  <span className="material-icons ml-3">group</span>
                  <span>צוותים</span>
                  {!isLoadingMyInvitations && myInvitations && myInvitations.length > 0 && (
                    <div className="flex items-center mr-2">
                      <div className="relative">
                        <BellIcon className="h-5 w-5 text-amber-500" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {myInvitations.length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          </li>
          <li className="mb-1">
            <div className="mx-2">
              <Link href="/settings">
                <div className={`flex items-center px-4 py-3 font-medium rounded-md ${
                  location === "/settings" 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground hover:bg-muted"
                }`}>
                  <span className="material-icons ml-3">settings</span>
                  <span>הגדרות</span>
                </div>
              </Link>
            </div>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <UserProfileDialog>
            <div className="flex items-center cursor-pointer">
              <Avatar className="w-10 h-10 bg-primary text-primary-foreground">
                <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'מ'}</AvatarFallback>
              </Avatar>
      <div className="mr-3">
        <div className="font-medium">{user?.displayName || user?.username || 'משתמש'}</div>
        <div className="text-sm text-muted-foreground">{user?.email || ''}</div>
      </div>
            </div>
          </UserProfileDialog>
          
          <Link href="/settings">
            <div className="p-1 rounded-full hover:bg-muted cursor-pointer">
              <span className="material-icons">settings</span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
