import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, UserMinus } from "lucide-react";
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

export function TeamMembersDialog({ teamId, teamName, isOwner }: TeamMembersDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
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
        
        <div className="py-4">
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
        
        <DialogFooter>
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