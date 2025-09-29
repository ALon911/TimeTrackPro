import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AddDirectMemberButtonProps {
  teamId: number;
}

export function AddDirectMemberButton({ teamId }: AddDirectMemberButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // בדיקת רינדור
  useEffect(() => {
    console.log("AddDirectMemberButton is rendering for teamId:", teamId);
  }, [teamId]);

  const handleAddMember = async () => {
    console.log("Button clicked for teamId:", teamId);
    alert("Opening prompt to add member to team " + teamId);
    
    const email = prompt("הזן אימייל של משתמש קיים להוספה ישירות לצוות:");
    if (!email) return;

    setIsLoading(true);
    try {
      await apiRequest('POST', `/api/teams/${teamId}/members`, {
        email,
        role: "member"
      });
      
      toast({
        title: "משתמש נוסף בהצלחה",
        description: `המשתמש ${email} התווסף לצוות בהצלחה`,
      });
      
      alert("User added successfully: " + email);
      
      // רענון המטמון
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
    } catch (err: any) {
      toast({
        title: "שגיאה בהוספת משתמש",
        description: err.message || "לא ניתן היה להוסיף את המשתמש לצוות",
        variant: "destructive",
      });
      alert("Error adding user: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleAddMember} 
      variant="destructive"
      disabled={isLoading}
      className="w-full mb-4 text-xl font-bold py-8" // הגדלנו את הפונט ואת הגובה
      size="lg"
    >
      {isLoading ? (
        <Loader2 className="ml-2 h-6 w-6 animate-spin" />
      ) : (
        <UserPlus className="ml-2 h-6 w-6" />
      )}
      הוסף משתמש ישירות למערכת
    </Button>
  );
}