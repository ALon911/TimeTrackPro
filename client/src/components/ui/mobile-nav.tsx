import { Link, useLocation } from "wouter";

export function MobileNav() {
  const [location] = useLocation();
  
  const navItems = [
    { href: "/", label: "דף הבית", icon: "dashboard" },
    { href: "/time-tracking", label: "מעקב", icon: "timer" },
    { href: "/topics", label: "נושאים", icon: "folder" },
    { href: "/reports", label: "דוחות", icon: "bar_chart" },
  ];
  
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 z-10">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a 
              className={`flex flex-col items-center py-2 ${
                location === item.href ? "text-primary" : "text-neutral-500"
              }`}
            >
              <span className="material-icons">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </nav>
  );
}
