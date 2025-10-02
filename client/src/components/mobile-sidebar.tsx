import { Link, useLocation } from "wouter";
import { 
  Home, 
  Clock, 
  FolderClosed, 
  BarChart, 
  Settings, 
  Users, 
  LogOut,
  Lightbulb
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTeams } from "@/hooks/use-teams";
import { Badge } from "@/components/ui/badge";

interface MobileSidebarProps {
  onClose?: () => void;
}

export function MobileSidebar({ onClose }: MobileSidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { myInvitations } = useTeams();
  
  const handleLogout = () => {
    logoutMutation.mutate();
    if (onClose) onClose();
  };
  
  const pendingInvitations = myInvitations?.filter(
    invite => invite.status === 'PENDING'
  ).length || 0;
  
  const menuItems = [
    { 
      href: "/", 
      label: "לוח מחוונים", 
      icon: <Home className="h-5 w-5 ml-3" /> 
    },
    { 
      href: "/time-entries", 
      label: "מעקב זמן", 
      icon: <Clock className="h-5 w-5 ml-3" /> 
    },
    { 
      href: "/topics", 
      label: "נושאים", 
      icon: <FolderClosed className="h-5 w-5 ml-3" /> 
    },
    { 
      href: "/suggestions", 
      label: "הצעות AI", 
      icon: <Lightbulb className="h-5 w-5 ml-3" /> 
    },
    { 
      href: "/reports", 
      label: "דוחות", 
      icon: <BarChart className="h-5 w-5 ml-3" /> 
    },
    { 
      href: "/teams", 
      label: "צוותים", 
      icon: <Users className="h-5 w-5 ml-3" />, 
      badge: pendingInvitations > 0 ? pendingInvitations : undefined 
    },
    { 
      href: "/settings", 
      label: "הגדרות", 
      icon: <Settings className="h-5 w-5 ml-3" /> 
    },
  ];
  
  return (
    <div className="h-full flex flex-col" dir="rtl">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-3 bg-primary text-primary-foreground">
            <AvatarFallback>
              {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'מ'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{user?.displayName || user?.username || 'משתמש'}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 pt-4">
        <ul>
          {menuItems.map((item) => (
            <li key={item.href} className="mb-1 px-2">
              <Link href={item.href}>
                <div
                  className={`flex items-center px-4 py-3 rounded-md font-medium ${
                    location === item.href 
                      ? "text-primary bg-primary/10 dark:bg-primary/20" 
                      : "text-foreground hover:bg-muted"
                  }`}
                  onClick={onClose}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="mr-auto">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 ml-2" />
          <span>התנתק</span>
        </Button>
      </div>
    </div>
  );
}