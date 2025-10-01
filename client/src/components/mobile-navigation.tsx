import { Link, useLocation } from "wouter";
import { Home, Clock, FolderClosed, BarChart, Settings, Users, Lightbulb } from "lucide-react";

export function MobileNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    { href: "/", label: "דף הבית", icon: <Home className="h-5 w-5" /> },
    { href: "/time-entries", label: "מעקב", icon: <Clock className="h-5 w-5" /> },
    { href: "/topics", label: "נושאים", icon: <FolderClosed className="h-5 w-5" /> },
    { href: "/suggestions", label: "הצעות", icon: <Lightbulb className="h-5 w-5" /> },
    { href: "/reports", label: "דוחות", icon: <BarChart className="h-5 w-5" /> },
    { href: "/teams", label: "צוותים", icon: <Users className="h-5 w-5" /> },
  ];
  
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card dark:bg-slate-800 border-t border-border z-10">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div 
              className={`flex flex-col items-center py-2 ${
                location === item.href 
                  ? "text-primary dark:text-primary" 
                  : "text-muted-foreground hover:text-foreground dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </nav>
  );
}