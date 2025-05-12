import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  return (
    <aside className="hidden md:flex md:w-64 bg-white shadow-md flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">TimeTracker</h1>
        </div>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
        <ul>
          <li className="mb-1">
            <Link href="/">
              <a className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
                location === "/" 
                  ? "text-primary bg-blue-50" 
                  : "text-neutral-600 hover:bg-neutral-100"
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
                  ? "text-primary bg-blue-50" 
                  : "text-neutral-600 hover:bg-neutral-100"
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
                  ? "text-primary bg-blue-50" 
                  : "text-neutral-600 hover:bg-neutral-100"
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
                  ? "text-primary bg-blue-50" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}>
                <span className="material-icons ml-3">bar_chart</span>
                <span>דוחות</span>
              </a>
            </Link>
          </li>
          <li className="mb-1">
            <Link href="/settings">
              <a className={`flex items-center px-4 py-3 font-medium rounded-md mx-2 ${
                location === "/settings" 
                  ? "text-primary bg-blue-50" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}>
                <span className="material-icons ml-3">settings</span>
                <span>הגדרות</span>
              </a>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
              <span className="text-lg font-medium">{user?.username?.charAt(0) || 'מ'}</span>
            </div>
            <div className="mr-3">
              <div className="font-medium text-neutral-800">{user?.username || 'משתמש'}</div>
              <div className="text-sm text-neutral-500">{user?.email || ''}</div>
            </div>
          </div>
          <Link href="/settings">
            <a className="p-1 rounded-full hover:bg-neutral-100">
              <span className="material-icons">settings</span>
            </a>
          </Link>
        </div>
      </div>
    </aside>
  );
}
