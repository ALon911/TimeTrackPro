import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTimer } from '@/hooks/use-timer';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { PlayIcon, PauseIcon, TimerIcon, Clock5Icon, BellIcon, XIcon } from 'lucide-react';

export function TimeTracker() {
  const { data: topics, isLoading } = useQuery({ 
    queryKey: ['/api/topics'] 
  });
  
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [customMinutes, setCustomMinutes] = useState<number>(0);
  const { 
    seconds, 
    setSeconds,
    isRunning,
    isPaused,
    isCompleted, 
    start, 
    startWithDuration,
    stop, 
    pause,
    resume,
    reset, 
    formatTime 
  } = useTimer();
  const { toast } = useToast();
  
  // Audio notifications
  const completeAudioRef = useRef<HTMLAudioElement | null>(null);
  const startAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio elements for timer notifications
    completeAudioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
    startAudioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    
    return () => {
      if (completeAudioRef.current) {
        completeAudioRef.current.pause();
        completeAudioRef.current = null;
      }
      if (startAudioRef.current) {
        startAudioRef.current.pause();
        startAudioRef.current = null;
      }
    };
  }, []);
  
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
      // Play completion sound
      if (completeAudioRef.current) {
        completeAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      
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
    
    // Play start sound
    if (startAudioRef.current) {
      startAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    
    setStartTime(new Date());
    startWithDuration(minutes);
    
    toast({
      title: `טיימר התחיל`,
      description: `קוצב זמן ל-${minutes} דקות`,
    });
  }, [validateTopicSelection, startWithDuration, setStartTime, toast]);
  
  // Handle manually stopping the timer
  const handleStop = useCallback(() => {
    if (startTime && selectedTopic) {
      // Save the time entry with the current duration
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
        title: 'טיימר בוטל',
        description: 'הזמן שעבר נשמר',
      });
    }
    
    // Reset timer state
    stop();
    reset();
    setStartTime(null);
    // מנקים את הלוקל סטורג' גם
    localStorage.removeItem('timetracker_timer_state');
  }, [stop, reset, startTime, selectedTopic, description, createTimeEntryMutation, toast]);
  
  // שמירת מצב הטיימר בלוקל סטורג'
  useEffect(() => {
    if (isRunning || isPaused) {
      try {
        if (selectedTopic) {
          const updatedState = {
            isRunning,
            isPaused,
            selectedTopic: selectedTopic,
            description: description,
            startTime: startTime ? startTime.toISOString() : null,
            totalDuration: seconds
          };
          localStorage.setItem('timetracker_timer_state', JSON.stringify(updatedState));
        }
      } catch (error) {
        console.error('Error updating timer state:', error);
      }
    }
  }, [isRunning, isPaused, selectedTopic, description, startTime, seconds]);
  
  // טעינת פרטי הטיימר בעת טעינת הקומפוננטה
  useEffect(() => {
    try {
      const timerState = localStorage.getItem('timetracker_timer_state');
      if (timerState) {
        const parsedState = JSON.parse(timerState);
        
        // אם יש מצב שמור ומידע על הנושא, נשחזר אותו
        if (parsedState.selectedTopic) {
          setSelectedTopic(parsedState.selectedTopic);
        }
        
        // נשחזר תיאור אם קיים
        if (parsedState.description) {
          setDescription(parsedState.description);
        }
        
        // נשחזר זמן התחלה אם קיים
        if (parsedState.startTime) {
          setStartTime(new Date(parsedState.startTime));
        }
        
        // נשחזר את משך הזמן
        if (parsedState.totalDuration) {
          setSeconds(parsedState.totalDuration);
        }
        
        // נריץ את הטיימר אם היה פועל
        if (parsedState.isRunning) {
          start();
        } 
        // או נעצור אותו אם היה בהשהייה
        else if (parsedState.isPaused) {
          pause();
        }
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  }, []);
  
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
              <SelectTrigger id="topic-select">
                <SelectValue placeholder="בחר נושא" />
              </SelectTrigger>
              <SelectContent>
                {topics?.map((topic: any) => (
                  <SelectItem key={topic.id} value={topic.id.toString()}>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: topic.color }} />
                      <span>{topic.name}</span>
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
            <div className="flex flex-wrap justify-center gap-2 mb-4">
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
          <div className="flex flex-col sm:flex-row gap-2 w-full">
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
          <div className="flex flex-col sm:flex-row gap-2 w-full">
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
