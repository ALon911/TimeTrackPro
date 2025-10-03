import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TimerState {
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

interface UseSimpleTimerReturn {
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

export function useSimpleTimer(): UseSimpleTimerReturn {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial state from localStorage
  const loadStateFromStorage = (): TimerState => {
    try {
      const saved = localStorage.getItem('simple-timer-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('🔄 Loaded timer state from localStorage:', parsed);
        return parsed;
      }
    } catch (e) {
      console.log('❌ Failed to load timer state from localStorage:', e);
    }
    return {
      seconds: 0,
      isRunning: false,
      isPaused: false,
      isCompleted: false,
      isCountDown: false,
      startTime: null,
      duration: null,
      topicId: null,
      description: null
    };
  };

  const [state, setState] = useState<TimerState>(loadStateFromStorage);

  // Save state to localStorage
  const saveStateToStorage = useCallback((newState: TimerState) => {
    try {
      localStorage.setItem('simple-timer-state', JSON.stringify(newState));
      console.log('💾 Saved timer state to localStorage:', newState);
    } catch (e) {
      console.log('❌ Failed to save timer state to localStorage:', e);
    }
  }, []);

  // Update state and save to localStorage
  const updateState = useCallback((newState: TimerState | ((prev: TimerState) => TimerState)) => {
    setState(prev => {
      const updated = typeof newState === 'function' ? newState(prev) : newState;
      saveStateToStorage(updated);
      return updated;
    });
  }, [saveStateToStorage]);

  // Save time entry mutation
  const saveTimeEntryMutation = useMutation({
    mutationFn: async (timeEntry: any) => {
      console.log('💾 Saving time entry:', timeEntry);
      const res = await apiRequest("POST", "/api/time-entries", timeEntry);
      return await res.json();
    },
    onSuccess: () => {
      console.log('✅ Time entry saved successfully');
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/most-tracked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/recent-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/topic-distribution"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly-overview"] });
      
      if (toast) {
        toast({
          title: "הטיימר הסתיים!",
          description: "הזמן נשמר בהצלחה.",
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ Failed to save time entry:', error);
      if (toast) {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לשמור את הזמן. נסה שוב.",
          variant: "destructive"
        });
      }
    }
  });

  // Play completion sound
  const playCompletionSound = useCallback(() => {
    try {
      import('@/lib/audio-utils').then(({ audioManager }) => {
        audioManager.playTimerComplete();
        console.log('🔊 Timer completion sound played');
      }).catch((e) => {
        console.log('Audio not available:', e);
      });
    } catch (e) {
      console.log('Audio import failed:', e);
    }
  }, []);

  // Save elapsed time
  const saveElapsedTime = useCallback((currentState: TimerState, isNaturalCompletion = false) => {
    if (!currentState.topicId || !currentState.startTime) {
      console.log('❌ Cannot save - missing topicId or startTime');
      return;
    }

    const endTime = new Date();
    const startTimeDate = new Date(currentState.startTime);
    let duration: number;

    if (currentState.isCountDown && currentState.duration && isNaturalCompletion) {
      // For countdown timers that completed naturally, use the full duration
      duration = currentState.duration;
      console.log('📊 Countdown timer completed naturally - using full duration:', duration, 'seconds');
    } else {
      // For manual stops or regular timers, calculate actual elapsed time
      duration = Math.floor((endTime.getTime() - startTimeDate.getTime()) / 1000);
      console.log('📊 Timer stopped manually or regular timer - calculated elapsed time:', duration, 'seconds');
    }

    // Only save if there's meaningful time (at least 1 second)
    if (duration >= 1) {
      saveTimeEntryMutation.mutate({
        topicId: currentState.topicId,
        description: currentState.description || null,
        startTime: startTimeDate.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
      });
    } else {
      console.log('⚠️ Duration too short, not saving');
    }
  }, [saveTimeEntryMutation]);

  // Timer tick effect
  useEffect(() => {
    if (state.isRunning && !state.isPaused && !state.isCompleted) {
      console.log('🚀 Starting timer interval');
      intervalRef.current = setInterval(() => {
        updateState(prev => {
          if (prev.isCountDown && prev.duration && prev.duration > 0) {
            // Countdown timer
            const newSeconds = Math.max(0, prev.seconds - 1);
            const isJustCompleted = newSeconds === 0 && !prev.isCompleted;
            
            console.log(`⏰ Countdown: ${prev.seconds} → ${newSeconds}`);
            
            if (isJustCompleted) {
              console.log('🎯 Timer completed naturally!');
              
              // Clear interval
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              
              // Save time and play sound (natural completion)
              saveElapsedTime(prev, true);
              playCompletionSound();
              
              // Clear localStorage after completion
              try {
                localStorage.removeItem('simple-timer-state');
                console.log('🗑️ Cleared timer state from localStorage after completion');
              } catch (e) {
                console.log('❌ Failed to clear timer state from localStorage:', e);
              }
              
              return {
                ...prev,
                seconds: 0,
                isRunning: false,
                isCompleted: true
              };
            }
            
            return {
              ...prev,
              seconds: newSeconds
            };
          } else {
            // Regular timer (count up)
            const newSeconds = prev.seconds + 1;
            console.log(`⏰ Count up: ${prev.seconds} → ${newSeconds}`);
            
            return {
              ...prev,
              seconds: newSeconds
            };
          }
        });
      }, 1000);
    } else {
      // Clear interval when not running
      if (intervalRef.current) {
        console.log('🛑 Clearing timer interval');
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
  }, [state.isRunning, state.isPaused, state.isCompleted, saveElapsedTime, playCompletionSound, updateState]);

  // Restore timer state when component mounts
  useEffect(() => {
    const savedState = loadStateFromStorage();
    if (savedState.isRunning && !savedState.isCompleted) {
      console.log('🔄 Restoring running timer from localStorage:', savedState);
      
      // Calculate elapsed time since last save
      if (savedState.startTime) {
        const now = new Date();
        const startTime = new Date(savedState.startTime);
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        
        if (savedState.isCountDown && savedState.duration) {
          // For countdown, subtract elapsed time
          const newSeconds = Math.max(0, savedState.duration - elapsedSeconds);
          console.log(`⏰ Countdown restored: ${savedState.seconds} → ${newSeconds} (elapsed: ${elapsedSeconds})`);
          
          if (newSeconds <= 0) {
            // Timer should have completed while away
            console.log('🎯 Timer completed while away!');
            saveElapsedTime(savedState, true);
            playCompletionSound();
            
            // Clear localStorage
            try {
              localStorage.removeItem('simple-timer-state');
              console.log('🗑️ Cleared timer state from localStorage after completion');
            } catch (e) {
              console.log('❌ Failed to clear timer state from localStorage:', e);
            }
            
            updateState({
              ...savedState,
              seconds: 0,
              isRunning: false,
              isCompleted: true
            });
            return;
          }
          
          updateState({
            ...savedState,
            seconds: newSeconds
          });
        } else {
          // For regular timer, add elapsed time
          const newSeconds = savedState.seconds + elapsedSeconds;
          console.log(`⏰ Count up restored: ${savedState.seconds} → ${newSeconds} (elapsed: ${elapsedSeconds})`);
          
          updateState({
            ...savedState,
            seconds: newSeconds
          });
        }
      }
    }
  }, []); // Only run once on mount

  const start = useCallback((topicId?: number, description?: string, duration?: number, isCountDown = false) => {
    console.log('🚀 Starting timer:', { topicId, description, duration, isCountDown });
    
    const startTime = new Date().toISOString();
    // Duration is already in seconds from the component
    const seconds = isCountDown && duration ? duration : 0;
    
    updateState({
      seconds,
      isRunning: true,
      isPaused: false,
      isCompleted: false,
      isCountDown,
      startTime,
      duration: isCountDown && duration ? duration : null,
      topicId: topicId || null,
      description: description || null
    });
  }, [updateState]);

  const pause = useCallback(() => {
    console.log('⏸️ Pausing timer');
    updateState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: true
    }));
  }, [updateState]);

  const resume = useCallback(() => {
    console.log('▶️ Resuming timer');
    updateState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false
    }));
  }, [updateState]);

  const stop = useCallback(() => {
    console.log('🛑 Stopping timer manually');
    
    // Save elapsed time before stopping (manual stop)
    saveElapsedTime(state, false);
    
    updateState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      isCompleted: true,
      seconds: 0
    }));
  }, [state, saveElapsedTime, updateState]);

  const reset = useCallback(() => {
    console.log('🔄 Resetting timer');
    // Clear localStorage when resetting
    try {
      localStorage.removeItem('simple-timer-state');
      console.log('🗑️ Cleared timer state from localStorage');
    } catch (e) {
      console.log('❌ Failed to clear timer state from localStorage:', e);
    }
    
    updateState({
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
  }, [updateState]);

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
    seconds: state.seconds,
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    isCompleted: state.isCompleted,
    isCountDown: state.isCountDown,
    startTime: state.startTime,
    duration: state.duration,
    topicId: state.topicId,
    description: state.description,
    start,
    pause,
    resume,
    stop,
    reset,
    formatTime,
    isLoading: saveTimeEntryMutation.isPending,
    error: saveTimeEntryMutation.error
  };
}
