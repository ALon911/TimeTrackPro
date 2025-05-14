import { useState } from "react";
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

  const handleAddMember = async () => {
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
      
      // רענון המטמון
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
    } catch (err: any) {
      toast({
        title: "שגיאה בהוספת משתמש",
        description: err.message || "לא ניתן היה להוסיף את המשתמש לצוות",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleAddMember} 
      variant="destructive"
      disabled={isLoading}
      className="w-full mb-4"
      size="lg"
    >
      {isLoading ? (
        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="ml-2 h-5 w-5" />
      )}
      הוסף משתמש ישירות
    </Button>
  );
}