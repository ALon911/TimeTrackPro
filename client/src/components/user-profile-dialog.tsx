import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { LogOut, User, LifeBuoy, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface UserProfileDialogProps {
  children: React.ReactNode;
}

export function UserProfileDialog({ children }: UserProfileDialogProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setOpen(false);
      toast({
        title: "התנתקת בהצלחה",
        description: "מקווים לראותך שוב בקרוב",
      });
    } catch (error) {
      toast({
        title: "שגיאה בהתנתקות",
        description: "נא לנסות שוב מאוחר יותר",
        variant: "destructive",
      });
    }
  };
  
  const navigateTo = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>פרופיל משתמש</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center mb-4">
          <Avatar className="h-16 w-16 mb-2 bg-primary text-primary-foreground">
            <AvatarFallback className="text-xl">{user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'מ'}</AvatarFallback>
          </Avatar>
          <h3 className="font-medium text-lg">{user?.displayName || user?.username || 'משתמש'}</h3>
          <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            className="justify-start" 
            onClick={() => navigateTo("/settings")}
          >
            <User className="mr-2 h-4 w-4" />
            הגדרות פרופיל
          </Button>

          <Button 
            variant="outline" 
            className="justify-start" 
            onClick={() => navigateTo("/settings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            הגדרות מערכת
          </Button>

          <Button variant="destructive" onClick={handleLogout} disabled={logoutMutation.isPending}>
            <LogOut className="mr-2 h-4 w-4" />
            {logoutMutation.isPending ? 'מתנתק...' : 'התנתק'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}