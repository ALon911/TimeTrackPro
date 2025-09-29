import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// טיפוסי נתונים
interface Team {
  id: number;
  name: string;
  ownerId?: number;   // השדה עשוי להגיע מהשרת כ-ownerId
  owner_id?: number;  // או כ-owner_id
  createdAt?: string;
  created_at?: string;
}

interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: string;
  joinedAt: string;
  user?: {
    id: number;
    email: string;
    username: string;
  };
}

interface TeamInvitation {
  id: number;
  teamId: number;
  email: string;
  status: string;
  token: string;
  expiresAt: string;
  team?: Team;
  teamName?: string; // שם הצוות
}

export interface TeamFormData {
  name: string;
}

// ממשק להוספת חבר ישירות
interface AddMemberData {
  teamId: number;
  email: string;
  role?: 'member' | 'admin';
}

function useTeams() {
  const { toast } = useToast();

  // שליפת רשימת הצוותים שלי
  const { 
    data: teams = [], 
    isLoading: isLoadingTeams,
    refetch: refetchTeams
  } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/teams');
        return await res.json();
      } catch (error) {
        console.error('Error fetching teams:', error);
        return [];
      }
    }
  });

  // שליפת ההזמנות הממתינות שלי
  const {
    data: myInvitations = [],
    isLoading: isLoadingMyInvitations,
    refetch: refetchMyInvitations
  } = useQuery<TeamInvitation[]>({
    queryKey: ['/api/teams/invitations/my'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/teams/invitations/my');
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('Received team invitations from API:', data);
        
        // Add teamName from team_name if needed
        return data.map((invitation: any) => ({
          ...invitation,
          teamId: invitation.teamId || invitation.team_id,
          teamName: invitation.teamName || invitation.team_name,
          invitedBy: invitation.invitedBy || invitation.invited_by,
          expiresAt: invitation.expiresAt || invitation.expires_at,
        }));
      } catch (error) {
        console.error('Error fetching my invitations:', error);
        return [];
      }
    },
    retry: false
  });

  // יצירת צוות חדש
  const createTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      const res = await apiRequest('POST', '/api/teams', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "צוות נוצר בהצלחה",
        description: "הצוות החדש נוצר בהצלחה",
      });
      refetchTeams();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה ביצירת צוות",
        description: error.message || "אירעה שגיאה בעת יצירת הצוות",
        variant: "destructive",
      });
    }
  });

  // מחיקת צוות
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      await apiRequest('DELETE', `/api/teams/${teamId}`);
    },
    onSuccess: () => {
      toast({
        title: "צוות נמחק בהצלחה",
        description: "הצוות נמחק בהצלחה מהמערכת",
      });
      refetchTeams();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה במחיקת צוות",
        description: error.message || "אירעה שגיאה בעת מחיקת הצוות",
        variant: "destructive",
      });
    }
  });

  // שליחת הזמנה לצוות
  const sendInvitationMutation = useMutation({
    mutationFn: async (data: { teamId: number; email: string }) => {
      const res = await apiRequest('POST', `/api/teams/${data.teamId}/invitations`, { email: data.email });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "הזמנה נשלחה בהצלחה",
        description: "הזמנה לצוות נשלחה בהצלחה לכתובת הדוא\"ל",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בשליחת הזמנה",
        description: error.message || "אירעה שגיאה בעת שליחת ההזמנה",
        variant: "destructive",
      });
    }
  });

  // מענה להזמנה (קבלה או דחייה)
  const respondToInvitationMutation = useMutation({
    mutationFn: async (data: { token: string; action: 'accept' | 'decline' }) => {
      console.log('Responding to invitation:', data);
      try {
        // שינוי נתיב שרת לפורמט הנכון
        const url = `/api/teams/invitations/${data.token}/${data.action}`;
        console.log(`API request to: ${url}`);
        
        // הדפסת לוגים נוספים לצורך דיבאג
        console.log('Responding to invitation details:', JSON.stringify({
          token: data.token,
          action: data.action,
          url: url
        }));
        
        // עם גוף ריק לבקשת POST
        const res = await apiRequest('POST', url, {});
        
        // בדיקת מצב התגובה
        if (!res.ok) {
          console.error(`Server responded with error ${res.status}: ${res.statusText}`);
          let errorDetails;
          try {
            errorDetails = await res.json();
          } catch (e) {
            const errorText = await res.text();
            errorDetails = errorText;
          }
          console.error('Error details:', errorDetails);
          throw new Error(`Server error: ${res.status} - ${errorDetails.error || 'Unknown error'}`);
        }
        
        const result = await res.json();
        console.log('Invitation response result:', result);
        return result;
      } catch (error) {
        console.error('Error responding to invitation:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('Invitation response success:', data);
      toast({
        title: data.message || `ההזמנה ${variables.action === 'accept' ? 'התקבלה' : 'נדחתה'} בהצלחה`,
        description: data.team 
          ? `הצטרפת לצוות "${data.team.name}" בהצלחה` 
          : undefined,
      });
      refetchMyInvitations();
      if (variables.action === 'accept') {
        refetchTeams();
      }
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בתגובה להזמנה",
        description: error.message || "אירעה שגיאה בעת מענה להזמנה",
        variant: "destructive",
      });
    }
  });

  // הוספת חבר ישירות לצוות ללא תהליך הזמנה
  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberData) => {
      const res = await apiRequest('POST', `/api/teams/${data.teamId}/members`, {
        email: data.email,
        role: data.role || 'member'
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "חבר צוות נוסף בהצלחה",
        description: "המשתמש נוסף לצוות בהצלחה",
      });
      // רענון רשימת החברים וצוותים
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בהוספת חבר צוות",
        description: error.message || "אירעה שגיאה בעת הוספת חבר הצוות",
        variant: "destructive",
      });
    }
  });

  return {
    teams,
    isLoadingTeams,
    myInvitations,
    isLoadingMyInvitations,
    createTeamMutation,
    deleteTeamMutation,
    sendInvitationMutation,
    respondToInvitationMutation,
    addMemberMutation
  };
}

export { useTeams }