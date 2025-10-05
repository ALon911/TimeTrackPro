import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";

interface DirectAddButtonProps {
  teamId: number;
  teamName: string;
}

const emailSchema = z.string().email({ message: "כתובת אימייל לא תקינה" });

export function DirectAddButton({ teamId, teamName }: DirectAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // וידוא תקינות האימייל
      emailSchema.parse(email);
      setEmailError("");
      
      // הוספת החבר לצוות
      setIsSubmitting(true);
      
      try {
        await apiRequest('POST', `/api/teams/${teamId}/members`, {
          email,
          role
        });
        
        toast({
          title: "חבר צוות נוסף בהצלחה",
          description: "המשתמש נוסף לצוות בהצלחה",
        });
        
        // רענון המטמון
        queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
        
        setIsOpen(false);
        setEmail("");
        setRole("member");
      } catch (err: any) {
        toast({
          title: "שגיאה בהוספת חבר צוות",
          description: err.message || "אירעה שגיאה בעת הוספת חבר הצוות",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      }
    }
  };

  return (
    <div className="mb-4 mt-4">
      <Button 
        variant="destructive" 
        className="mr-2 flex items-center"
        onClick={() => setIsOpen(true)}
        size="lg"
      >
        <UserPlus className="ml-1 h-4 w-4" />
        הוסף משתמש ישירות לצוות
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
                disabled={isSubmitting || !email}
              >
                {isSubmitting && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
                הוסף לצוות
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}