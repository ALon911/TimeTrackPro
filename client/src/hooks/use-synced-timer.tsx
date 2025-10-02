import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { audioManager } from '@/lib/audio-utils';

// GLOBAL flag to prevent ANY duplicate saves across ALL instances
let GLOBAL_COMPLETION_LOCK: string | null = null;
let GLOBAL_SAVE_IN_PROGRESS = false;
let HOOK_INSTANCE_COUNT = 0;

// Debug: Track all hook instances
const DEBUG_INSTANCES = new Map<number, string>();

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
  
  // Track this hook instance
  const instanceId = useRef(++HOOK_INSTANCE_COUNT);
  const instanceIdValue = instanceId.current;
  
  useEffect(() => {
    DEBUG_INSTANCES.set(instanceIdValue, `Hook-${instanceIdValue}`);
    console.log(`🏗️ Hook instance ${instanceIdValue} created. Total instances:`, DEBUG_INSTANCES.size);
    console.log('📊 All instances:', Array.from(DEBUG_INSTANCES.values()));
    
    return () => {
      DEBUG_INSTANCES.delete(instanceIdValue);
      console.log(`🗑️ Hook instance ${instanceIdValue} destroyed. Remaining instances:`, DEBUG_INSTANCES.size);
    };
  }, [instanceIdValue]);
  
  // Timer state persistence key
  const TIMER_STATE_KEY = 'synced_timer_state';
  
  // Handle completion directly in hook
  const completionHandledRef = useRef<string | null>(null);
  const isProcessingCompletionRef = useRef<boolean>(false);
  const timerClearedRef = useRef<boolean>(false);
  const lastProcessedTimerRef = useRef<string | null>(null);
  
  // Import audio manager and toast
  const { toast } = useToast();
  
  // Mutation to save time entry directly in hook
  const createTimeEntryMutation = useMutation({
    mutationFn: async (timeEntry: any) => {
      const res = await apiRequest("POST", "/api/time-entries", timeEntry);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/most-tracked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/recent-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/topic-distribution"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly-overview"] });
    },
    onError: (error: any) => {
      console.error('❌ Failed to save time entry:', error);
    }
  });
  
  // Handle completion directly in hook
  const handleCompletionInHook = useCallback((state: SyncedTimerState) => {
    console.log('🎯 handleCompletionInHook called with state:', {
      topicId: state.topicId,
      startTime: state.startTime,
      duration: state.duration,
      isCompleted: state.isCompleted
    });
    
    if (!state.topicId || !state.startTime || !state.duration) {
      console.log('❌ Missing required fields for completion:', {
        topicId: state.topicId,
        startTime: state.startTime,
        duration: state.duration
      });
      return;
    }
    
    // Allow completion processing even if timer is about to be cleared
    console.log('🚀 handleCompletionInHook called - processing timer completion', {
      timerCleared: timerClearedRef.current
    });
    
    const timerKey = `${state.startTime}-${state.topicId}`;
    
    console.log(`🚀 [Instance ${instanceIdValue}] handleCompletionInHook CALLED with:`, {
      timerKey,
      topicId: state.topicId,
      startTime: state.startTime,
      duration: state.duration,
      isCompleted: state.isCompleted,
      description: state.description,
      isCountDown: state.isCountDown
    });
    
    console.log(`🔍 [Instance ${instanceIdValue}] GLOBAL CHECK:`, {
      timerKey,
      globalLock: GLOBAL_COMPLETION_LOCK,
      globalSaveInProgress: GLOBAL_SAVE_IN_PROGRESS,
      localHandled: completionHandledRef.current,
      localProcessing: isProcessingCompletionRef.current,
      timerCleared: timerClearedRef.current,
      totalInstances: DEBUG_INSTANCES.size,
      allInstances: Array.from(DEBUG_INSTANCES.values())
    });
    
    // GLOBAL CHECK - prevent ANY duplicate across ALL instances
    if (GLOBAL_COMPLETION_LOCK === timerKey) {
      console.log('🚫 GLOBAL: Timer already locked globally:', timerKey);
      return;
    }
    
    if (GLOBAL_SAVE_IN_PROGRESS) {
      console.log('🚫 GLOBAL: Save already in progress globally');
      return;
    }
    
    // Local checks
    if (completionHandledRef.current === timerKey) {
      console.log('🚫 LOCAL: Timer already handled locally:', timerKey);
      return;
    }
    
    if (isProcessingCompletionRef.current) {
      console.log('🚫 LOCAL: Already processing locally');
      return;
    }
    
    // LOCK GLOBALLY FIRST
    GLOBAL_COMPLETION_LOCK = timerKey;
    GLOBAL_SAVE_IN_PROGRESS = true;
    
    // Then mark locally
    completionHandledRef.current = timerKey;
    isProcessingCompletionRef.current = true;
    
    console.log(`🎯 [Instance ${instanceIdValue}] Processing timer completion ONCE:`, timerKey);
    console.log(`🔒 [Instance ${instanceIdValue}] LOCKING GLOBALLY:`, {
      timerKey,
      beforeLock: { globalLock: GLOBAL_COMPLETION_LOCK, globalSave: GLOBAL_SAVE_IN_PROGRESS },
      afterLock: { globalLock: timerKey, globalSave: true }
    });
    
    // Play completion sound
    try {
      audioManager.playTimerComplete();
      console.log('🔊 Timer completion sound triggered');
    } catch (e) {
      console.log('Audio not available:', e);
    }
    
    const endTime = new Date();
    const startTimeDate = new Date(state.startTime);
    
    // For countdown timers, use the original duration
    let calculatedDuration;
    if (state.isCountDown && state.duration) {
      calculatedDuration = state.duration;
      console.log('📊 Hook: Countdown timer - using original duration:', calculatedDuration, 'seconds');
    } else {
      calculatedDuration = Math.floor((endTime.getTime() - startTimeDate.getTime()) / 1000);
      console.log('📊 Hook: Regular timer - using elapsed time:', calculatedDuration, 'seconds');
    }
    
    // Don't save if duration is too short
    if (calculatedDuration < 1) {
      console.log('⚠️ Hook: Duration too short, not saving');
      isProcessingCompletionRef.current = false;
      return;
    }
    
    createTimeEntryMutation.mutate({
      topicId: state.topicId,
      description: state.description || null,
      startTime: startTimeDate.toISOString(),
      endTime: endTime.toISOString(),
      duration: calculatedDuration,
    }, {
      onSuccess: () => {
        console.log('✅ Hook: Save completed successfully for:', timerKey);
        
        // Release GLOBAL locks
        GLOBAL_COMPLETION_LOCK = null;
        GLOBAL_SAVE_IN_PROGRESS = false;
        
        // Release local locks
        isProcessingCompletionRef.current = false;
        
        // Clear localStorage
        localStorage.removeItem('synced_timer_state');
        localStorage.removeItem('timetracker_ui_data');
        localStorage.removeItem('timetracker_countdown');
        
        // Reset UI state immediately after successful save
        setLocalState({
          seconds: 0,
          isRunning: false,
          isPaused: false,
          isCompleted: false, // Set to false for clean reset
          isCountDown: false,
          startTime: null,
          duration: null,
          topicId: null,
          description: null
        });
        console.log('🔄 UI state reset immediately after completion');
        
        // Show toast if available
        if (toast) {
          toast({
            title: "הטיימר הסתיים!",
            description: state.isCountDown 
              ? "טיימר הספירה לאחור שלך הסתיים והזמן נשמר."
              : "הטיימר שלך הסתיים והזמן נשמר.",
          });
        }
      },
      onError: () => {
        console.log('❌ Hook: Save failed for:', timerKey);
        
        // Release GLOBAL locks on error
        GLOBAL_COMPLETION_LOCK = null;
        GLOBAL_SAVE_IN_PROGRESS = false;
        
        // Release local locks
        isProcessingCompletionRef.current = false;
        completionHandledRef.current = null; // Allow retry
      }
    });
  }, [createTimeEntryMutation, toast, instanceIdValue]);
  
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
      // Don't save completed states if timer was cleared
      if (state.isCompleted && timerClearedRef.current) {
        console.log('🚫 Not saving completed state - timer was cleared');
        return;
      }
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
  
  // Initialize state with localStorage data only once
  const [localState, setLocalState] = useState<SyncedTimerState>(() => {
    // Load saved state from localStorage, but ignore completed states
    const savedState = loadTimerState();
    
    // If saved state is completed, clear it and don't load it to prevent triggering completion handler
    if (savedState && savedState.isCompleted) {
      console.log('🧹 Found completed timer in localStorage during initialization, clearing it to prevent loop');
      clearTimerState();
      timerClearedRef.current = true;
      lastProcessedTimerRef.current = savedState.startTime ? `${savedState.startTime}-${savedState.topicId}` : null;
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
    }
    
    const initialState = savedState || {
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
    
    console.log('🔄 Initializing timer state:', initialState);
    return initialState;
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const syncErrorCountRef = useRef<number>(0);
  const maxSyncErrors = 5; // Stop syncing after 5 consecutive errors

  // Fetch active timer from server
  const { data: serverTimer, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/timer/active'],
    queryFn: async () => {
      // Don't fetch if timer is cleared locally
      if (timerClearedRef.current) {
        console.log('🚫 Skipping server fetch - timer cleared locally');
        return null;
      }
      try {
        const res = await apiRequest('GET', '/api/timer/active');
        if (!res.ok) {
          // If server returns error, don't retry aggressively
          throw new Error(`Server error: ${res.status}`);
        }
        return await res.json();
      } catch (error) {
        console.log('⚠️ Server sync failed, will retry later:', error);
        throw error;
      }
    },
    refetchInterval: autoSync && !timerClearedRef.current && syncErrorCountRef.current < maxSyncErrors ? syncInterval : false,
    refetchOnWindowFocus: false, // Reduce aggressive syncing
    refetchOnMount: true,
    retry: 2, // Limit retries
    retryDelay: 5000, // Wait 5 seconds between retries
    staleTime: 1000, // Consider data stale after 1 second
    onSuccess: () => {
      // Reset error count on successful sync
      syncErrorCountRef.current = 0;
    },
    onError: (error) => {
      syncErrorCountRef.current++;
      console.log(`🚫 Timer sync error #${syncErrorCountRef.current}:`, error);
      
      if (syncErrorCountRef.current >= maxSyncErrors) {
        console.log('⛔ Too many sync errors, stopping automatic sync');
      }
    }
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
        isCompleted: false,
        // For countdown timers, immediately set seconds to duration to prevent 00:00 flash
        seconds: data.isCountDown && data.duration ? data.duration : prev.seconds
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
    // Don't sync if we've already processed completion locally
    if (timerClearedRef.current) {
      console.log('🚫 Skipping server sync - timer already cleared locally');
      return;
    }
    
    if (serverTimer) {
      // If timer is paused, don't recalculate time - keep current state
      if (serverTimer.isPaused) {
        setLocalState(prev => {
          if (prev.isRunning !== serverTimer.isRunning || prev.isPaused !== serverTimer.isPaused) {
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
      
      // Add network latency compensation for mobile devices
      const networkLatencyBuffer = 1; // 1 second buffer for mobile network delays
      const adjustedElapsedSeconds = Math.max(0, elapsedSeconds - networkLatencyBuffer);
      
      let calculatedSeconds = 0;
      let isCompleted = false;

      if (serverTimer.duration && serverTimer.isCountDown && serverTimer.duration > 0) {
        // Countdown timer - use adjusted elapsed time to compensate for mobile latency
        calculatedSeconds = Math.max(0, serverTimer.duration - adjustedElapsedSeconds);
        isCompleted = calculatedSeconds === 0 && !localState.isCompleted; // Only set completed if not already completed
      } else if (serverTimer.isCountDown && (!serverTimer.duration || serverTimer.duration <= 0)) {
        // Invalid countdown timer - stop it
        calculatedSeconds = 0;
        isCompleted = !localState.isCompleted; // Only set completed if not already completed
      } else {
        // Regular timer - use original elapsed time for counting up
        calculatedSeconds = elapsedSeconds;
        isCompleted = false; // Regular timers don't auto-complete
      }

      // Update state from server for running timers
      setLocalState(prev => {
        // If timer is actively running locally, prioritize local time to prevent jumps
        if (prev.isRunning && !prev.isPaused && serverTimer.isRunning && !serverTimer.isPaused) {
          const timeDiff = Math.abs(prev.seconds - calculatedSeconds);
          
          // Only sync if there's a VERY significant difference (more than 5 seconds)
          // This prevents server sync from overriding smooth local countdown
          if (timeDiff > 5) {
            console.log(`⚠️ Large time difference detected (${timeDiff}s), syncing with server`);
            return {
              ...prev,
              seconds: calculatedSeconds,
              isCompleted,
              description: serverTimer.description,
              topicId: serverTimer.topicId,
              startTime: serverTimer.startTime,
              duration: serverTimer.duration,
              isCountDown: serverTimer.isCountDown
            };
          } else {
            // Keep local time but update other properties
            console.log(`🔒 Keeping local time (${prev.seconds}s) to prevent mobile sync jumps`);
            return {
              ...prev,
              description: serverTimer.description,
              topicId: serverTimer.topicId,
              startTime: serverTimer.startTime,
              duration: serverTimer.duration,
              isCountDown: serverTimer.isCountDown
            };
          }
        }
        
        // For non-running timers or state changes, sync normally
        const timeDiff = Math.abs(prev.seconds - calculatedSeconds);
        if (timeDiff > 3 || prev.isRunning !== serverTimer.isRunning || prev.isPaused !== serverTimer.isPaused) {
          return {
            ...prev,
            isRunning: serverTimer.isRunning,
            isPaused: serverTimer.isPaused,
            seconds: calculatedSeconds,
            isCompleted,
            description: serverTimer.description,
            topicId: serverTimer.topicId,
            startTime: serverTimer.startTime,
            duration: serverTimer.duration,
            isCountDown: serverTimer.isCountDown
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
    console.log('⏰ Timer tick useEffect triggered:', {
      isRunning: localState.isRunning,
      isPaused: localState.isPaused,
      isCompleted: localState.isCompleted,
      timerCleared: timerClearedRef.current,
      seconds: localState.seconds,
      shouldStartInterval: localState.isRunning && !localState.isPaused && !localState.isCompleted && !timerClearedRef.current
    });
    
    if (localState.isRunning && !localState.isPaused && !localState.isCompleted && !timerClearedRef.current) {
      console.log('🚀 Starting interval timer');
      intervalRef.current = setInterval(() => {
        setLocalState(prev => {
          // Double check that timer hasn't been cleared during interval
          if (timerClearedRef.current) {
            console.log('🚫 Timer was cleared during interval, stopping');
            return prev;
          }
          
          // Check if timer is already completed to prevent multiple completions
          if (prev.isCompleted) {
            console.log('🚫 Timer already completed, stopping interval');
            return prev;
          }
          
          let newState;
          if (prev.isCountDown && prev.duration && prev.duration > 0) {
            const newSeconds = Math.max(0, prev.seconds - 1);
            const isJustCompleted = newSeconds === 0 && !prev.isCompleted;
            
            // Handle completion directly in hook
            if (isJustCompleted) {
              const timerKey = `${prev.startTime}-${prev.topicId}`;
              
              console.log(`🎯 [Instance ${instanceIdValue}] Timer just completed! Details:`, {
                newSeconds,
                isJustCompleted,
                prevSeconds: prev.seconds,
                prevCompleted: prev.isCompleted,
                topicId: prev.topicId,
                startTime: prev.startTime,
                duration: prev.duration,
                timerKey
              });
              
              // Check if we've already processed this exact timer completion
              if (lastProcessedTimerRef.current === timerKey) {
                console.log(`🚫 [Instance ${instanceIdValue}] Timer completion already processed: ${timerKey} - early exit`);
                // Return the previous state to prevent re-render
                return prev;
              }
              
              console.log(`🎯 [Instance ${instanceIdValue}] Processing timer completion for the first time`);
              
              lastProcessedTimerRef.current = timerKey;
              
              // Clear the interval immediately to prevent further ticks
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                console.log('🛑 Cleared interval after completion');
              }
              
              // Create a completed state object for the handler (not for UI)
              const completedState = {
                ...prev,
                seconds: 0,
                isCompleted: true,
                isRunning: false,
                // Ensure all required fields are present
                topicId: prev.topicId,
                startTime: prev.startTime,
                duration: prev.duration,
                description: prev.description,
                isCountDown: prev.isCountDown
              };
              
              console.log('🔍 About to call handleCompletionInHook with state:', {
                topicId: completedState.topicId,
                startTime: completedState.startTime,
                duration: completedState.duration,
                isCompleted: completedState.isCompleted,
                description: completedState.description
              });
              
              // Handle completion FIRST, then set cleared flag
              handleCompletionInHook(completedState);
              
              // Set cleared flag AFTER completion handling to prevent server sync from overriding
              timerClearedRef.current = true;
              
              // Return state that shows 0 seconds but doesn't trigger re-completion
              newState = {
                ...prev,
                seconds: 0,
                isRunning: false,
                isCompleted: false // Don't set to true to avoid re-triggering
              };
            } else {
              newState = {
                ...prev,
                seconds: newSeconds,
                isCompleted: false,
                isRunning: newSeconds > 0
              };
            }
          } else if (prev.isCountDown && (!prev.duration || prev.duration <= 0)) {
            // Invalid countdown timer - stop it
            const isJustCompleted = !prev.isCompleted;
            newState = {
              ...prev,
              seconds: 0,
              isCompleted: isJustCompleted,
              isRunning: false
            };
            
            // Handle completion directly in hook
            if (isJustCompleted) {
              const timerKey = `${prev.startTime}-${prev.topicId}`;
              
              // Check if we've already processed this exact timer completion
              if (lastProcessedTimerRef.current === timerKey) {
                console.log(`🚫 [Instance ${instanceIdValue}] Invalid timer completion already processed: ${timerKey}`);
                // Return the previous state to prevent re-render
                return prev;
              }
              
              console.log(`🎯 [Instance ${instanceIdValue}] Invalid timer completed, handling immediately`);
              lastProcessedTimerRef.current = timerKey;
              
              // Clear the interval immediately to prevent further ticks
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                console.log('🛑 Cleared interval after invalid completion');
              }
              
              // Handle completion and immediately update UI state
              handleCompletionInHook(newState);
            }
          } else {
            const newSeconds = prev.seconds + 1;
            newState = {
              ...prev,
              seconds: newSeconds
            };
          }
          
          // Save state to localStorage (but not when completing to prevent blink)
          const shouldSave = !newState.isCompleted && newState.isRunning;
          if (shouldSave) {
            saveTimerState(newState);
          }
          return newState;
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
  }, [localState.isRunning, localState.isPaused, localState.isCompleted, localState.isCountDown, handleCompletionInHook, instanceIdValue]);

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
    // Reset completion handling for new timer
    completionHandledRef.current = null;
    isProcessingCompletionRef.current = false;
    timerClearedRef.current = false; // Reset cleared flag for new timer
    lastProcessedTimerRef.current = null; // Reset processed timer tracking
    
    // Reset GLOBAL flags for new timer
    GLOBAL_COMPLETION_LOCK = null;
    GLOBAL_SAVE_IN_PROGRESS = false;
    
    // Clear localStorage state to prevent loading old completed state
    clearTimerState();
    
    console.log('🔄 Starting new timer - reset ALL completion tracking (global + local) and cleared localStorage');
    
    // Validate countdown timer duration
    if (isCountDown && duration !== undefined && duration <= 0) {
      console.error('Countdown timer duration must be greater than 0');
      return;
    }
    
    // Update local state with fresh timer state
    const newTimerState = {
      topicId: topicId || null,
      description: description || null,
      isCompleted: false,
      isRunning: true, // Timer should be running when started!
      isPaused: false,
      seconds: isCountDown && duration ? duration * 60 : 0, // Convert minutes to seconds
      startTime: new Date().toISOString(),
      duration: isCountDown && duration ? duration * 60 : null,
      isCountDown: isCountDown
    };
    
    console.log('🎯 Setting new timer state:', {
      seconds: newTimerState.seconds,
      isRunning: newTimerState.isRunning,
      isCountDown: newTimerState.isCountDown,
      topicId: newTimerState.topicId,
      startTime: newTimerState.startTime,
      duration: newTimerState.duration
    });
    
    setLocalState(newTimerState);
    saveTimerState(newTimerState);
    
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
    // Save elapsed time before stopping if timer was running
    if (localState.isRunning && localState.startTime && localState.topicId) {
      const endTime = new Date();
      const startTimeDate = new Date(localState.startTime);
      const elapsedSeconds = Math.floor((endTime.getTime() - startTimeDate.getTime()) / 1000);
      
      // Only save if there's meaningful elapsed time (at least 1 second)
      if (elapsedSeconds >= 1) {
        console.log(`💾 Saving elapsed time before stop: ${elapsedSeconds} seconds`);
        
        createTimeEntryMutation.mutate({
          topicId: localState.topicId,
          description: localState.description || null,
          startTime: startTimeDate.toISOString(),
          endTime: endTime.toISOString(),
          duration: elapsedSeconds,
        });
      }
    }
    
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
  }, [stopTimerMutation, localState.isRunning, localState.startTime, localState.topicId, localState.description, createTimeEntryMutation]);

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
