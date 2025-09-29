import { useTeams } from "@/hooks/use-teams";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BellIcon, CheckIcon, XIcon } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export function InvitationNotification() {
  const { myInvitations, isLoadingMyInvitations, respondToInvitationMutation } = useTeams();
  const [_, setLocation] = useLocation();
  
  if (isLoadingMyInvitations) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-amber-500" />
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full mb-2" />
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Only show this component if there are pending invitations
  if (!myInvitations || myInvitations.length === 0) {
    return null;
  }
  
  // Only show the first invitation in this notification
  const invitation = myInvitations[0];
  
  const handleAction = (invitationId: number, action: 'accept' | 'decline') => {
    const invitation = myInvitations.find(inv => inv.id === invitationId);
    if (!invitation) {
      console.error('Invitation not found', invitationId);
      return;
    }
    
    // Use ID for now as a workaround
    // const token = invitation.token || invitationId.toString();
    const token = invitationId.toString();
    console.log(`Using invitation ID to respond to invitation:`, token);
    
    respondToInvitationMutation.mutate(
      { token, action },
      {
        onSuccess: () => {
          if (action === 'accept') {
            // After accepting, navigate to teams page
            setLocation('/teams');
          }
        },
        onError: (error) => {
          console.error('Error responding to invitation:', error);
        }
      }
    );
  };
  
  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 text-black dark:text-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BellIcon className="h-5 w-5 text-amber-500" />
          <span>הזמנה לצוות</span>
          {myInvitations.length > 1 && (
            <span className="bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center mr-2">
              {myInvitations.length}
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-black/70 dark:text-amber-50/70">
          יש לך {myInvitations.length === 1 ? 'הזמנה' : `${myInvitations.length} הזמנות`} לצוות
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <p className="font-medium">הוזמנת להצטרף לצוות "{invitation.teamName || invitation.team?.name || ''}"</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            className="bg-transparent hover:bg-neutral-100 dark:hover:bg-slate-700 text-black dark:text-white border-neutral-300 dark:border-slate-600"
            disabled={respondToInvitationMutation.isPending}
            onClick={() => handleAction(invitation.id, 'decline')}
          >
            <XIcon className="h-4 w-4 ml-1" />
            <span>דחה</span>
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={respondToInvitationMutation.isPending}
            onClick={() => handleAction(invitation.id, 'accept')}
          >
            <CheckIcon className="h-4 w-4 ml-1" />
            <span>הצטרף</span>
          </Button>
        </div>
        <div className="mt-3 text-sm text-right">
          <Button 
            variant="link" 
            className="p-0 h-auto text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
            onClick={() => setLocation('/teams')}
          >
            לכל ההזמנות
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}