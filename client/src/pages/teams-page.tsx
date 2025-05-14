import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const createTeamSchema = z.object({
  name: z.string().min(1, "שם הצוות נדרש").max(100, "שם הצוות ארוך מדי"),
});

export default function TeamsPage() {
  const { user } = useAuth();
  const { teams, isLoadingTeams, createTeamMutation, deleteTeamMutation } = useTeams();
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createTeamSchema>>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
    },
  });

  function onSubmit(values: z.infer<typeof createTeamSchema>) {
    createTeamMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateTeamOpen(false);
        form.reset();
      },
    });
  }

  function handleDeleteTeam(teamId: number) {
    if (confirm("האם אתה בטוח שברצונך למחוק צוות זה? כל החברים והנתונים המשוייכים לצוות יימחקו.")) {
      deleteTeamMutation.mutate(teamId);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex-1 p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">הצוותים שלי</h1>
          <p className="text-muted-foreground">נהל את הצוותים שלך והזמן חברים חדשים</p>
        </div>

        {/* טופס יצירת צוות */}
        <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>צור צוות חדש</DialogTitle>
              <DialogDescription>
                צור צוות חדש כדי לעקוב אחר זמנים ולשתף פעולה עם אחרים.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold">רשימת הצוותים</h2>
            <Button onClick={() => setIsCreateTeamOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              צור צוות חדש
            </Button>
          </div>
        </Dialog>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card key={team.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{team.name}</CardTitle>
                    {team.ownerId === user?.id && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    {team.ownerId === user?.id ? 'מנהל הצוות' : 'חבר צוות'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">
                    פעולות
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center"
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        // כאן נפתח חלון של חברי צוות
                      }}
                    >
                      <Users className="ml-1 h-4 w-4" />
                      חברי צוות
                    </Button>
                    
                    {team.ownerId === user?.id && (
                      <TeamInvitationDialog teamId={team.id} teamName={team.name} />
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                      onClick={() => {
                        // כאן נפתח חלון של הגדרות צוות
                      }}
                    >
                      <Settings className="ml-1 h-4 w-4" />
                      הגדרות
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* הזמנות ממתינות */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">הזמנות ממתינות</h2>
          <TeamInvitationsList />
        </div>
      </div>
    </div>
  );
}

function TeamInvitationsList() {
  const { myInvitations, isLoadingMyInvitations, respondToInvitationMutation } = useTeams();

  const handleResponse = (token: string, action: 'accept' | 'decline') => {
    respondToInvitationMutation.mutate({ token, action });
  };

  if (isLoadingMyInvitations) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (myInvitations.length === 0) {
    return (
      <div className="text-center p-6 border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">אין לך הזמנות ממתינות כרגע.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {myInvitations.map((invitation) => (
        <Card key={invitation.id}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-lg">הזמנה לצוות</h3>
                <p className="text-muted-foreground">
                  הוזמנת להצטרף לצוות.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleResponse(invitation.id.toString(), 'decline')}
                  disabled={respondToInvitationMutation.isPending}
                >
                  <UserX className="ml-2 h-4 w-4" />
                  דחה
                </Button>
                <Button 
                  onClick={() => handleResponse(invitation.id.toString(), 'accept')}
                  disabled={respondToInvitationMutation.isPending}
                >
                  <UserPlus className="ml-2 h-4 w-4" />
                  הצטרף
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}