import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTeams } from "@/hooks/use-teams";
import { Loader2, Plus, Users, UserPlus, UserX, Settings, Trash2 } from "lucide-react";
import { TeamInvitationDialog } from "@/components/team-invitation-dialog";
import { TeamMembersDialog } from "@/components/team-members-dialog";
import { TeamSettingsDialog } from "@/components/team-settings-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const createTeamSchema = z.object({
  name: z.string().min(1, { message: "שם הצוות הוא שדה חובה" }),
});

export default function TeamsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    teams,
    isLoadingTeams,
    myInvitations,
    isLoadingMyInvitations,
    createTeamMutation,
    deleteTeamMutation,
    respondToInvitationMutation,
  } = useTeams();
  
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [activeTeamSettings, setActiveTeamSettings] = useState<number | null>(null);
  const [activeTeamMembers, setActiveTeamMembers] = useState<number | null>(null);
  const [activeTeamInvite, setActiveTeamInvite] = useState<number | null>(null);
  
  const form = useForm({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
    },
  });
  
  const onCreateTeam = (data: z.infer<typeof createTeamSchema>) => {
    createTeamMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateTeamOpen(false);
        form.reset();
        toast({
          title: "צוות נוצר בהצלחה",
          description: "הצוות החדש שלך נוצר בהצלחה",
          variant: "default",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "שגיאה ביצירת צוות",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };
  
  return (
    <>
      {/* דיאלוג יצירת צוות */}
      <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>צור צוות חדש</DialogTitle>
            <DialogDescription>צור צוות חדש והזמן אליו חברים</DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateTeam)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם הצוות</FormLabel>
                    <FormControl>
                      <Input placeholder="הזן את שם הצוות" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateTeamOpen(false)}
                >
                  ביטול
                </Button>
                <Button 
                  type="submit"
                  disabled={createTeamMutation.isPending}
                >
                  {createTeamMutation.isPending && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  )}
                  צור צוות
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* כותרת ראשית */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">צוותים</h2>
        <p className="text-neutral-600">נהל את הצוותים שלך ועבוד עם אחרים</p>
      </div>
      
      {/* כפתור יצירת צוות */}
      <div className="mb-6">
        <Button onClick={() => setIsCreateTeamOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          צור צוות חדש
        </Button>
      </div>

      {/* רשימת צוותים */}
      {isLoadingTeams ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center p-10 border rounded-lg bg-muted/10">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">אין צוותים</h3>
          <p className="mt-2 text-muted-foreground">
            עדיין לא יצרת או הצטרפת לצוותים כלשהם.
          </p>
          <Button className="mt-4" onClick={() => setIsCreateTeamOpen(true)}>
            <Plus className="ml-2 h-4 w-4" />
            צור צוות חדש
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {teams.map((team) => {
            const isOwner = team.owner_id === user?.id;
            
            return (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>
                    {isOwner ? 'אתה המנהל של צוות זה' : 'אתה חבר בצוות זה'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TeamMembersDialog 
                    teamId={team.id} 
                    isOwner={isOwner}
                    forceOwner={true}
                    isOpen={activeTeamMembers === team.id}
                    onOpenChange={(open) => setActiveTeamMembers(open ? team.id : null)}
                  />
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  {isOwner && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTeamInvite(team.id)}
                      >
                        <UserPlus className="ml-2 h-4 w-4" />
                        הזמן
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTeamSettings(team.id)}
                      >
                        <Settings className="ml-2 h-4 w-4" />
                        הגדרות
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setActiveTeamMembers(team.id)}
                  >
                    <Users className="ml-2 h-4 w-4" />
                    חברים
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* הזמנות צוות פתוחות */}
      {myInvitations && myInvitations.length > 0 && (
        <section className="mt-10">
          <h3 className="text-xl font-bold mb-4">הזמנות פתוחות</h3>
          <div className="space-y-4">
            <TeamInvitationsList 
              invitations={myInvitations} 
              isLoading={isLoadingMyInvitations}
              onRespond={(invitationId, token, action) => {
                const invitation = myInvitations.find(inv => inv.id === invitationId);
                if (!invitation) return;
                
                handleRespondToInvitation(invitation, invitationId, action);
              }}
            />
          </div>
        </section>
      )}
      
      {/* דיאלוגים לניהול צוות */}
      {teams.map((team) => (
        <div key={`dialogs-${team.id}`}>
          {/* דיאלוג הזמנת חברים */}
          <TeamInvitationDialog
            teamId={team.id}
            teamName={team.name}
            isOpen={activeTeamInvite === team.id}
            onOpenChange={(open) => setActiveTeamInvite(open ? team.id : null)}
          />
          
          {/* דיאלוג הגדרות צוות */}
          <TeamSettingsDialog
            team={team}
            isOpen={activeTeamSettings === team.id}
            onOpenChange={(open) => setActiveTeamSettings(open ? team.id : null)}
            onDelete={() => {
              deleteTeamMutation.mutate(team.id, {
                onSuccess: () => {
                  setActiveTeamSettings(null);
                  toast({
                    title: "הצוות נמחק בהצלחה",
                    variant: "default",
                  });
                },
              });
            }}
          />
        </div>
      ))}
    </>
  );
}

// רשימת הזמנות לצוותים
function TeamInvitationsList({ 
  invitations, 
  isLoading,
  onRespond,
}: { 
  invitations: any[]; 
  isLoading: boolean;
  onRespond: (invitationId: number, token: string, action: 'accept' | 'decline') => void;
}) {
  const handleRespondToInvitation = (invitation: any, action: 'accept' | 'decline') => {
    const invitationId = invitation.id;
    const token = invitation.token || invitationId.toString();
    
    if (invitation.token) {
      console.log('Using token to respond to invitation:', invitation.token);
      onRespond(invitationId, invitation.token, action);
    } else {
      // אם אין token, ננסה עם המזהה של ההזמנה כמחרוזת
      console.log('Using ID as token to respond to invitation:', invitationId);
      onRespond(invitationId, invitationId.toString(), action);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center p-6 border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">אין לך הזמנות פתוחות כרגע</p>
      </div>
    );
  }

  return (
    <>
      {invitations.map((invitation) => (
        <Alert key={invitation.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <AlertTitle className="mb-2">הוזמנת להצטרף לצוות "{invitation.team?.name}"</AlertTitle>
            <AlertDescription>
              {invitation.inviter ? (
                <p>הוזמנת על ידי {invitation.inviter?.email || invitation.inviter?.username}</p>
              ) : (
                <p>הוזמנת להצטרף לצוות זה</p>
              )}
            </AlertDescription>
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRespondToInvitation(invitation, 'decline')}
            >
              <UserX className="ml-2 h-4 w-4" />
              דחה
            </Button>
            <Button
              size="sm"
              onClick={() => handleRespondToInvitation(invitation, 'accept')}
            >
              <UserPlus className="ml-2 h-4 w-4" />
              הצטרף
            </Button>
          </div>
        </Alert>
      ))}
    </>
  );
}