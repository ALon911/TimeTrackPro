import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Team, InsertTeam, TeamMember, TeamInvitation } from '@shared/schema'; 
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// הוק לניהול צוותים
export function useTeams() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // קבלת רשימת הצוותים של המשתמש
  const {
    data: teams = [],
    isLoading: isLoadingTeams,
    error: teamsError,
    refetch: refetchTeams,
  } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    retry: false,
  });

  // יצירת צוות חדש
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: Omit<InsertTeam, 'ownerId'>) => {
      const response = await apiRequest('POST', '/api/teams', teamData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'צוות נוצר בהצלחה',
        description: 'הצוות החדש נוצר בהצלחה.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה ביצירת צוות',
        description: error.message || 'אירעה שגיאה ביצירת הצוות.',
        variant: 'destructive',
      });
    },
  });

  // עדכון פרטי צוות
  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Pick<InsertTeam, 'name'>> }) => {
      const response = await apiRequest('PATCH', `/api/teams/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'צוות עודכן בהצלחה',
        description: 'פרטי הצוות עודכנו בהצלחה.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בעדכון צוות',
        description: error.message || 'אירעה שגיאה בעדכון פרטי הצוות.',
        variant: 'destructive',
      });
    },
  });

  // מחיקת צוות
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      await apiRequest('DELETE', `/api/teams/${teamId}`);
    },
    onSuccess: () => {
      toast({
        title: 'צוות נמחק בהצלחה',
        description: 'הצוות נמחק בהצלחה מהמערכת.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה במחיקת צוות',
        description: error.message || 'אירעה שגיאה במחיקת הצוות.',
        variant: 'destructive',
      });
    },
  });

  // קבלת חברי צוות
  const getTeamMembers = (teamId: number) => {
    return useQuery<(TeamMember & { user: { id: number; email: string } })[]>({
      queryKey: [`/api/teams/${teamId}/members`],
      enabled: !!teamId,
    });
  };

  // הסרת חבר מצוות
  const removeTeamMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: number; userId: number }) => {
      await apiRequest('DELETE', `/api/teams/${teamId}/members/${userId}`);
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'חבר הוסר מהצוות',
        description: 'החבר הוסר מהצוות בהצלחה.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${variables.teamId}/members`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בהסרת חבר מהצוות',
        description: error.message || 'אירעה שגיאה בהסרת החבר מהצוות.',
        variant: 'destructive',
      });
    },
  });

  // עדכון תפקיד של חבר צוות
  const updateTeamMemberRoleMutation = useMutation({
    mutationFn: async ({ teamId, userId, role }: { teamId: number; userId: number; role: string }) => {
      const response = await apiRequest('PATCH', `/api/teams/${teamId}/members/${userId}`, { role });
      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'תפקיד עודכן בהצלחה',
        description: 'תפקיד החבר בצוות עודכן בהצלחה.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${variables.teamId}/members`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בעדכון תפקיד',
        description: error.message || 'אירעה שגיאה בעדכון תפקיד החבר בצוות.',
        variant: 'destructive',
      });
    },
  });

  // שליחת הזמנה לצוות
  const sendInvitationMutation = useMutation({
    mutationFn: async ({ teamId, email }: { teamId: number; email: string }) => {
      const response = await apiRequest('POST', `/api/teams/${teamId}/invitations`, { email });
      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'הזמנה נשלחה בהצלחה',
        description: `הזמנה נשלחה בהצלחה לכתובת ${variables.email}.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${variables.teamId}/invitations`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בשליחת הזמנה',
        description: error.message || 'אירעה שגיאה בשליחת ההזמנה.',
        variant: 'destructive',
      });
    },
  });

  // קבלת הזמנות לצוות
  const getTeamInvitations = (teamId: number) => {
    return useQuery<Omit<TeamInvitation, 'token'>[]>({
      queryKey: [`/api/teams/${teamId}/invitations`],
      enabled: !!teamId,
    });
  };

  // קבלת הזמנות פעילות למשתמש הנוכחי
  const {
    data: myInvitations = [],
    isLoading: isLoadingMyInvitations,
    refetch: refetchMyInvitations,
  } = useQuery<Omit<TeamInvitation, 'token'>[]>({
    queryKey: ['/api/my-invitations'],
  });

  // אישור/דחיית הזמנה
  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ token, action }: { token: string; action: 'accept' | 'decline' }) => {
      const response = await apiRequest('POST', `/api/invitations/${token}`, { action });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: 'ההזמנה טופלה בהצלחה',
        description: 'התגובה להזמנה נרשמה בהצלחה.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בטיפול בהזמנה',
        description: error.message || 'אירעה שגיאה בעיבוד תגובתך להזמנה.',
        variant: 'destructive',
      });
    },
  });

  return {
    teams,
    isLoadingTeams,
    teamsError,
    refetchTeams,
    createTeamMutation,
    updateTeamMutation,
    deleteTeamMutation,
    getTeamMembers,
    removeTeamMemberMutation,
    updateTeamMemberRoleMutation,
    sendInvitationMutation,
    getTeamInvitations,
    myInvitations,
    isLoadingMyInvitations,
    refetchMyInvitations,
    respondToInvitationMutation,
  };
}