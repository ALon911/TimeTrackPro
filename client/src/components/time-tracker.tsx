import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { PlayIcon, PauseIcon, TimerIcon, Clock5Icon, BellIcon, XIcon, Share2Icon } from 'lucide-react';
import { audioManager } from "@/lib/audio-utils";
import { useTeamTimers, ShareTimerData } from '@/hooks/use-team-timers';

export function TimeTracker() {
  const { data: topics, isLoading } = useQuery({ 
    queryKey: ['/api/topics'] 
  });
  
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [customMinutes, setCustomMinutes] = useState<number>(0);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  
  // טיימר מבוסס סטייט פשוט במקום hook מורכב
  const [seconds, setSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  
  // רפרנסים חשובים
  const timerRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  
  const { toast } = useToast();
  
  // Team timer sharing functionality
  const { shareTimerMutation, stopSharingMutation } = useTeamTimers();
  
  // פונקציה לפרמוט זמן
  const formatTime = useCallback(() => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [seconds]);
  
  // פונקציה להתחלת הטיימר עם משך זמן
  const startWithDuration = useCallback((minutes: number) => {
    // קודם כל, נקה כל טיימר קודם
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // נקה את המצב הקודם
    setIsCompleted(false);
    
    // המר דקות לשניות
    const durationInSeconds = minutes * 60;
    
    // חשב את זמן הסיום
    const endTime = Date.now() + (durationInSeconds * 1000);
    endTimeRef.current = endTime;
    
    // שמור את זמן הסיום ומשך הזמן בלוקל סטורג' 
    localStorage.setItem('timer_end_time', endTime.toString());
    localStorage.setItem('timer_duration', durationInSeconds.toString());
    localStorage.setItem('timer_is_paused', 'false');
    localStorage.setItem('timer_topic_id', selectedTopic);
    localStorage.setItem('timer_description', description || '');
    
    // עדכן את הסטייט
    setSeconds(durationInSeconds);
    setIsRunning(true);
    setIsPaused(false);
    
    // שמור את זמן ההתחלה
    const startTimeNow = new Date();
    setStartTime(startTimeNow);
    
    // שתף את הטיימר עם הצוות אם שיתוף מופעל
    if (isSharing && selectedTopic) {
      const selectedTopicObj = topics?.find(t => t.id.toString() === selectedTopic);
      if (selectedTopicObj) {
        const endTimeISO = new Date(endTime).toISOString();
        shareTimerMutation.mutate({
          topicId: selectedTopicObj.id,
          topicName: selectedTopicObj.name,
          topicColor: selectedTopicObj.color,
          description: description || '',
          startTime: startTimeNow.toISOString(),
          estimatedEndTime: endTimeISO,
          isPaused: false,
          pausedAt: null,
          duration: durationInSeconds,
        });
      }
    }
    
    // התחל את האינטרוול
    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, Math.floor((endTimeRef.current! - now) / 1000));
      
      // עדכן את הזמן שנותר
      setSeconds(timeLeft);
      
      // אם הזמן נגמר
      if (timeLeft <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setIsRunning(false);
        setIsCompleted(true);
        
        // נקה את המידע השמור
        localStorage.removeItem('timer_end_time');
        localStorage.removeItem('timer_duration');
        localStorage.removeItem('timer_is_paused');
        localStorage.removeItem('timer_topic_id');
        localStorage.removeItem('timer_description');
        
        // השמע צליל סיום
        audioManager.playTimerComplete();
      }
    }, 1000);
  }, []);
  
  // בדיקה האם יש טיימר פעיל בעת העלאת הקומפוננטה
  useEffect(() => {
    // פונקציה לטעינת מצב הטיימר מהלוקל סטורג'
    const loadTimerState = () => {
      console.log('בדיקת מצב טיימר שמור...');
      
      // בדוק אם יש מצב טיימר שמור
      const savedEndTime = localStorage.getItem('timer_end_time');
      const savedDuration = localStorage.getItem('timer_duration');
      const savedIsPaused = localStorage.getItem('timer_is_paused');
      const savedTopicId = localStorage.getItem('timer_topic_id');
      const savedDescription = localStorage.getItem('timer_description');
      
      if (savedDuration) { // כאן השינוי - מספיק שיש נתון על המשך
        console.log('נמצא מידע שמור:', { 
          savedEndTime, 
          savedDuration, 
          savedIsPaused,
          savedTopicId,
          savedDescription
        });
        
        const endTime = parseInt(savedEndTime);
        const duration = parseInt(savedDuration);
        const isPausedValue = savedIsPaused === 'true';
        
        // שחזור נתוני השדות
        if (savedTopicId) {
          setSelectedTopic(savedTopicId);
        }
        
        if (savedDescription) {
          setDescription(savedDescription);
        }
        
        // אם הטיימר באמצע עצירה זמנית
        if (isPausedValue) {
          console.log('טוען טיימר במצב עצירה זמנית');
          
          // נקה קודם כל אינטרוול קיים אם יש
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          // שחזר את הזמן שנותר ישירות מלוקל סטורג'
          const remainingTime = parseInt(savedDuration);
          console.log('משחזר טיימר מושהה עם', remainingTime, 'שניות שנותרו');
          
          setSeconds(remainingTime);
          setIsPaused(true);
          setIsRunning(false);
          
          // שחזר את זמן ההתחלה מחושב (אפס כי אנחנו במצב פאוז)
          setStartTime(new Date());
        } 
        // אם הטיימר רץ
        else if (savedEndTime) {
          console.log('טוען טיימר פעיל');
          
          // נקה קודם כל אינטרוול קיים אם יש
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          const now = Date.now();
          const endTime = parseInt(savedEndTime);
          const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
          
          // רק אם נשאר זמן בטיימר
          if (timeLeft > 0) {
            console.log(`נשארו ${timeLeft} שניות בטיימר`);
            
            endTimeRef.current = endTime;
            setSeconds(timeLeft);
            setIsRunning(true);
            setIsPaused(false);
            
            // שחזר את זמן ההתחלה
            const originalDuration = parseInt(savedDuration);
            const elapsedTime = originalDuration - timeLeft;
            const startTimeValue = new Date(now - (elapsedTime * 1000));
            setStartTime(startTimeValue);
            
            // התחל את האינטרוול מחדש
            timerRef.current = window.setInterval(() => {
              const currentTime = Date.now();
              const currentTimeLeft = Math.max(0, Math.floor((endTime - currentTime) / 1000));
              
              setSeconds(currentTimeLeft);
              
              if (currentTimeLeft <= 0) {
                clearInterval(timerRef.current!);
                timerRef.current = null;
                setIsRunning(false);
                setIsCompleted(true);
                
                // נקה את המידע השמור
                localStorage.removeItem('timer_end_time');
                localStorage.removeItem('timer_duration');
                localStorage.removeItem('timer_is_paused');
                localStorage.removeItem('timer_topic_id');
                localStorage.removeItem('timer_description');
                
                audioManager.playTimerComplete();
              }
            }, 1000);
          } else {
            // נקה את המידע השמור אם הטיימר כבר הסתיים
            console.log('הטיימר השמור כבר הסתיים - מנקה מידע');
            localStorage.removeItem('timer_end_time');
            localStorage.removeItem('timer_duration');
            localStorage.removeItem('timer_is_paused');
            localStorage.removeItem('timer_topic_id');
            localStorage.removeItem('timer_description');
          }
        } 
        // רק משך ללא זמן סיום (מצב פאוז מלא)
        else {
          console.log('טוען מצב פאוז ללא זמן סיום');
          
          // שחזר את הזמן שנשאר
          const remainingTime = parseInt(savedDuration);
          console.log('משחזר טיימר מושהה ללא זמן סיום עם', remainingTime, 'שניות שנותרו');
          
          setSeconds(remainingTime);
          setIsPaused(true);
          setIsRunning(false);
          
          // שחזר את זמן ההתחלה (כי אנחנו במצב פאוז)
          setStartTime(new Date());
        }
      } else {
        console.log('לא נמצא מידע שמור לטיימר');
      }
    };
    
    // טען את המצב מיד עם העלאת הקומפוננטה
    loadTimerState();
    
    // הוסף האזנה לשינוי נראות הדף
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('המשתמש חזר לדף - בודק מצב טיימר מחדש');
        loadTimerState();
      }
    };
    
    // הוסף האזנה לאירוע שינוי הנראות
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // ניקוי בעת פירוק הקומפוננטה
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // פונקציה למטרת תאימות עם הקוד הקיים
  const start = () => {
    setIsRunning(true);
    setIsPaused(false);
    setIsCompleted(false);
  };
  
  // פונקציה לעצירת הטיימר
  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    
    // נקה את מידע הטיימר שנשמר בלוקל סטורג'
    localStorage.removeItem('timer_end_time');
    localStorage.removeItem('timer_duration');
    localStorage.removeItem('timer_is_paused');
    localStorage.removeItem('timer_topic_id');
    localStorage.removeItem('timer_description');
    localStorage.removeItem('timetracker_direct_timer');
    localStorage.removeItem('timetracker_timer_state');
    localStorage.removeItem('timetracker_countdown');
    localStorage.removeItem('timetracker_ui_data');
    
    console.log("טיימר בוטל והמידע נמחק מהזיכרון המקומי");
  }, []);
  
  // פונקציה לעצירה זמנית
  const pause = useCallback(() => {
    if (isRunning) {
      clearInterval(timerRef.current!);
      timerRef.current = null;
      setIsPaused(true);
      setIsRunning(false);
      
      // עדכן את מצב העצירה הזמנית בלוקל סטורג'
      localStorage.setItem('timer_is_paused', 'true');
      
      // שמור את הזמן הנוכחי שנותר בלוקל סטורג'
      localStorage.setItem('timer_duration', seconds.toString());
      
      // שמור גם את הנושא והתיאור אם יש
      if (selectedTopic) {
        localStorage.setItem('timer_topic_id', selectedTopic);
      }
      
      if (description) {
        localStorage.setItem('timer_description', description);
      }
      
      // עדכן גם את הצוות אם הטיימר משותף
      if (isSharing && selectedTopic && startTime) {
        const selectedTopicObj = topics?.find(t => t.id.toString() === selectedTopic);
        if (selectedTopicObj) {
          const now = new Date();
          shareTimerMutation.mutate({
            topicId: selectedTopicObj.id,
            topicName: selectedTopicObj.name,
            topicColor: selectedTopicObj.color,
            description: description || '',
            startTime: startTime.toISOString(),
            isPaused: true,
            pausedAt: now.toISOString(),
            duration: seconds,
          });
        }
      }
      
      console.log("הטיימר הושהה ונשמר במצב השהייה עם", seconds, "שניות שנותרו");
    }
  }, [isRunning, seconds, selectedTopic, description, isSharing, topics, startTime, shareTimerMutation]);
  
  // פונקציה להמשך טיימר
  const resume = useCallback(() => {
    if (isPaused) {
      // חשב מחדש את נקודת הסיום
      const remainingMs = seconds * 1000;
      const newEndTime = Date.now() + remainingMs;
      endTimeRef.current = newEndTime;
      
      // עדכן את מצב הטיימר בלוקל סטורג'
      localStorage.setItem('timer_end_time', newEndTime.toString());
      localStorage.setItem('timer_is_paused', 'false');
      
      // עדכן את הסטייט
      setIsRunning(true);
      setIsPaused(false);
      
      // עדכן את הצוות אם הטיימר משותף
      if (isSharing && selectedTopic && startTime) {
        const selectedTopicObj = topics?.find(t => t.id.toString() === selectedTopic);
        if (selectedTopicObj) {
          const endTimeISO = new Date(newEndTime).toISOString();
          shareTimerMutation.mutate({
            topicId: selectedTopicObj.id,
            topicName: selectedTopicObj.name,
            topicColor: selectedTopicObj.color,
            description: description || '',
            startTime: startTime.toISOString(),
            estimatedEndTime: endTimeISO,
            isPaused: false,
            pausedAt: null,
            duration: seconds,
          });
        }
      }
      
      // התחל את האינטרוול מחדש
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.floor((endTimeRef.current! - now) / 1000));
        
        // עדכן את הזמן שנותר
        setSeconds(timeLeft);
        
        // אם הזמן נגמר
        if (timeLeft <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setIsRunning(false);
          setIsCompleted(true);
          
          // הפסק לשתף את הטיימר אם רלוונטי
          if (isSharing) {
            stopSharingMutation.mutate();
            setIsSharing(false);
          }
          
          // נקה את המידע השמור כשהטיימר מסתיים
          localStorage.removeItem('timer_end_time');
          localStorage.removeItem('timer_duration');
          localStorage.removeItem('timer_is_paused');
          
          // השמע צליל סיום
          audioManager.playTimerComplete();
        }
      }, 1000);
      
      console.log("הטיימר ממשיך לרוץ ונשמר במצב פעיל");
    }
  }, [isPaused, seconds]);
  
  // פונקציה לאיפוס
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSeconds(0);
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false);
    
    // נקה את מידע הטיימר שנשמר בלוקל סטורג'
    localStorage.removeItem('timer_end_time');
    localStorage.removeItem('timer_duration');
    localStorage.removeItem('timer_is_paused');
    localStorage.removeItem('timer_topic_id');
    localStorage.removeItem('timer_description');
    localStorage.removeItem('timetracker_direct_timer');
    localStorage.removeItem('timetracker_timer_state');
    localStorage.removeItem('timetracker_countdown');
    localStorage.removeItem('timetracker_ui_data');
    
    console.log("טיימר אופס והמידע נמחק מהזיכרון המקומי");
  }, []);
  
  // אין צורך ברפרנסים של אודיו - אנחנו משתמשים ב-AudioManager
  // שכבר מטפל בטעינה והשמעה של צלילים מהתיקייה המקומית
  
  // Create time entry mutation
  const createTimeEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/time-entries", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/recent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/daily'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/weekly'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/most-tracked'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/topic-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/weekly-overview'] });
    }
  });
  
  // When timer completes, save the time entry
  useEffect(() => {
    if (isCompleted && startTime && selectedTopic) {
      // Play completion sound using audio manager
      audioManager.playTimerComplete();
      
      // Save time entry when timer completes
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      createTimeEntryMutation.mutate({
        topicId: parseInt(selectedTopic),
        description: description || null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
      });
      
      toast({
        title: 'הטיימר הסתיים',
        description: 'הזמן נשמר בהצלחה',
      });
      
      // Reset after saving
      reset();
      setDescription("");
      setStartTime(null);
    }
  }, [isCompleted, startTime, selectedTopic, description, reset, createTimeEntryMutation, toast]);

  // Validate topic selection
  const validateTopicSelection = useCallback(() => {
    if (!selectedTopic) {
      toast({
        title: 'לא נבחר נושא',
        description: 'נא לבחור נושא לפני התחלת המעקב',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  }, [selectedTopic, toast]);

  // שומרים פונקציה זו למרות שאינה בשימוש ישיר כרגע
  // למקרה שנצטרך אותה בעתיד
  const handleStart = useCallback(() => {
    if (!validateTopicSelection()) return;
    
    setStartTime(new Date());
    start();
  }, [validateTopicSelection, start]);

  // Function to set timer duration without starting it
  const handlePresetSelection = useCallback((minutes: number) => {
    if (!validateTopicSelection()) return;
    
    // Just set the seconds without starting the timer
    const totalSeconds = minutes * 60;
    setSeconds(totalSeconds);
    
    toast({
      title: `נבחר טיימר`,
      description: `הוגדר טיימר ל-${minutes} דקות, לחץ על "התחל" להפעלה`,
    });
  }, [validateTopicSelection, setSeconds, toast]);
  
  // Handle timer with preset duration
  const handleStartTimer = useCallback((minutes: number) => {
    if (!validateTopicSelection()) return;
    
    // Play start sound using audio manager
    audioManager.playTimerStart();
    
    // נקיון כל מידע קודם לפני התחלת טיימר חדש
    localStorage.removeItem('timer_end_time');
    localStorage.removeItem('timer_duration');
    localStorage.removeItem('timer_is_paused');
    localStorage.removeItem('timer_topic_id');
    localStorage.removeItem('timer_description');
    
    // שמירת זמן התחלה 
    const startTimeNow = new Date();
    setStartTime(startTimeNow);
    
    // הפעלת הטיימר עם משך הזמן הנדרש
    startWithDuration(minutes);
    
    toast({
      title: `טיימר התחיל`,
      description: `קוצב זמן ל-${minutes} דקות`,
    });
  }, [validateTopicSelection, startWithDuration, setStartTime, toast, selectedTopic, description]);
  
  // Handle manually stopping the timer
  const handleStop = useCallback(() => {
    if (startTime && selectedTopic) {
      // Save the time entry with the current duration
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // If sharing timer with team, stop sharing
      if (isSharing) {
        stopSharingMutation.mutate();
        setIsSharing(false);
      }
      
      createTimeEntryMutation.mutate({
        topicId: parseInt(selectedTopic),
        description: description || null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
      });
      
      toast({
        title: 'טיימר בוטל',
        description: 'הזמן שעבר נשמר',
      });
    }
    
    // Reset timer state
    stop();
    reset();
    setStartTime(null);
    
    // וידוא שכל הלוקל סטורג' שקשור לטיימר נמחק
    localStorage.removeItem('timer_end_time');
    localStorage.removeItem('timer_duration');
    localStorage.removeItem('timer_is_paused');
    localStorage.removeItem('timetracker_timer_state');
    localStorage.removeItem('timetracker_countdown');
    localStorage.removeItem('timetracker_direct_timer');
    localStorage.removeItem('timetracker_ui_data');
    
    console.log(">>> נמחקו כל נתוני הטיימר מהלוקל סטורג'");
  }, [stop, reset, startTime, selectedTopic, description, createTimeEntryMutation, toast]);
  
  // יצירת מזהה ייחודי לשמירת מצב הטיימר
  const TIMER_DATA_KEY = 'timetracker_ui_data';
  
  // שמירת מידע נוסף (נושא, תיאור וזמן התחלה) בנפרד מהטיימר עצמו
  useEffect(() => {
    try {
      // שומרים רק אם יש מידע משמעותי
      if (selectedTopic || description || startTime) {
        const uiState = {
          selectedTopic,
          description,
          startTime: startTime ? startTime.toISOString() : null
        };
        
        localStorage.setItem(TIMER_DATA_KEY, JSON.stringify(uiState));
        console.log("Saved UI state:", uiState);
      }
    } catch (error) {
      console.error("Error saving UI state:", error);
    }
  }, [selectedTopic, description, startTime]);
  
  // טעינת נתוני ממשק המשתמש (נושא, תיאור וזמן התחלה) בעת טעינת הקומפוננטה
  const didInitialUILoad = useRef(false);
  
  useEffect(() => {
    // מונעים טעינה חוזרת בכל פעם שהקומפוננטה נטענת מחדש
    if (didInitialUILoad.current) return;
    didInitialUILoad.current = true;
    
    try {
      const savedUIData = localStorage.getItem(TIMER_DATA_KEY);
      
      if (savedUIData) {
        const parsedData = JSON.parse(savedUIData);
        console.log("Loading UI data:", parsedData);
        
        if (parsedData.selectedTopic) {
          setSelectedTopic(parsedData.selectedTopic);
        }
        
        if (parsedData.description) {
          setDescription(parsedData.description);
        }
        
        if (parsedData.startTime) {
          setStartTime(new Date(parsedData.startTime));
        }
      }
    } catch (error) {
      console.error("Error loading UI state:", error);
    }
  }, []);
  
  // מחיקת כל הנתונים כאשר הטיימר מופסק
  useEffect(() => {
    if (!isRunning && !isPaused) {
      localStorage.removeItem(TIMER_DATA_KEY);
    }
  }, [isRunning, isPaused]);
  
  return (
    <div className="space-y-4">
      <div className="mb-6">
        {/* בחירת נושא */}
        <div className="mb-4">
          <Label htmlFor="topic-select" className="mb-2 block">נושא</Label>
          {isLoading ? (
            <Select disabled>
              <SelectTrigger id="topic-select">
                <SelectValue placeholder="טוען נושאים..." />
              </SelectTrigger>
            </Select>
          ) : (
            <Select
              value={selectedTopic}
              onValueChange={setSelectedTopic}
              disabled={isRunning || isPaused}
            >
              <SelectTrigger id="topic-select" className="select-trigger w-1/3 text-right">
                <SelectValue placeholder="בחר נושא" className="select-value" />
              </SelectTrigger>
              <SelectContent className="select-content">
                {topics?.map((topic: any) => (
                  <SelectItem key={topic.id} value={topic.id.toString()} className="select-item">
                    <div className="select-item-content">
                      <span>{topic.name}</span>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: topic.color }} />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* תיאור העבודה */}
        <div className="mb-4">
          <Label htmlFor="description-input" className="mb-2 block">תיאור (אופציונלי)</Label>
          <Input
            id="description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="תיאור קצר של המשימה"
            disabled={isRunning || isPaused}
            className="w-full sm:w-1/3"
          />
        </div>
      </div>
      
      {/* טיימר */}
      <div className="bg-card dark:bg-slate-900 rounded-xl p-6 mb-6 text-center">
        <div className="text-4xl font-bold mb-4 tracking-wider">
          {formatTime()}
        </div>
        

        
        {/* כפתורי פעולה */}
        {!isRunning && !isPaused ? (
          <>
            {/* כפתורי ברירת מחדל */}
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              <Button 
                onClick={() => handlePresetSelection(5)} 
                className="px-2 md:px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-700 flex items-center justify-center"
              >
                <TimerIcon className="mr-1 md:ml-1 h-4 w-4 md:block hidden" />
                <span>5 דקות</span>
              </Button>
              
              <Button 
                onClick={() => handlePresetSelection(20)} 
                className="px-2 md:px-4 py-2 bg-yellow-500 dark:bg-yellow-600 text-white rounded-md hover:bg-yellow-600 dark:hover:bg-yellow-700 flex items-center justify-center"
              >
                <Clock5Icon className="mr-1 md:ml-1 h-4 w-4 md:block hidden" />
                <span>20 דקות</span>
              </Button>
              
              <Button 
                onClick={() => handlePresetSelection(40)} 
                className="px-2 md:px-4 py-2 bg-purple-500 dark:bg-purple-600 text-white rounded-md hover:bg-purple-600 dark:hover:bg-purple-700 flex items-center justify-center"
              >
                <BellIcon className="mr-1 md:ml-1 h-4 w-4 md:block hidden" />
                <span>40 דקות</span>
              </Button>
            </div>
            
            {/* Custom Timer Input */}
            <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 mb-2 w-full">
              <Input
                type="number"
                min="1"
                max="480"
                className="w-full sm:w-auto"
                placeholder="הזן מספר דקות"
                value={customMinutes || ''}
                onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 0)}
              />
              <Button 
                onClick={() => handlePresetSelection(customMinutes)} 
                className="w-full sm:w-auto px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 flex items-center justify-center"
                disabled={customMinutes <= 0}
              >
                <TimerIcon className="ml-1 h-4 w-4" />
                <span>הגדר זמן מותאם</span>
              </Button>
            </div>
            
            {/* כפתור התחלה */}
            {seconds > 0 && (
              <Button 
                onClick={() => handleStartTimer(seconds / 60)} 
                className="w-full px-4 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 flex items-center justify-center text-lg"
                disabled={!selectedTopic}
              >
                <PlayIcon className="ml-2 h-5 w-5" />
                <span>התחל טיימר</span>
              </Button>
            )}
          </>
        ) : isRunning ? (
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              onClick={() => pause()} 
              className="w-full sm:w-1/2 px-4 py-3 bg-amber-500 dark:bg-amber-600 text-white rounded-md hover:bg-amber-600 dark:hover:bg-amber-700 flex items-center justify-center"
            >
              <PauseIcon className="ml-2 h-5 w-5" />
              <span>הפסק זמנית</span>
            </Button>
            
            <Button 
              onClick={handleStop} 
              className="w-full sm:w-1/2 px-4 py-3 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 flex items-center justify-center"
            >
              <XIcon className="ml-2 h-5 w-5" />
              <span>ביטול טיימר</span>
            </Button>
          </div>
        ) : isPaused ? (
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              onClick={() => resume()} 
              className="w-full sm:w-1/2 px-4 py-3 bg-green-500 dark:bg-green-600 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-700 flex items-center justify-center"
            >
              <PlayIcon className="ml-2 h-5 w-5" />
              <span>המשך</span>
            </Button>
            
            <Button 
              onClick={handleStop} 
              className="w-full sm:w-1/2 px-4 py-3 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 flex items-center justify-center"
            >
              <XIcon className="ml-2 h-5 w-5" />
              <span>ביטול טיימר</span>
            </Button>
          </div>
        ) : null}
      </div>
      

    </div>
  );
}
