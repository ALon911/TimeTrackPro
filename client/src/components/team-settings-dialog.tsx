import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TeamSettingsDialogProps {
  teamId: number;
  teamName: string;
}

const updateTeamSchema = z.object({
  name: z.string().min(1, "שם הצוות נדרש").max(100, "שם הצוות ארוך מדי"),
});

export function TeamSettingsDialog({ teamId, teamName }: TeamSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof updateTeamSchema>>({
    resolver: zodResolver(updateTeamSchema),
    defaultValues: {
      name: teamName,
    },
  });

  async function onSubmit(values: z.infer<typeof updateTeamSchema>) {
    setIsUpdating(true);
    try {
      await apiRequest('PATCH', `/api/teams/${teamId}`, values);
      
      toast({
        title: "צוות עודכן בהצלחה",
        description: "הגדרות הצוות עודכנו בהצלחה",
      });
      
      // רענון המטמון
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: "שגיאה בעדכון צוות",
        description: "לא ניתן היה לעדכן את הצוות",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center"
        >
          <Settings className="ml-1 h-4 w-4" />
          הגדרות
        </Button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הגדרות צוות</DialogTitle>
          <DialogDescription>
            עדכן את הגדרות הצוות
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
                onClick={() => setIsOpen(false)}
              >
                ביטול
              </Button>
              <Button 
                type="submit"
                disabled={isUpdating}
              >
                {isUpdating && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                שמור שינויים
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}