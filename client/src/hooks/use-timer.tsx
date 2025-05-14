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
  originalDuration?: number; // משך הזמן המקורי שנקבע לטיימר
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
  
  console.log("Loading timer state:", savedState.current);
  
  // וידוא שאנחנו שומרים על סוג הטיימר (ספירה לאחור או רגיל)
  const initialCountDown = savedState.current?.isCountDown !== undefined 
    ? savedState.current.isCountDown 
    : countDown;
  
  // מנתחים את זמן הטיימר אם הוא היה פועל כאשר המשתמש עזב את האפליקציה
  const getInitialSeconds = useCallback(() => {
    if (!savedState.current) return initialSeconds;
    
    if (savedState.current.isRunning) {
      if (savedState.current.isCountDown) {
        // לטיימר ספירה לאחור, מחשבים כמה זמן נשאר
        const elapsedTime = (Date.now() - savedState.current.lastUpdated) / 1000;
        const remainingSeconds = Math.max(0, savedState.current.seconds - Math.floor(elapsedTime));
        console.log("Countdown timer - remaining seconds:", remainingSeconds);
        return remainingSeconds;
      } else {
        // לטיימר רגיל, מוסיפים את הזמן שעבר
        const elapsedTime = (Date.now() - savedState.current.lastUpdated) / 1000;
        const newSeconds = savedState.current.seconds + Math.floor(elapsedTime);
        console.log("Regular timer - new seconds:", newSeconds);
        return newSeconds;
      }
    }
    
    return savedState.current.seconds || initialSeconds;
  }, [initialSeconds]);

  const [seconds, setSeconds] = useState<number>(getInitialSeconds());
  const [isRunning, setIsRunning] = useState<boolean>(savedState.current?.isRunning || autoStart);
  const [isCompleted, setIsCompleted] = useState<boolean>(savedState.current?.isCompleted || false);
  const [isCountDown, setIsCountDown] = useState<boolean>(initialCountDown);
  const [isPaused, setIsPaused] = useState<boolean>(savedState.current?.isPaused || false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // עדכון localStorage כאשר מצב הטיימר משתנה
  useEffect(() => {
    if (isRunning || isPaused) {
      // שמירת נתוני הטיימר - מצב הטיימר ולוגיקת הספירה שלו
      const state: TimerState = {
        seconds,
        isRunning,
        isPaused,
        isCompleted,
        isCountDown,
        startTime: null,
        totalDuration: 0,
        selectedTopic: '',
        description: '',
        lastUpdated: Date.now() // זמן העדכון האחרון - חשוב לחישוב הזמן שעבר
      };
      
      console.log("Saving timer state:", state);
      saveTimerState(state);
    } else if (!isRunning && !isPaused) {
      console.log("Clearing timer state");
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

  // הוספת רפרנס לזיהוי אם הטיימר הוא כבר ספירה לאחור (למניעת התנגשויות)
  const isCountdownRef = useRef<boolean>(false);
  
  // נקה את כל הטיימרים האחרים מהלוקל סטורג'
  const cleanupAllOtherTimers = useCallback(() => {
    try {
      // לפני הפעלת טיימר חדש, מחק את כל שאר הטיימרים שיכולים לגרום לבלבול
      localStorage.removeItem('timetracker_timer');
      localStorage.removeItem('timetracker_countdown');
      
      // נקה את הלוגים כדי לוודא שאנחנו רואים רק את המידע הרלוונטי
      console.clear();
      console.log("Cleared all existing timers");
    } catch (error) {
      console.error("Error cleaning up timers:", error);
    }
  }, []);
  
  // Timer effect - הלוגיקה של הטיימר
  useEffect(() => {
    // לפני שאנחנו מפעילים טיימר חדש, צריך לנקות את כל השאר
    if (isRunning) {
      cleanupAllOtherTimers();
      
      // מזהה את סוג הטיימר שמוגדר ב-state ומדפיס לוג ברור
      const timerMode = isCountDown ? 'COUNTDOWN' : 'REGULAR';
      console.log(`=== TIMER STARTED: ${timerMode} MODE ===`);
      
      // שומרים את הסטטוס הנוכחי של הטיימר במשתנה הרפרנס
      isCountdownRef.current = isCountDown;
      
      // רק אינטרוול אחד פעיל בכל רגע נתון
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          // ספירה לאחור - חשוב! משתמשים ברפרנס ולא בסטייט למניעת בעיות
          if (isCountdownRef.current === true) {
            console.log(`COUNTDOWN: ${prevSeconds} seconds remaining`);
            
            // אם הגענו לאפס או פחות
            if (prevSeconds <= 1) {
              // מנקים את האינטרוול
              clearInterval(intervalRef.current!);
              
              // מעדכנים את הסטייט
              setIsRunning(false);
              setIsCompleted(true);
              
              // השמעת צליל סיום
              audioManager.playTimerComplete();
              
              // מנקים את הלוקל סטורג'
              localStorage.removeItem('timetracker_countdown');
              localStorage.removeItem('timetracker_timer');
              
              console.log("=== COUNTDOWN COMPLETED ===");
              return 0;
            }
            
            // המשך הספירה לאחור
            return prevSeconds - 1;
          } 
          // ספירה רגילה כלפי מעלה
          else {
            console.log(`REGULAR TIMER: ${prevSeconds} seconds elapsed`);
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
    // ראשית, לנקות את כל הטיימרים הקיימים
    cleanupAllOtherTimers();
    
    // המרת דקות לשניות
    const totalSeconds = durationInMinutes * 60;
    
    // יצירת אובייקט לשמירת המידע המקורי
    const originalDuration = totalSeconds;
    
    // עדכון המשתנים שינהלו את הלוגיקה של הטיימר
    setSeconds(totalSeconds);
    setIsCountDown(true); // חשוב לסמן שזה טיימר ספירה לאחור
    setIsCompleted(false);
    setIsRunning(true);
    
    // עדכון הרפרנס כדי לוודא שהטיימר יספור לאחור באופן עקבי
    isCountdownRef.current = true;
    
    // שמירת מידע מלא על מצב הטיימר כולל העובדה שמדובר בספירה לאחור
    try {
      console.log(`=== STARTING NEW COUNTDOWN TIMER: ${durationInMinutes} MINUTES ===`);
      
      // שמירה באחסון המקומי - שימוש באובייקט אחד ופשוט
      localStorage.setItem('timetracker_countdown', JSON.stringify({
        duration: totalSeconds, 
        originalDuration: totalSeconds,
        startTime: Date.now(),
        isCountDown: true
      }));
      
    } catch (error) {
      console.error("Error saving countdown state:", error);
    }
    
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

  const formatTime = useCallback((secondsToFormat = seconds): string => {
    if (secondsToFormat === undefined || isNaN(secondsToFormat)) {
      console.error("Invalid seconds value:", secondsToFormat);
      return "00:00:00"; // Return default format for invalid input
    }
    
    const hours = Math.floor(secondsToFormat / 3600);
    const minutes = Math.floor((secondsToFormat % 3600) / 60);
    const secs = secondsToFormat % 60;
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
