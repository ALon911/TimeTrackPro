import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTeams } from "@/hooks/use-teams";
import { BarChart2, Loader2, Plus, Users, UserPlus, UserX, Settings } from "lucide-react";
import { TeamInvitationDialog } from "@/components/team-invitation-dialog";
import { TeamMembersDialog } from "@/components/team-members-dialog";
import { TeamSettingsDialog } from "@/components/team-settings-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// יצירת טיפוס Team המתאים לממשק ב-TeamSettingsDialogProps
interface Team {
  id: number;
  name: string;
  owner_id: number;
}

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
  
  const handleRespondToInvitation = (invitation: any, invitationId: number, action: 'accept' | 'decline') => {
    const token = invitation.token || invitationId.toString();
    
    respondToInvitationMutation.mutate(
      { token, action },
      {
        onSuccess: () => {
          toast({
            title: action === 'accept' ? "הצטרפת לצוות בהצלחה" : "ההזמנה נדחתה",
            description: action === 'accept' 
              ? `הצטרפת לצוות "${invitation.team?.name || invitation.teamName || ''}"`
              : `דחית את ההזמנה לצוות "${invitation.team?.name || invitation.teamName || ''}"`,
          });
        },
        onError: (error: Error) => {
          toast({
            title: "שגיאה בתגובה להזמנה",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
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
              
              <DialogFooter className="mt-4">
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
        <p className="text-muted-foreground">נהל את הצוותים שלך ועבוד עם אחרים</p>
      </div>
      
      {/* הזמנות צוות פתוחות */}
      <section className="border-2 border-primary/50 rounded-md p-4 mb-8 bg-primary/5">
        <h3 className="text-xl font-bold mb-4 text-primary">הזמנות ממתינות</h3>
        <div className="space-y-4">
          {isLoadingMyInvitations ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : myInvitations && myInvitations.length > 0 ? (
            myInvitations.map((invitation) => (
              <Alert 
                key={invitation.id} 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                variant="default"
              >
                <div>
                  <AlertTitle className="mb-2 font-bold">הזמנה חדשה לצוות "{invitation.team?.name || invitation.teamName || ''}"</AlertTitle>
                  <AlertDescription>
                    <p>הוזמנת להצטרף לצוות זה - אנא אשר או דחה את ההזמנה</p>
                  </AlertDescription>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRespondToInvitation(invitation, invitation.id, 'decline')}
                  >
                    <UserX className="ml-2 h-4 w-4" />
                    דחה
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRespondToInvitation(invitation, invitation.id, 'accept')}
                  >
                    <UserPlus className="ml-2 h-4 w-4" />
                    הצטרף
                  </Button>
                </div>
              </Alert>
            ))
          ) : (
            <div className="text-center p-4 bg-muted/10 rounded-md">
              <p className="text-muted-foreground">אין הזמנות חדשות</p>
            </div>
          )}
        </div>
      </section>
      
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
              <Card key={team.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>
                    {isOwner ? 'אתה המנהל של צוות זה' : 'אתה חבר בצוות זה'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="text-sm text-muted-foreground">
                    לחץ על כפתורי הניהול למטה כדי לראות את חברי הצוות או להוסיף חברים חדשים
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 bg-muted/20 p-3">
                  <div className="flex justify-between gap-2 w-full">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => setActiveTeamMembers(team.id)}
                      className="flex-1"
                    >
                      <Users className="ml-2 h-4 w-4" />
                      חברי צוות
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <a href={`/teams/${team.id}/stats`}>
                        <BarChart2 className="ml-2 h-4 w-4" />
                        סטטיסטיקות
                      </a>
                    </Button>
                  </div>
                  
                  {isOwner && (
                    <div className="flex gap-2 w-full">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTeamInvite(team.id)}
                        className="flex-1"
                      >
                        <UserPlus className="ml-2 h-4 w-4" />
                        הזמן
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTeamSettings(team.id)}
                        className="flex-1"
                      >
                        <Settings className="ml-2 h-4 w-4" />
                        הגדרות
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* דיאלוגים לניהול צוות */}
      {teams.map((teamItem) => {
        // המרת המידע שמתקבל מהשרת לטיפוס Team שנדרש לקומפוננטות
        const team: Team = {
          id: teamItem.id,
          name: teamItem.name,
          owner_id: (teamItem.owner_id || teamItem.ownerId) as number
        };
        
        return (
          <div key={`dialogs-${team.id}`}>
            {/* דיאלוג חברי צוות */}
            {activeTeamMembers === team.id && (
              <Dialog open={true} onOpenChange={(open) => setActiveTeamMembers(open ? team.id : null)}>
                <TeamMembersDialog
                  teamId={team.id} 
                  isOwner={team.owner_id === user?.id}
                  forceOwner={true}
                  isOpen={activeTeamMembers === team.id}
                  onOpenChange={(open) => setActiveTeamMembers(open ? team.id : null)}
                />
              </Dialog>
            )}
            
            {/* דיאלוג הזמנת חברים */}
            {activeTeamInvite === team.id && (
              <Dialog open={true} onOpenChange={(open) => setActiveTeamInvite(open ? team.id : null)}>
                <TeamInvitationDialog
                  teamId={team.id}
                  teamName={team.name}
                  isOpen={activeTeamInvite === team.id}
                  onOpenChange={(open) => setActiveTeamInvite(open ? team.id : null)}
                />
              </Dialog>
            )}
            
            {/* דיאלוג הגדרות צוות */}
            {activeTeamSettings === team.id && (
              <Dialog open={true} onOpenChange={(open) => setActiveTeamSettings(open ? team.id : null)}>
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
              </Dialog>
            )}
          </div>
        );
      })}
    </>
  );
}