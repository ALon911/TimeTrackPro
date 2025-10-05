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

  // רפרנס למשך הזמן המקורי שהוגדר לטיימר
  const originalDurationRef = useRef<number>(0);
  
  // רפרנס לזמן ההתחלה של הטיימר
  const startTimeRef = useRef<number>(0);
  
  // רפרנס לשמירת הנושא הנבחר
  const selectedTopicRef = useRef<string>('');
  
  // נקה את כל הטיימרים האחרים מהלוקל סטורג'
  const cleanupAllOtherTimers = useCallback(() => {
    try {
      // לפני הפעלת טיימר חדש, מחק את כל שאר הטיימרים שיכולים לגרום לבלבול
      localStorage.removeItem('timetracker_timer');
      localStorage.removeItem('timetracker_countdown');
      localStorage.removeItem('timetracker_ui');
      
      // נקה את הלוגים כדי לוודא שאנחנו רואים רק את המידע הרלוונטי
      console.clear();
      console.log(">>> נוקו כל הטיימרים הקיימים");
    } catch (error) {
      console.error("שגיאה בניקוי הטיימרים:", error);
    }
  }, []);
  
  // Timer effect - הלוגיקה של הטיימר קאונטדאון בלבד
  // בדיקה אם יש טיימר פעיל בלוקל סטורג' בעת הטעינה
  useEffect(() => {
    try {
      // בדיקה אם יש טיימר ישיר פעיל
      const directTimer = localStorage.getItem('timetracker_direct_timer');
      
      if (directTimer) {
        // פענוח הנתונים
        const data = JSON.parse(directTimer);
        console.log(">>> נמצא טיימר ישיר שמור:", data);
        
        if (data.isRunning) {
          // חישוב כמה זמן נשאר
          const elapsedMs = Date.now() - data.startTime;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          const remainingSeconds = Math.max(0, data.duration - elapsedSeconds);
          
          console.log(`>>> טיימר ישיר - חלפו ${elapsedSeconds} שניות, נותרו ${remainingSeconds} שניות`);
          
          if (remainingSeconds > 0) {
            // שחזור מצב הטיימר ברפרנסים
            originalDurationRef.current = data.duration;
            startTimeRef.current = data.startTime;
            
            // עדכון המצב של הטיימר
            setSeconds(remainingSeconds);
            setIsRunning(true);
            setIsPaused(false);
            setIsCompleted(false);
            setIsCountDown(true);
            
            console.log(">>> הטיימר הישיר שוחזר בהצלחה");
            return; // יוצאים אם מצאנו טיימר ישיר פעיל
          } else {
            // הטיימר כבר הסתיים
            console.log(">>> הטיימר הישיר שהיה שמור כבר הסתיים");
            localStorage.removeItem('timetracker_direct_timer');
          }
        }
      }
      
      // אם לא מצאנו טיימר ישיר פעיל, ננסה לבדוק את הטיימר הישן
      const savedCountdown = localStorage.getItem('timetracker_countdown');
      
      if (savedCountdown) {
        // פענוח הנתונים
        const data = JSON.parse(savedCountdown);
        console.log(">>> נמצא טיימר שמור ישן:", data);
        
        // שחזור מצב הטיימר
        originalDurationRef.current = data.duration;
        startTimeRef.current = data.startTime;
        
        // חישוב כמה זמן נשאר
        const elapsedMs = Date.now() - data.startTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const remainingSeconds = Math.max(0, data.duration - elapsedSeconds);
        
        console.log(`>>> טיימר שמור ישן - חלפו ${elapsedSeconds} שניות, נותרו ${remainingSeconds} שניות`);
        
        if (remainingSeconds > 0) {
          // עדכון המצב של הטיימר
          setSeconds(remainingSeconds);
          setIsRunning(true);
          setIsPaused(false);
          setIsCompleted(false);
          setIsCountDown(true);
          
          console.log(">>> הטיימר הישן שוחזר בהצלחה");
        } else {
          // הטיימר כבר הסתיים
          console.log(">>> הטיימר הישן שהיה שמור כבר הסתיים");
          localStorage.removeItem('timetracker_countdown');
        }
      }
    } catch (error) {
      console.error(">>> שגיאה בטעינת טיימר שמור:", error);
    }
  }, []);
  
  useEffect(() => {
    // נבדוק אם קיים טיימר ישיר לפני הכל
    const checkDirectTimer = () => {
      try {
        const savedTimer = localStorage.getItem('timetracker_direct_timer');
        
        if (!savedTimer) return false;
        
        const timerData = JSON.parse(savedTimer);
        if (!timerData.isRunning) return false;
        
        const startTimeTs = timerData.startTime;
        const duration = timerData.duration;
        const now = Date.now();
        
        // חישוב כמה זמן עבר
        const elapsedSeconds = Math.floor((now - startTimeTs) / 1000);
        
        // חישוב כמה זמן נשאר
        const remainingSeconds = Math.max(0, duration - elapsedSeconds);
        
        if (remainingSeconds <= 0) {
          // הטיימר הסתיים כבר
          localStorage.removeItem('timetracker_direct_timer');
          return false;
        }
        
        // עדכון המצב של הטיימר
        console.log(`>>> נמצא טיימר ישיר: נותרו ${remainingSeconds} שניות`);
        originalDurationRef.current = duration;
        startTimeRef.current = startTimeTs;
        
        // עדכון הסטייט עם הזמן הנותר
        setSeconds(remainingSeconds);
        setIsRunning(true);
        setIsCompleted(false);
        setIsCountDown(true);
        
        return true;
      } catch (error) {
        console.error(">>> שגיאה בבדיקת טיימר ישיר:", error);
        return false;
      }
    };
    
    // רק אם הטיימר פעיל וזה טיימר ספירה לאחור
    if (isRunning && isCountDown) {
      console.log(`>>> טיימר ספירה לאחור פעיל - ${seconds} שניות`);
      
      // בדיקה חוזרת של הטיימר הישיר
      checkDirectTimer();
      
      // וידוא שיש זמן התחלה תקף
      if (startTimeRef.current === 0) {
        startTimeRef.current = Date.now();
        console.log(`>>> נקבע זמן התחלה חדש: ${new Date(startTimeRef.current).toLocaleTimeString()}`);
      }
      
      // רק אינטרוול אחד פעיל בכל רגע נתון
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // הפעלת אינטרוול חדש
      intervalRef.current = setInterval(() => {
        // קודם כל בודקים שוב את הטיימר הישיר
        if (!checkDirectTimer()) {
          // אם אין טיימר ישיר, משתמשים ברפרנסים
          if (startTimeRef.current > 0 && originalDurationRef.current > 0) {
            // חישוב כמה זמן עבר מאז תחילת הטיימר
            const elapsedMs = Date.now() - startTimeRef.current;
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            
            // חישוב כמה זמן נשאר בטיימר
            const remainingSeconds = Math.max(0, originalDurationRef.current - elapsedSeconds);
            
            console.log(`>>> נותרו ${remainingSeconds} שניות בטיימר`);
            
            // עדכון הסטייט עם הזמן הנותר
            setSeconds(remainingSeconds);
            
            // אם הטיימר הסתיים
            if (remainingSeconds <= 0) {
              finishTimer();
            }
          } else {
            console.warn(">>> אין נתוני טיימר תקפים");
            finishTimer();
          }
        }
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
  
  // פונקציה לסיום הטיימר
  const finishTimer = () => {
    // ניקוי האינטרוול
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // עדכון הסטייט
    setIsRunning(false);
    setIsCompleted(true);
    setSeconds(0);
    
    // השמעת צליל סיום
    audioManager.playTimerComplete();
    
    // ניקוי הלוקל סטורג'
    localStorage.removeItem('timetracker_countdown');
    localStorage.removeItem('timetracker_timer');
    localStorage.removeItem('timetracker_direct_timer');
    
    console.log(">>> הטיימר הסתיים!");
  };

  const start = useCallback((): void => {
    setIsCountDown(false); // Default mode is counting up
    setIsCompleted(false);
    setIsRunning(true);
  }, []);

  const startWithDuration = useCallback((durationInMinutes: number): void => {
    // זה המקום הקריטי - כאן אנחנו מגדירים טיימר חדש
    
    // ראשית, לנקות את כל הטיימרים הקיימים ולאפס את המצב
    cleanupAllOtherTimers();
    
    // המרת דקות לשניות
    const totalSeconds = durationInMinutes * 60;
    
    // ניקוי ואיפוס כל הרפרנסים
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // שמירת המשך המקורי ברפרנס 
    originalDurationRef.current = totalSeconds;
    
    // שמירת זמן ההתחלה
    startTimeRef.current = Date.now();
    
    // שמירת נתוני הטיימר
    // אם אנחנו בסביבת דפדפן בלבד, מתאים לניהול הנושא מה-DOM
    let currentTopic = '';
    try {
      const topicSelect = document.querySelector('select[name="topic"]') as HTMLSelectElement;
      if (topicSelect) {
        currentTopic = topicSelect.value;
      }
    } catch (e) {
      console.error(">>> שגיאה בקריאת ערך הנושא:", e);
    }
    
    selectedTopicRef.current = currentTopic;
    
    // עדכון המשתנים שינהלו את הלוגיקה של הטיימר
    setSeconds(totalSeconds);
    setIsCountDown(true); // חשוב לסמן שזה טיימר ספירה לאחור
    setIsCompleted(false);
    setIsRunning(true);
    
    console.log(`>>> מתחיל טיימר ספירה לאחור: ${durationInMinutes} דקות (${totalSeconds} שניות)`);
    console.log(`>>> זמן התחלה: ${new Date().toLocaleTimeString()}`);
    
    // שמירה במקום אחד - מידע מינימלי
    // הנתונים החשובים ביותר לשמירת הטיימר בין ניווטים בדפים
    const persistentTimerData = {
      duration: totalSeconds,    // אורך הטיימר בשניות
      startTime: Date.now(),     // זמן ההתחלה המקורי - קריטי לחישוב מדויק
      selectedTopic: currentTopic, // שמירת הנושא
      originalTime: totalSeconds  // שמירת הזמן המקורי
    };
    
    // שמירה בלוקל סטורג' - זה המפתח העיקרי שנשמר בין דפים
    localStorage.setItem('timetracker_countdown', JSON.stringify(persistentTimerData));
    console.log(">>> נשמרו נתוני טיימר למעבר בין דפים:", persistentTimerData);
    
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
