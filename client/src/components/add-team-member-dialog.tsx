import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { useTeams } from "@/hooks/use-teams";
import { z } from "zod";

interface AddTeamMemberDialogProps {
  teamId: number;
  teamName: string;
  isOwner: boolean;
}

const emailSchema = z.string().email({ message: "כתובת אימייל לא תקינה" });

export function AddTeamMemberDialog({ teamId, teamName, isOwner }: AddTeamMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [emailError, setEmailError] = useState("");
  const { toast } = useToast();
  const { addMemberMutation } = useTeams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // וידוא תקינות האימייל
      emailSchema.parse(email);
      setEmailError("");
      
      // הוספת החבר לצוות
      addMemberMutation.mutate(
        { teamId, email, role },
        {
          onSuccess: () => {
            setIsOpen(false);
            setEmail("");
            setRole("member");
          }
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      }
    }
  };

  // אם המשתמש אינו בעל הצוות, לא להציג את הכפתור
  if (!isOwner) {
    return null;
  }

  return (
    <>
      <Button 
        variant="default" 
        size="sm"
        className="mr-2 flex items-center"
        onClick={() => setIsOpen(true)}
      >
        <UserPlus className="ml-1 h-4 w-4" />
        הוסף משתמש
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>הוספת חבר לצוות: {teamName}</DialogTitle>
            <DialogDescription>
              הוסף משתמש קיים במערכת ישירות לצוות
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">כתובת אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="הזן את כתובת האימייל של המשתמש שברצונך להוסיף"
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && <p className="text-sm text-red-500">{emailError}</p>}
              <p className="text-sm text-muted-foreground">
                המשתמש חייב להיות רשום כבר למערכת
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">תפקיד בצוות</Label>
              <Select value={role} onValueChange={(value: "member" | "admin") => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="בחר תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">חבר צוות</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                ביטול
              </Button>
              <Button 
                type="submit"
                disabled={addMemberMutation.isPending || !email}
              >
                {addMemberMutation.isPending && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
                הוסף לצוות
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}