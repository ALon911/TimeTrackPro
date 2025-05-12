import { Link, useLocation } from "wouter";

export function MobileNavigation() {
  const [location] = useLocation();
  
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 z-10">
      <div className="flex justify-around">
        <Link href="/">
          <a className={`flex flex-col items-center py-2 ${location === "/" ? "text-primary" : "text-neutral-500"}`}>
            <span className="material-icons">dashboard</span>
            <span className="text-xs mt-1">דף הבית</span>
          </a>
        </Link>
        <Link href="/time-entries">
          <a className={`flex flex-col items-center py-2 ${location === "/time-entries" ? "text-primary" : "text-neutral-500"}`}>
            <span className="material-icons">timer</span>
            <span className="text-xs mt-1">מעקב</span>
          </a>
        </Link>
        <Link href="/topics">
          <a className={`flex flex-col items-center py-2 ${location === "/topics" ? "text-primary" : "text-neutral-500"}`}>
            <span className="material-icons">folder</span>
            <span className="text-xs mt-1">נושאים</span>
          </a>
        </Link>
        <Link href="/reports">
          <a className={`flex flex-col items-center py-2 ${location === "/reports" ? "text-primary" : "text-neutral-500"}`}>
            <span className="material-icons">bar_chart</span>
            <span className="text-xs mt-1">דוחות</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
