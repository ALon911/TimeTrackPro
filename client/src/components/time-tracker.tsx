import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTimer } from '@/hooks/use-timer';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { PlayIcon, PauseIcon, PlusIcon, TimerIcon, Clock5Icon, BellIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ManualTimeEntry } from '@/components/manual-time-entry';

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
    mutationFn: async (timeEntry: any) => {
      const res = await apiRequest('POST', '/api/time-entries', timeEntry);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/daily'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/weekly'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/most-tracked'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/recent-sessions'] });
      toast({
        title: 'זמן נשמר',
        description: 'רשומת הזמן נשמרה בהצלחה',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: `שגיאה בשמירת הזמן: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Play sound when timer completes and save the time entry
  useEffect(() => {
    if (isCompleted && completeAudioRef.current && startTime && selectedTopic) {
      // Play completion sound
      completeAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
      
      // Calculate the exact duration based on the original preset
      // This ensures we save the full preset time, not the actual elapsed time
      const endTime = new Date();
      
      // For countdown timers, we want to save the full preset duration
      const calculatedDuration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Save the time entry
      createTimeEntryMutation.mutate({
        topicId: parseInt(selectedTopic),
        description: description || null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: calculatedDuration,
        isManual: false
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
      description: `הוגדר טיימר ל-${minutes} דקות`,
    });
  }, [validateTopicSelection, startWithDuration, toast]);

  // Handle timer stop (cancellation)
  const handleStop = useCallback(() => {
    // When stopping the timer, we just cancel it without saving any time entry
    stop();
    reset();
    setDescription("");
    setStartTime(null);
    
    toast({
      title: 'טיימר בוטל',
      description: 'הטיימר בוטל ולא נשמר זמן',
    });
    
  }, [stop, reset, toast]);

  // Reset timer if page is unmounted while running
  useEffect(() => {
    return () => {
      if (isRunning) {
        stop();
      }
    };
  }, [isRunning, stop]);

  return (
    <div className="bg-neutral-50 dark:bg-slate-800 rounded-lg p-4 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-neutral-100">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">נושא</Label>
          <Select
            value={selectedTopic}
            onValueChange={setSelectedTopic}
            disabled={isRunning || isLoading}
          >
            <SelectTrigger className="w-full p-3 border border-neutral-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary focus:border-primary">
              <SelectValue placeholder="בחר נושא" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading">טוען נושאים...</SelectItem>
              ) : topics && Array.isArray(topics) && topics.length > 0 ? (
                topics.map((topic: any) => (
                  <SelectItem key={topic.id} value={topic.id.toString()}>
                    {topic.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-topics">אין נושאים להצגה</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">תיאור</Label>
          <Input
            placeholder="מה אתה עושה?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isRunning}
            className="w-full p-3 border border-neutral-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>
      
      {/* Timer Display */}
      <div className="mt-4 text-center">
        <div className="text-3xl font-bold mb-2 text-neutral-900 dark:text-white">{formatTime()}</div>
      </div>
      
      {/* Timer Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
        {!isRunning && !isPaused ? (
          <>
            {/* Preset timer buttons */}
            <Button 
              onClick={() => handlePresetSelection(5)} 
              className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-700 flex items-center"
            >
              <TimerIcon className="ml-1 h-4 w-4" />
              <span>5 דקות</span>
            </Button>
            
            <Button 
              onClick={() => handlePresetSelection(20)} 
              className="px-4 py-2 bg-yellow-500 dark:bg-yellow-600 text-white rounded-md hover:bg-yellow-600 dark:hover:bg-yellow-700 flex items-center"
            >
              <Clock5Icon className="ml-1 h-4 w-4" />
              <span>20 דקות</span>
            </Button>
            
            <Button 
              onClick={() => handlePresetSelection(40)} 
              className="px-4 py-2 bg-purple-500 dark:bg-purple-600 text-white rounded-md hover:bg-purple-600 dark:hover:bg-purple-700 flex items-center"
            >
              <BellIcon className="ml-1 h-4 w-4" />
              <span>40 דקות</span>
            </Button>
            
            {/* Custom Timer Input */}
            <div className="flex items-center gap-2 mt-2 mb-2">
              <Input
                type="number"
                min="1"
                max="120"
                value={customMinutes || ""}
                onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 0)}
                placeholder="דקות מותאם אישית"
                className="w-32 p-3 border border-neutral-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <Button
                onClick={() => {
                  if (customMinutes > 0) {
                    handlePresetSelection(customMinutes);
                  } else {
                    toast({
                      title: "שגיאה",
                      description: "יש להזין מספר דקות גדול מ-0",
                      variant: "destructive",
                    });
                  }
                }}
                className="px-4 py-2 bg-teal-500 dark:bg-teal-600 text-white rounded-md hover:bg-teal-600 dark:hover:bg-teal-700 flex items-center"
              >
                <TimerIcon className="ml-1 h-4 w-4" />
                <span>הגדר זמן מותאם</span>
              </Button>
            </div>
            
            {/* כפתור התחלה */}
            {seconds > 0 && (
              <Button 
                onClick={() => handleStartTimer(seconds / 60)} 
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 flex items-center"
              >
                <PlayIcon className="ml-1 h-4 w-4" />
                <span>התחל</span>
              </Button>
            )}
          </>
        ) : isRunning ? (
          <>
            <Button 
              onClick={() => pause()} 
              className="px-4 py-2 bg-amber-500 dark:bg-amber-600 text-white rounded-md hover:bg-amber-600 dark:hover:bg-amber-700 flex items-center"
            >
              <PauseIcon className="ml-1 h-4 w-4" />
              <span>הפסק זמנית</span>
            </Button>
            
            <Button 
              onClick={handleStop} 
              className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 flex items-center"
            >
              <PauseIcon className="ml-1 h-4 w-4" />
              <span>ביטול טיימר</span>
            </Button>
          </>
        ) : isPaused ? (
          <>
            <Button 
              onClick={() => resume()} 
              className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-700 flex items-center"
            >
              <PlayIcon className="ml-1 h-4 w-4" />
              <span>המשך טיימר</span>
            </Button>
            
            <Button 
              onClick={handleStop} 
              className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 flex items-center"
            >
              <PauseIcon className="ml-1 h-4 w-4" />
              <span>ביטול טיימר</span>
            </Button>
          </>
        ) : null}
      </div>
      
      {/* Removed manual time entry dialog as requested */}
    </div>
  );
}
