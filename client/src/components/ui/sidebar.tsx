import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, LogOut } from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Extract first letter of username for avatar
  const userInitial = user?.username ? user.username[0].toUpperCase() : "U";
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const menuItems = [
    { href: "/", label: "לוח מחוונים", icon: "dashboard" },
    { href: "/time-tracking", label: "מעקב זמן", icon: "timer" },
    { href: "/topics", label: "נושאים", icon: "folder" },
    { href: "/reports", label: "דוחות", icon: "bar_chart" },
    { href: "/settings", label: "הגדרות", icon: "settings" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-white shadow-md flex-col h-screen sticky top-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">TimeTracker</h1>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <span className="material-icons">menu</span>
            </Button>
          </div>
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
          <ul>
            {menuItems.map((item) => (
              <li key={item.href} className="mb-1">
                <Link href={item.href}>
                  <a 
                    className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
                      location === item.href 
                        ? "text-primary bg-blue-50" 
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <span className="material-icons ml-3">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Avatar>
                <AvatarFallback className="bg-primary text-white">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="mr-3">
                <div className="font-medium text-neutral-800">{user?.username}</div>
                <div className="text-sm text-neutral-500">{user?.email || "ללא אימייל"}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Mobile Header */}
      <header className="bg-white shadow-sm p-4 flex md:hidden items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-primary">TimeTracker</h1>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-white text-sm">
            {userInitial}
          </AvatarFallback>
        </Avatar>
      </header>
      
      {/* Mobile Menu (Slide in from the side) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-lg flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h1 className="text-xl font-bold text-primary">TimeTracker</h1>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="material-icons">close</span>
              </Button>
            </div>
            
            <nav className="flex-1 py-4 overflow-y-auto">
              <ul>
                {menuItems.map((item) => (
                  <li key={item.href} className="mb-1">
                    <Link href={item.href}>
                      <a 
                        className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
                          location === item.href 
                            ? "text-primary bg-blue-50" 
                            : "text-neutral-600 hover:bg-neutral-100"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="material-icons ml-3">{item.icon}</span>
                        <span>{item.label}</span>
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-white">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mr-3">
                    <div className="font-medium text-neutral-800">{user?.displayName || user?.username}</div>
                    <div className="text-sm text-neutral-500">{user?.email || "ללא אימייל"}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
