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
  
  // Timer effect - הלוגיקה של הטיימר
  useEffect(() => {
    if (isRunning) {
      // מזהה את סוג הטיימר שמוגדר ב-state
      console.log(`Timer running in ${isCountDown ? 'countdown' : 'count-up'} mode`);
      
      // שומרים את הסטטוס הנוכחי של הטיימר במשתנה הרפרנס
      isCountdownRef.current = isCountDown;
      
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          // ספירה לאחור - חשוב! אנחנו משתמשים ברפרנס במקום בסטייט למניעת בעיות רנדור
          if (isCountdownRef.current) {
            console.log(`Countdown timer: ${prevSeconds} seconds remaining`);
            
            // אם הגענו לאפס או פחות
            if (prevSeconds <= 1) {
              setIsRunning(false);
              setIsCompleted(true);
              clearInterval(intervalRef.current!);
              // השמעת צליל סיום
              audioManager.playTimerComplete();
              
              // נשמור בלוקל סטורג' שהטיימר הסתיים
              localStorage.removeItem('timetracker_countdown');
              localStorage.removeItem('timetracker_timer');
              
              return 0;
            }
            
            // המשך ספירה לאחור
            return prevSeconds - 1;
          } 
          // ספירה רגילה כלפי מעלה
          else {
            console.log(`Regular timer: ${prevSeconds} seconds elapsed`);
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
    
    // עדכון המשתנים שינהלו את הלוגיקה של הטיימר
    setSeconds(totalSeconds);
    setIsCountDown(true); // חשוב לסמן שזה טיימר ספירה לאחור
    setIsCompleted(false);
    setIsRunning(true);
    
    // עדכון הרפרנס כדי לוודא שהטיימר יספור לאחור באופן עקבי
    isCountdownRef.current = true;
    
    // שמירת משך הזמן המקורי של הטיימר
    originalDurationRef.current = totalSeconds;
    
    // שמירת מידע מלא על מצב הטיימר כולל העובדה שמדובר בספירה לאחור
    try {
      // מחיקת כל מצבי הטיימר הישנים מ-localStorage לפני השמירה
      localStorage.removeItem('timetracker_timer');
      localStorage.removeItem('timetracker_ui');
      localStorage.removeItem('timetracker_countdown');
      
      // יצירת אובייקט עם נתוני הטיימר
      const timerState: TimerState = {
        seconds: totalSeconds,
        isRunning: true,
        isPaused: false,
        isCompleted: false,
        isCountDown: true,
        originalDuration: totalSeconds, // שמירת הזמן המקורי חשובה לחישובים
        startTime: null,
        totalDuration: 0,
        selectedTopic: selectedTopic, // שמירת הנושא הנוכחי
        description: description, // שמירת התיאור הנוכחי
        lastUpdated: Date.now()
      };
      
      console.log("Starting countdown timer with duration:", durationInMinutes, "minutes");
      console.log("Saving countdown timer state:", timerState);
      
      // שמירה מיידית של המצב ב-localStorage
      saveTimerState(timerState);
      
      // שמירה במפתח חדש וייעודי לטיימרים של ספירה לאחור עם מידע מדויק
      localStorage.setItem('timetracker_countdown', JSON.stringify({
        duration: totalSeconds,
        originalDuration: totalSeconds,
        startTime: Date.now(),
        isCountDown: true,
        selectedTopic: selectedTopic 
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
