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

export function useTeams() {
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
        return data;
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
      const res = await apiRequest('POST', `/api/teams/invitations/${data.token}/${data.action}`);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      const action = variables.action === 'accept' ? 'התקבלה' : 'נדחתה';
      toast({
        title: `הזמנה ${action} בהצלחה`,
        description: variables.action === 'accept' 
          ? "הצטרפת לצוות בהצלחה" 
          : "ההזמנה נדחתה",
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