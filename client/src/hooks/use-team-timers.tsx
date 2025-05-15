import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ActiveTimer } from "@shared/schema";

interface ShareTimerData {
  topicId: number;
  topicName: string;
  topicColor: string;
  description?: string;
  startTime: string;
  estimatedEndTime?: string | null;
  isPaused?: boolean;
  pausedAt?: string | null;
  duration?: number | null;
}

function useTeamTimers(teamId?: string | number) {
  const { toast } = useToast();
  
  // Get active timers for a team
  const {
    data: activeTimers = [],
    isLoading: isLoadingTimers,
    refetch: refetchTimers
  } = useQuery<ActiveTimer[]>({
    queryKey: ['/api/teams/active-timers', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      try {
        const res = await apiRequest('GET', `/api/teams/${teamId}/active-timers`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching team active timers:', error);
        return [];
      }
    },
    enabled: !!teamId,
    refetchInterval: 10000, // Poll every 10 seconds for updates
  });
  
  // Share timer with team
  const shareTimerMutation = useMutation({
    mutationFn: async (data: ShareTimerData) => {
      const res = await apiRequest('POST', '/api/teams/share-timer', data);
      return await res.json();
    },
    onSuccess: () => {
      // No toast needed here as updates will happen silently
      refetchTimers();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בשיתוף טיימר",
        description: error.message || "לא ניתן היה לשתף את הטיימר עם הצוות",
        variant: "destructive",
      });
    }
  });
  
  // Stop sharing timer
  const stopSharingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/teams/stop-share-timer');
      return await res.json();
    },
    onSuccess: () => {
      // No toast needed here as updates will happen silently
      refetchTimers();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בהפסקת שיתוף",
        description: error.message || "לא ניתן היה להפסיק את שיתוף הטיימר",
        variant: "destructive",
      });
    }
  });
  
  // Format user-friendly time
  const formatTimeLeft = (timer: ActiveTimer): string => {
    if (!timer || timer.isPaused) {
      return "מושהה";
    }
    
    // If we have an estimated end time
    if (timer.estimatedEndTime) {
      const now = new Date();
      const endTime = new Date(timer.estimatedEndTime);
      const timeLeft = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
      
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // If we don't have an estimated end time but have duration
    if (timer.duration) {
      const minutes = Math.floor(timer.duration / 60);
      const seconds = timer.duration % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // If we only have a start time
    const startTime = new Date(timer.startTime);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return {
    activeTimers,
    isLoadingTimers,
    refetchTimers,
    shareTimerMutation,
    stopSharingMutation,
    formatTimeLeft,
  };
}

export { useTeamTimers, type ShareTimerData }