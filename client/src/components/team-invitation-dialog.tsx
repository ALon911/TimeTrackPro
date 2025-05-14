import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTeams } from "@/hooks/use-teams";
import { Loader2, UserPlus } from "lucide-react";

const invitationSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
});

interface TeamInvitationDialogProps {
  teamId: number;
  teamName: string;
}

export function TeamInvitationDialog({ teamId, teamName }: TeamInvitationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { sendInvitationMutation } = useTeams();

  const form = useForm<z.infer<typeof invitationSchema>>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: z.infer<typeof invitationSchema>) {
    sendInvitationMutation.mutate(
      { 
        teamId, 
        email: values.email 
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          form.reset();
        },
      }
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center"
        >
          <UserPlus className="ml-1 h-4 w-4" />
          הזמן חבר
        </Button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הזמן חבר לצוות</DialogTitle>
          <DialogDescription>
            שלח הזמנה בדוא"ל לחבר להצטרף לצוות "{teamName}".
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>כתובת דוא"ל</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="הזן כתובת דואר אלקטרוני" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                ביטול
              </Button>
              <Button 
                type="submit"
                disabled={sendInvitationMutation.isPending}
              >
                {sendInvitationMutation.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                שלח הזמנה
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}