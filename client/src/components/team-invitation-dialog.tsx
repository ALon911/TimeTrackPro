import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus } from "lucide-react";
import { useTeams } from "@/hooks/use-teams";
import { useToast } from "@/hooks/use-toast";

const inviteSchema = z.object({
  email: z.string().email("כתובת מייל לא תקינה"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface TeamInvitationDialogProps {
  teamId: number;
  teamName: string;
}

export function TeamInvitationDialog({ teamId, teamName }: TeamInvitationDialogProps) {
  const [open, setOpen] = useState(false);
  const { sendTeamInvitationMutation } = useTeams();
  const { toast } = useToast();
  
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
    },
  });
  
  async function onSubmit(values: InviteFormValues) {
    sendTeamInvitationMutation.mutate({
      teamId: teamId,
      email: values.email
    }, {
      onSuccess: (response) => {
        toast({
          title: "הזמנה נשלחה",
          description: `הזמנה נשלחה לכתובת ${values.email}${response.emailSent ? '.' : ', אך המייל לא נשלח בשל בעיית תצורה.'}`,
        });
        form.reset();
        setOpen(false);
      },
      onError: (error) => {
        toast({
          title: "שגיאה בשליחת ההזמנה",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  }
  
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="ml-2 h-4 w-4" />
        הזמן משתמשים
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הזמן משתמשים לצוות {teamName}</DialogTitle>
            <DialogDescription>
              שלח הזמנה למשתמשים חדשים להצטרף לצוות שלך. הם יקבלו הזמנה במייל.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>כתובת אימייל</FormLabel>
                    <FormControl>
                      <Input placeholder="הזן כתובת אימייל" {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                >
                  ביטול
                </Button>
                <Button 
                  type="submit"
                  disabled={sendTeamInvitationMutation.isPending}
                >
                  {sendTeamInvitationMutation.isPending && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  )}
                  שלח הזמנה
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}