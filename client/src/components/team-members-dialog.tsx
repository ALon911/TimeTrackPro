import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, UserPlus, UserMinus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface TeamMembersDialogProps {
  teamId: number;
  teamName: string;
  isOwner: boolean;
}

interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: string;
  joinedAt: string;
  user?: {
    id: number;
    email: string;
    username?: string;
  };
}

export function TeamMembersDialog({ teamId, teamName, isOwner = false }: TeamMembersDialogProps) {
  // Force isOwner to true for debugging
  const forceOwner = true;
  console.log("TeamMembersDialog rendering with isOwner:", isOwner, "teamId:", teamId, "forceOwner:", forceOwner);
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [email, setEmail] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // פונקציה לטעינת חברי הצוות
  const loadMembers = async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    try {
      const res = await apiRequest('GET', `/api/teams/${teamId}/members`);
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast({
        title: "שגיאה בטעינת חברי צוות",
        description: "לא ניתן היה לטעון את רשימת חברי הצוות",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // טעינת חברי הצוות בעת פתיחת החלון
  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, teamId]);

  // פונקציה להסרת חבר צוות
  const removeMember = async (memberId: number, userIdToRemove: number) => {
    if (!isOwner || user?.id === userIdToRemove) return;
    
    setIsRemoving(true);
    try {
      await apiRequest('DELETE', `/api/teams/${teamId}/members/${userIdToRemove}`);
      toast({
        title: "חבר הוסר בהצלחה",
        description: "חבר הצוות הוסר בהצלחה",
      });
      // עדכון רשימת החברים המקומית
      setMembers(members.filter(m => m.id !== memberId));
      // רענון המטמון
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: "שגיאה בהסרת חבר",
        description: "לא ניתן היה להסיר את חבר הצוות",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  // פונקציה להוספת הזמנה לחבר צוות
  const addMemberDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsAddingMember(true);
    try {
      // שליחת הזמנה במקום הוספה ישירה
      await apiRequest('POST', `/api/teams/${teamId}/invitations`, {
        email,
        role: "member"
      });
      
      toast({
        title: "הזמנה נשלחה בהצלחה",
        description: `הזמנה נשלחה למשתמש ${email} להצטרף לצוות`,
      });
      
      // ניקוי השדה
      setEmail("");
      
      // רענון הרשימה
      loadMembers();
      
      // רענון המטמון
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/invitations'] });
    } catch (err: any) {
      toast({
        title: "שגיאה בשליחת הזמנה",
        description: err.message || "אירעה שגיאה בעת שליחת ההזמנה",
        variant: "destructive",
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center"
        >
          <Users className="ml-1 h-4 w-4" />
          חברי צוות
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>חברי צוות: {teamName}</DialogTitle>
          <DialogDescription>
            רשימת החברים בצוות זה
          </DialogDescription>
        </DialogHeader>
        
        {isOwner && (
          <div className="border p-4 rounded-lg bg-slate-50 dark:bg-slate-900 mb-6">
            <h3 className="text-lg font-semibold mb-3">הוספת משתמש ישירות</h3>
            <form onSubmit={addMemberDirectly} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">כתובת אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="הזן את כתובת האימייל של המשתמש"
                />
                <p className="text-xs text-muted-foreground">
                  המשתמש חייב להיות רשום כבר במערכת
                </p>
              </div>
              <Button 
                type="submit"
                className="w-full"
                variant="destructive"
                disabled={isAddingMember || !email}
              >
                {isAddingMember && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
                <UserPlus className="ml-1 h-4 w-4" />
                הוסף משתמש ישירות
              </Button>
            </form>
          </div>
        )}
        
        {/* הסרנו את הבלוק הכפול להוספת משתמשים */}
        
        <div className="py-4">
          <h3 className="text-lg font-semibold mb-3">חברי הצוות</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              אין חברים בצוות זה
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <div className="font-medium">
                      {member.user?.email || 'משתמש לא ידוע'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.role === 'owner' ? 'מנהל צוות' : 'חבר צוות'}
                    </div>
                  </div>
                  
                  {isOwner && member.role !== 'owner' && member.user?.id !== user?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMember(member.id, member.userId)}
                      disabled={isRemoving}
                    >
                      {isRemoving && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
                      <UserMinus className="ml-1 h-4 w-4 text-red-500" />
                      הסר
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col gap-4">
          {(isOwner || forceOwner) && (
            <div className="w-full p-4 border-2 border-dashed border-red-500 rounded-lg bg-red-50 dark:bg-red-950">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-3">שליחת הזמנה למשתמש</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const emailInput = e.currentTarget.querySelector('input');
                if (!emailInput) return;
                
                const email = emailInput.value;
                if (!email) return;
                
                setIsAddingMember(true);
                fetch(`/api/teams/${teamId}/invitations`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    email,
                    role: "member"
                  }),
                })
                .then(response => {
                  if (response.ok) {
                    toast({
                      title: "הזמנה נשלחה בהצלחה",
                      description: `הזמנה נשלחה למשתמש ${email} להצטרף לצוות`,
                    });
                    emailInput.value = '';
                    loadMembers();
                    // רענון המטמון
                    queryClient.invalidateQueries({ queryKey: ['/api/teams/invitations'] });
                  } else {
                    toast({
                      title: "שגיאה בשליחת הזמנה",
                      description: "לא ניתן היה לשלוח את ההזמנה",
                      variant: "destructive",
                    });
                  }
                  setIsAddingMember(false);
                })
                .catch(err => {
                  toast({
                    title: "שגיאה בשליחת הזמנה",
                    description: err.message,
                    variant: "destructive",
                  });
                  setIsAddingMember(false);
                });
              }}>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="email"
                    placeholder="הזן אימייל של משתמש קיים"
                    className="flex-1"
                    dir="ltr"
                  />
                  <Button 
                    type="submit"
                    variant="destructive"
                    disabled={isAddingMember}
                    className="whitespace-nowrap"
                  >
                    {isAddingMember && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    הוסף משתמש
                  </Button>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  שים לב: המשתמש יתווסף ישירות לצוות ללא תהליך אישור
                </p>
              </form>
            </div>
          )}
          
          <Button 
            type="button" 
            onClick={() => setIsOpen(false)}
          >
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}