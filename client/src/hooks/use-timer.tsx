import { useState, useEffect, useRef, useCallback } from 'react';
import { audioManager } from '@/lib/audio-utils';

interface UseTimerOptions {
  initialSeconds?: number;
  autoStart?: boolean;
  countDown?: boolean;
}

interface UseTimerReturn {
  seconds: number;
  setSeconds: React.Dispatch<React.SetStateAction<number>>;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  startWithDuration: (durationInMinutes: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  formatTime: () => string;
  isCompleted: boolean;
}

interface TimerState {
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isCountDown: boolean;
  startTime: string | null;
  totalDuration: number;
  selectedTopic: string;
  description: string;
  lastUpdated: number;
}

// מפתחות לשמירה ב-localStorage
const TIMER_STATE_KEY = 'timetracker_timer_state';

// פונקציה לטעינת מצב טיימר מה-localStorage
const loadTimerState = (): TimerState | null => {
  try {
    const savedState = localStorage.getItem(TIMER_STATE_KEY);
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (error) {
    console.error('Error loading timer state:', error);
  }
  return null;
};

// פונקציה לשמירת מצב הטיימר ב-localStorage
const saveTimerState = (state: TimerState): void => {
  try {
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving timer state:', error);
  }
};

// פונקציה למחיקת מצב הטיימר מה-localStorage
const clearTimerState = (): void => {
  try {
    localStorage.removeItem(TIMER_STATE_KEY);
  } catch (error) {
    console.error('Error clearing timer state:', error);
  }
};

export function useTimer({ initialSeconds = 0, autoStart = false, countDown = false }: UseTimerOptions = {}): UseTimerReturn {
  // נטען את מצב הטיימר מה-localStorage אם הוא קיים
  const savedState = useRef<TimerState | null>(loadTimerState());
  
  // מנתחים את זמן הטיימר אם הוא היה פועל כאשר המשתמש עזב את האפליקציה
  const getInitialSeconds = useCallback(() => {
    if (savedState.current && savedState.current.isRunning) {
      if (savedState.current.isCountDown) {
        // לטיימר ספירה לאחור, מחשבים כמה זמן נשאר
        const elapsedTime = (Date.now() - savedState.current.lastUpdated) / 1000;
        const remainingSeconds = Math.max(0, savedState.current.seconds - Math.floor(elapsedTime));
        return remainingSeconds;
      } else {
        // לטיימר רגיל, מוסיפים את הזמן שעבר
        const elapsedTime = (Date.now() - savedState.current.lastUpdated) / 1000;
        return savedState.current.seconds + Math.floor(elapsedTime);
      }
    }
    return savedState.current?.seconds || initialSeconds;
  }, [initialSeconds]);

  const [seconds, setSeconds] = useState<number>(getInitialSeconds());
  const [isRunning, setIsRunning] = useState<boolean>(savedState.current?.isRunning || autoStart);
  const [isCompleted, setIsCompleted] = useState<boolean>(savedState.current?.isCompleted || false);
  const [isCountDown, setIsCountDown] = useState<boolean>(savedState.current?.isCountDown || countDown);
  const [isPaused, setIsPaused] = useState<boolean>(savedState.current?.isPaused || false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // עדכון localStorage כאשר מצב הטיימר משתנה
  useEffect(() => {
    if (isRunning || isPaused) {
      const state: TimerState = {
        seconds,
        isRunning,
        isPaused,
        isCompleted,
        isCountDown,
        startTime: null, // יעודכן על ידי קומפוננטת TimeTracker
        totalDuration: 0,  // יעודכן על ידי קומפוננטת TimeTracker
        selectedTopic: '', // יעודכן על ידי קומפוננטת TimeTracker
        description: '',   // יעודכן על ידי קומפוננטת TimeTracker
        lastUpdated: Date.now()
      };
      saveTimerState(state);
    } else if (!isRunning && !isPaused) {
      clearTimerState();
    }
  }, [seconds, isRunning, isPaused, isCompleted, isCountDown]);
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          if (isCountDown) {
            // If countdown and reached zero
            if (prevSeconds <= 1) {
              setIsRunning(false);
              setIsCompleted(true);
              // השמעת צליל סיום
              audioManager.playTimerComplete();
              return 0;
            }
            return prevSeconds - 1;
          } else {
            // Regular timer counting up
            return prevSeconds + 1;
          }
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isCountDown]);

  const start = useCallback((): void => {
    setIsCountDown(false); // Default mode is counting up
    setIsCompleted(false);
    setIsRunning(true);
  }, []);

  const startWithDuration = useCallback((durationInMinutes: number): void => {
    // Convert minutes to seconds
    const totalSeconds = durationInMinutes * 60;
    setSeconds(totalSeconds);
    setIsCountDown(true);
    setIsCompleted(false);
    setIsRunning(true);
    // השמעת צליל התחלה
    audioManager.playTimerStart();
  }, []);

  const pause = useCallback((): void => {
    if (isRunning) {
      setIsRunning(false);
      setIsPaused(true);
    }
  }, [isRunning]);
  
  const resume = useCallback((): void => {
    if (isPaused) {
      setIsRunning(true);
      setIsPaused(false);
      
      // עדכון הזמן האחרון לשימוש בחישוב הזמן בעתיד
      const state = loadTimerState();
      if (state) {
        saveTimerState({
          ...state,
          isRunning: true,
          isPaused: false,
          lastUpdated: Date.now()
        });
      }
    }
  }, [isPaused]);
  
  const stop = useCallback((): void => {
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false);
    // מוחקים את המידע מהזיכרון המקומי
    clearTimerState();
  }, []);

  const reset = useCallback((): void => {
    setIsRunning(false);
    setIsCompleted(false);
    setSeconds(0);
    // מוחקים את המידע מהזיכרון המקומי
    clearTimerState();
  }, []);

  const formatTime = useCallback((): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [seconds]);

  return { 
    seconds, 
    setSeconds,
    isRunning,
    isPaused,
    start, 
    startWithDuration, 
    stop,
    pause,
    resume,
    reset, 
    formatTime,
    isCompleted 
  };
}
