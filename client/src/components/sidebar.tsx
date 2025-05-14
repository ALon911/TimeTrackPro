import { useAuth } from "@/hooks/use-auth";
import { useTeams } from "@/hooks/use-teams";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-switcher";
import { BellIcon } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { myInvitations, isLoadingMyInvitations } = useTeams();
  
  return (
    <aside className="hidden md:flex md:w-64 bg-card shadow-md flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">TimeTracker</h1>
          <ThemeToggle />
        </div>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
        <ul>
          <li className="mb-1">
            <Link href="/">
              <a className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
                location === "/" 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground hover:bg-muted"
              }`}>
                <span className="material-icons ml-3">dashboard</span>
                <span>לוח מחוונים</span>
              </a>
            </Link>
          </li>
          <li className="mb-1">
            <Link href="/time-entries">
              <a className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
                location === "/time-entries" 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground hover:bg-muted"
              }`}>
                <span className="material-icons ml-3">timer</span>
                <span>מעקב זמן</span>
              </a>
            </Link>
          </li>
          <li className="mb-1">
            <Link href="/topics">
              <a className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
                location === "/topics" 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground hover:bg-muted"
              }`}>
                <span className="material-icons ml-3">folder</span>
                <span>נושאים</span>
              </a>
            </Link>
          </li>
          <li className="mb-1">
            <Link href="/reports">
              <a className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
                location === "/reports" 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground hover:bg-muted"
              }`}>
                <span className="material-icons ml-3">bar_chart</span>
                <span>דוחות</span>
              </a>
            </Link>
          </li>
          <li className="mb-1">
            <Link href="/teams">
              <a className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
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
              </a>
            </Link>
          </li>
          <li className="mb-1">
            <Link href="/settings">
              <a className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
                location === "/settings" 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground hover:bg-muted"
              }`}>
                <span className="material-icons ml-3">settings</span>
                <span>הגדרות</span>
              </a>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <span className="text-lg font-medium">{user?.username?.charAt(0) || 'מ'}</span>
            </div>
            <div className="mr-3">
              <div className="font-medium">{user?.username || 'משתמש'}</div>
              <div className="text-sm text-muted-foreground">{user?.email || ''}</div>
            </div>
          </div>
          <Link href="/settings">
            <a className="p-1 rounded-full hover:bg-muted">
              <span className="material-icons">settings</span>
            </a>
          </Link>
        </div>
      </div>
    </aside>
  );
}
