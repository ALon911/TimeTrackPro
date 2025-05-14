import { Link, useLocation } from "wouter";

export function MobileNavigation() {
  const [location] = useLocation();
  
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card dark:bg-slate-900 border-t border-border z-10">
      <div className="flex justify-around">
        <div>
          <Link href="/">
            <div className={`flex flex-col items-center py-2 ${location === "/" ? "text-primary" : "text-neutral-500 dark:text-neutral-400"}`}>
              <span className="material-icons">dashboard</span>
              <span className="text-xs mt-1">דף הבית</span>
            </div>
          </Link>
        </div>
        <div>
          <Link href="/time-entries">
            <div className={`flex flex-col items-center py-2 ${location === "/time-entries" ? "text-primary" : "text-neutral-500 dark:text-neutral-400"}`}>
              <span className="material-icons">timer</span>
              <span className="text-xs mt-1">מעקב</span>
            </div>
          </Link>
        </div>
        <div>
          <Link href="/topics">
            <div className={`flex flex-col items-center py-2 ${location === "/topics" ? "text-primary" : "text-neutral-500 dark:text-neutral-400"}`}>
              <span className="material-icons">folder</span>
              <span className="text-xs mt-1">נושאים</span>
            </div>
          </Link>
        </div>
        <div>
          <Link href="/reports">
            <div className={`flex flex-col items-center py-2 ${location === "/reports" ? "text-primary" : "text-neutral-500 dark:text-neutral-400"}`}>
              <span className="material-icons">bar_chart</span>
              <span className="text-xs mt-1">דוחות</span>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
