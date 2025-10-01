import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SyncedTimerState {
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isCountDown: boolean;
  startTime: string | null;
  duration: number | null;
  topicId: number | null;
  description: string | null;
}

interface UseSyncedTimerOptions {
  autoSync?: boolean;
  syncInterval?: number;
}

interface UseSyncedTimerReturn {
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isCountDown: boolean;
  startTime: string | null;
  duration: number | null;
  topicId: number | null;
  description: string | null;
  start: (topicId?: number, description?: string, duration?: number, isCountDown?: boolean) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  formatTime: (seconds: number) => string;
  isLoading: boolean;
  error: any;
}

export function useSyncedTimer({ 
  autoSync = true, 
  syncInterval = 2000 
}: UseSyncedTimerOptions = {}): UseSyncedTimerReturn {
  const queryClient = useQueryClient();
  const [localState, setLocalState] = useState<SyncedTimerState>({
    seconds: 0,
    isRunning: false,
    isPaused: false,
    isCompleted: false,
    isCountDown: false,
    startTime: null,
    duration: null,
    topicId: null,
    description: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Fetch active timer from server
  const { data: serverTimer, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/timer/active'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/timer/active');
      return await res.json();
    },
    refetchInterval: autoSync ? syncInterval : false,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: async (data: { topicId?: number; description?: string; duration?: number; isCountDown?: boolean }) => {
      const res = await apiRequest('POST', '/api/timer/start', data);
      return await res.json();
    },
    onSuccess: (data) => {
      setLocalState(prev => ({
        ...prev,
        ...data,
        isRunning: true,
        isPaused: false,
        isCompleted: false
      }));
      queryClient.invalidateQueries({ queryKey: ['/api/timer/active'] });
    }
  });

  // Update timer mutation
  const updateTimerMutation = useMutation({
    mutationFn: async (data: { isRunning?: boolean; isPaused?: boolean; description?: string; topicId?: number }) => {
      const res = await apiRequest('PATCH', '/api/timer/update', data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data) {
        setLocalState(prev => ({ ...prev, ...data }));
      }
      queryClient.invalidateQueries({ queryKey: ['/api/timer/active'] });
    }
  });

  // Stop timer mutation
  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/timer/stop');
      return await res.json();
    },
    onSuccess: () => {
      setLocalState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        isCompleted: true,
        seconds: 0
      }));
      queryClient.invalidateQueries({ queryKey: ['/api/timer/active'] });
    }
  });

  // Sync with server data
  useEffect(() => {
    if (serverTimer) {
      const now = Date.now();
      const serverStartTime = new Date(serverTimer.startTime).getTime();
      const elapsedSeconds = Math.floor((now - serverStartTime) / 1000);
      
      let calculatedSeconds = 0;
      let isCompleted = false;

      if (serverTimer.duration && serverTimer.isCountDown && serverTimer.duration > 0) {
        // Countdown timer - only if duration is valid
        calculatedSeconds = Math.max(0, serverTimer.duration - elapsedSeconds);
        isCompleted = calculatedSeconds === 0;
      } else if (serverTimer.isCountDown && (!serverTimer.duration || serverTimer.duration <= 0)) {
        // Invalid countdown timer - stop it
        calculatedSeconds = 0;
        isCompleted = true;
      } else {
        // Regular timer
        calculatedSeconds = elapsedSeconds;
      }

      setLocalState(prev => ({
        ...prev,
        ...serverTimer,
        seconds: calculatedSeconds,
        isCompleted,
        isRunning: serverTimer.isRunning && !isCompleted
      }));
    } else {
      // No server timer, reset local state
      setLocalState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        isCompleted: false,
        seconds: 0
      }));
    }
  }, [serverTimer]);

  // Local timer tick
  useEffect(() => {
    if (localState.isRunning && !localState.isPaused && !localState.isCompleted) {
      intervalRef.current = setInterval(() => {
        setLocalState(prev => {
          if (prev.isCountDown && prev.duration && prev.duration > 0) {
            const newSeconds = Math.max(0, prev.seconds - 1);
            return {
              ...prev,
              seconds: newSeconds,
              isCompleted: newSeconds === 0,
              isRunning: newSeconds > 0
            };
          } else if (prev.isCountDown && (!prev.duration || prev.duration <= 0)) {
            // Invalid countdown timer - stop it
            return {
              ...prev,
              seconds: 0,
              isCompleted: true,
              isRunning: false
            };
          } else {
            return {
              ...prev,
              seconds: prev.seconds + 1
            };
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [localState.isRunning, localState.isPaused, localState.isCompleted, localState.isCountDown]);

  // Auto-sync with server
  useEffect(() => {
    if (autoSync && localState.isRunning && !localState.isPaused) {
      const now = Date.now();
      if (now - lastSyncRef.current > syncInterval) {
        refetch();
        lastSyncRef.current = now;
      }
    }
  }, [autoSync, localState.isRunning, localState.isPaused, syncInterval, refetch]);

  const start = useCallback((topicId?: number, description?: string, duration?: number, isCountDown = false) => {
    // Validate countdown timer duration
    if (isCountDown && duration !== undefined && duration <= 0) {
      console.error('Countdown timer duration must be greater than 0');
      return;
    }
    
    startTimerMutation.mutate({
      topicId,
      description,
      duration,
      isCountDown
    });
  }, [startTimerMutation]);

  const pause = useCallback(() => {
    updateTimerMutation.mutate({
      isRunning: false,
      isPaused: true
    });
  }, [updateTimerMutation]);

  const resume = useCallback(() => {
    updateTimerMutation.mutate({
      isRunning: true,
      isPaused: false
    });
  }, [updateTimerMutation]);

  const stop = useCallback(() => {
    stopTimerMutation.mutate();
  }, [stopTimerMutation]);

  const reset = useCallback(() => {
    stopTimerMutation.mutate();
  }, [stopTimerMutation]);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }, []);

  return {
    seconds: localState.seconds,
    isRunning: localState.isRunning,
    isPaused: localState.isPaused,
    isCompleted: localState.isCompleted,
    isCountDown: localState.isCountDown,
    startTime: localState.startTime,
    duration: localState.duration,
    topicId: localState.topicId,
    description: localState.description,
    start,
    pause,
    resume,
    stop,
    reset,
    formatTime,
    isLoading: isLoading || startTimerMutation.isPending || updateTimerMutation.isPending || stopTimerMutation.isPending,
    error: error || startTimerMutation.error || updateTimerMutation.error || stopTimerMutation.error
  };
}
