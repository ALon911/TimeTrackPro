import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, UserPlus, UserMinus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface TeamMembersDialogProps {
  teamId: number;
  isOwner: boolean;
  forceOwner?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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

export function TeamMembersDialog({ 
  teamId, 
  isOwner = false, 
  forceOwner = false,
  isOpen,
  onOpenChange
}: TeamMembersDialogProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamName, setTeamName] = useState<string>("");
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
      // טעינת פרטי הצוות
      const teamRes = await apiRequest('GET', `/api/teams/${teamId}`);
      const teamData = await teamRes.json();
      if (teamData && teamData.name) {
        setTeamName(teamData.name);
      }
      
      // טעינת חברי הצוות
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
    if ((!isOwner && !forceOwner) || user?.id === userIdToRemove) return;
    
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

  // פונקציה לשליחת הזמנה לחבר צוות חדש
  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsAddingMember(true);
    try {
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
      
      // רענון המטמון
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

  const canManageMembers = isOwner || forceOwner;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>חברי צוות{teamName ? `: ${teamName}` : ""}</DialogTitle>
        <DialogDescription>
          רשימת החברים בצוות זה
        </DialogDescription>
      </DialogHeader>
      
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
                
                {canManageMembers && member.role !== 'owner' && member.user?.id !== user?.id && (
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
      
      {canManageMembers && (
        <div className="mb-4 p-4 border rounded-lg bg-slate-50">
          <h3 className="text-lg font-semibold mb-3">הזמן משתמש חדש</h3>
          <form onSubmit={sendInvitation}>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="דוגמה@דואל.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                dir="ltr"
              />
              <Button 
                type="submit"
                disabled={isAddingMember || !email}
              >
                {isAddingMember && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                <UserPlus className="ml-2 h-4 w-4" />
                הזמן
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              משתמשים יקבלו הזמנה דרך המייל ויצטרפו לצוות רק לאחר אישור
            </p>
          </form>
        </div>
      )}
      
      <DialogFooter>
        <Button 
          type="button" 
          onClick={() => onOpenChange(false)}
        >
          סגור
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}