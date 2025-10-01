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
  
  // Timer state persistence key
  const TIMER_STATE_KEY = 'synced_timer_state';
  
  // Load timer state from localStorage
  const loadTimerState = (): SyncedTimerState | null => {
    try {
      const saved = localStorage.getItem(TIMER_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('🔄 Loaded timer state from localStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
    return null;
  };
  
  // Save timer state to localStorage
  const saveTimerState = (state: SyncedTimerState): void => {
    try {
      localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
      console.log('💾 Saved timer state to localStorage:', state);
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  };
  
  // Clear timer state from localStorage
  const clearTimerState = (): void => {
    try {
      localStorage.removeItem(TIMER_STATE_KEY);
      console.log('🗑️ Cleared timer state from localStorage');
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  };
  
  // Load saved state from localStorage
  const savedState = loadTimerState();
  
  const [localState, setLocalState] = useState<SyncedTimerState>(savedState || {
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
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
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
    },
    onError: (error) => {
      console.error('❌ Timer start failed:', error);
      // Keep local state as is on start failure
    }
  });

  // Update timer mutation
  const updateTimerMutation = useMutation({
    mutationFn: async (data: { isRunning?: boolean; isPaused?: boolean; description?: string; topicId?: number }) => {
      const res = await apiRequest('PATCH', '/api/timer/update', data);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
    onSuccess: (data) => {
      if (data) {
        setLocalState(prev => ({ 
          ...prev, 
          isRunning: data.isRunning ?? prev.isRunning,
          isPaused: data.isPaused ?? prev.isPaused
        }));
      }
      queryClient.invalidateQueries({ queryKey: ['/api/timer/active'] });
    },
    onError: (error) => {
      console.error('❌ Timer update failed:', error);
      // Revert local state on error
      setLocalState(prev => ({
        ...prev,
        isRunning: !prev.isRunning, // Revert the state change
        isPaused: !prev.isPaused
      }));
    }
  });

  // Stop timer mutation
  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/timer/stop');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
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
    },
    onError: (error) => {
      console.error('❌ Timer stop failed:', error);
      // Revert local state on error
      setLocalState(prev => ({
        ...prev,
        isRunning: true, // Revert to running state
        isPaused: false,
        isCompleted: false
      }));
    }
  });

  // Sync with server data (hybrid approach)
  useEffect(() => {
    if (serverTimer) {
      // If timer is paused, don't recalculate time - keep current state
      if (serverTimer.isPaused) {
        setLocalState(prev => {
          if (prev.isRunning !== serverTimer.isRunning || prev.isPaused !== serverTimer.isPaused) {
            console.log('🔄 Updating paused timer state from server:', { 
              prev: { isRunning: prev.isRunning, isPaused: prev.isPaused }, 
              server: { isRunning: serverTimer.isRunning, isPaused: serverTimer.isPaused }
            });
            return {
              ...prev,
              isRunning: serverTimer.isRunning,
              isPaused: serverTimer.isPaused,
              description: serverTimer.description,
              topicId: serverTimer.topicId,
              startTime: serverTimer.startTime
            };
          }
          return prev; // No change needed
        });
        return;
      }

      // For running timers, use server time for sync across devices
      const now = Date.now();
      const serverStartTime = new Date(serverTimer.startTime).getTime();
      const elapsedSeconds = Math.floor((now - serverStartTime) / 1000);
      
      let calculatedSeconds = 0;
      let isCompleted = false;

      if (serverTimer.duration && serverTimer.isCountDown && serverTimer.duration > 0) {
        // Countdown timer - use server calculation for sync
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

      // Update state from server for running timers
      setLocalState(prev => {
        const timeDiff = Math.abs(prev.seconds - calculatedSeconds);
        
        // Only update if there's a significant difference (more than 2 seconds)
        // This prevents constant updates from network delays
        if (timeDiff > 2 || prev.isRunning !== serverTimer.isRunning || prev.isPaused !== serverTimer.isPaused) {
          console.log('🔄 Syncing timer from server:', {
            prev: prev.seconds,
            server: calculatedSeconds,
            diff: timeDiff
          });
          
          return {
            ...prev,
            isRunning: serverTimer.isRunning,
            isPaused: serverTimer.isPaused,
            seconds: calculatedSeconds,
            isCompleted,
            description: serverTimer.description,
            topicId: serverTimer.topicId,
            startTime: serverTimer.startTime
          };
        }
        
        return prev;
      });
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
    console.log('⏰ Local timer tick effect triggered:', { 
      isRunning: localState.isRunning, 
      isPaused: localState.isPaused, 
      isCompleted: localState.isCompleted 
    });
    
    if (localState.isRunning && !localState.isPaused && !localState.isCompleted) {
      console.log('▶️ Starting local timer interval');
      intervalRef.current = setInterval(() => {
        setLocalState(prev => {
          console.log('⏱️ Local timer tick, prev state:', prev);
          let newState;
          if (prev.isCountDown && prev.duration && prev.duration > 0) {
            const newSeconds = Math.max(0, prev.seconds - 1);
            console.log('⏰ Countdown tick:', { prev: prev.seconds, new: newSeconds });
            newState = {
              ...prev,
              seconds: newSeconds,
              isCompleted: newSeconds === 0,
              isRunning: newSeconds > 0
            };
          } else if (prev.isCountDown && (!prev.duration || prev.duration <= 0)) {
            // Invalid countdown timer - stop it
            console.log('❌ Invalid countdown timer, stopping');
            newState = {
              ...prev,
              seconds: 0,
              isCompleted: true,
              isRunning: false
            };
          } else {
            const newSeconds = prev.seconds + 1;
            console.log('⏰ Regular timer tick:', { prev: prev.seconds, new: newSeconds });
            newState = {
              ...prev,
              seconds: newSeconds
            };
          }
          
          // Save state to localStorage
          saveTimerState(newState);
          return newState;
        });
      }, 1000);
    } else {
      console.log('⏸️ Stopping local timer interval');
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

  // Auto-sync with server (less frequent to avoid conflicts)
  useEffect(() => {
    if (autoSync && localState.isRunning && !localState.isPaused) {
      const now = Date.now();
      if (now - lastSyncRef.current > syncInterval * 2) { // Sync less frequently
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
    
    // Update local state with description
    setLocalState(prev => ({
      ...prev,
      topicId: topicId || null,
      description: description || null
    }));
    
    startTimerMutation.mutate({
      topicId,
      description,
      duration,
      isCountDown
    });
  }, [startTimerMutation]);

  const pause = useCallback(() => {
    console.log('⏸️ Pause function called, current state:', { isRunning: localState.isRunning, isPaused: localState.isPaused });
    
    // Immediately update local state to stop the timer
    setLocalState(prev => {
      const newState = {
        ...prev,
        isRunning: false,
        isPaused: true
      };
      saveTimerState(newState);
      return newState;
    });
    
    // Clear the interval immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    updateTimerMutation.mutate({
      isRunning: false,
      isPaused: true
    });
  }, [updateTimerMutation, localState.isRunning, localState.isPaused]);

  const resume = useCallback(() => {
    console.log('▶️ Resume function called, current state:', { isRunning: localState.isRunning, isPaused: localState.isPaused });
    
    // Immediately update local state to resume the timer
    setLocalState(prev => {
      const newState = {
        ...prev,
        isRunning: true,
        isPaused: false
      };
      saveTimerState(newState);
      return newState;
    });
    
    updateTimerMutation.mutate({
      isRunning: true,
      isPaused: false
    });
  }, [updateTimerMutation, localState.isRunning, localState.isPaused]);

  const stop = useCallback(() => {
    // Immediately update local state to stop the timer
    setLocalState(prev => {
      const newState = {
        ...prev,
        isRunning: false,
        isPaused: false,
        isCompleted: true,
        seconds: 0
      };
      saveTimerState(newState);
      return newState;
    });
    
    // Clear the interval immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    stopTimerMutation.mutate();
  }, [stopTimerMutation]);

  const reset = useCallback(() => {
    // Immediately update local state to reset the timer
    setLocalState(prev => {
      const newState = {
        ...prev,
        isRunning: false,
        isPaused: false,
        isCompleted: false,
        seconds: 0
      };
      saveTimerState(newState);
      return newState;
    });
    
    // Clear the interval immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
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
    updateTimerMutation,
    isLoading: isLoading,
    isStarting: startTimerMutation.isPending,
    isUpdating: updateTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    error: error || startTimerMutation.error || updateTimerMutation.error || stopTimerMutation.error
  };
}
