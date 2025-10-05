import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Team {
  id: number;
  name: string;
  owner_id: number;
}

interface TeamSettingsDialogProps {
  team: Team;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

const updateTeamSchema = z.object({
  name: z.string().min(1, "שם הצוות נדרש").max(100, "שם הצוות ארוך מדי"),
});

export function TeamSettingsDialog({ team, isOpen, onOpenChange, onDelete }: TeamSettingsDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof updateTeamSchema>>({
    resolver: zodResolver(updateTeamSchema),
    defaultValues: {
      name: team.name,
    },
  });

  // עדכון ערכי ברירת המחדל בטופס כאשר הצוות משתנה
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: team.name,
      });
    }
  }, [form, team, isOpen]);

  async function onSubmit(values: z.infer<typeof updateTeamSchema>) {
    setIsUpdating(true);
    try {
      await apiRequest('PATCH', `/api/teams/${team.id}`, values);
      
      toast({
        title: "צוות עודכן בהצלחה",
        description: "הגדרות הצוות עודכנו בהצלחה",
      });
      
      // רענון המטמון
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      
      onOpenChange(false);
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

  const handleDelete = () => {
    setIsDeleteDialogOpen(false);
    onDelete();
  };

  return (
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
          
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold text-red-600 mb-2">מחיקת צוות</h3>
            <p className="text-sm text-muted-foreground mb-4">
              מחיקת צוות היא פעולה בלתי הפיכה. כל נתוני הצוות יימחקו לצמיתות.
            </p>
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button" className="w-full">
                  <Trash2 className="ml-2 h-4 w-4" />
                  מחק צוות
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                  <AlertDialogDescription>
                    פעולה זו תמחק לצמיתות את הצוות "{team.name}" וכל המידע הקשור אליו.
                    לא ניתן לשחזר את המידע לאחר המחיקה.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    מחק
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
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
  );
}