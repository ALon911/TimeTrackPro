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
  const { 
    seconds, 
    isRunning,
    isCompleted, 
    start, 
    startWithDuration,
    stop, 
    reset, 
    formatTime 
  } = useTimer();
  const { toast } = useToast();
  
  // Audio notification
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for timer completion notification
    audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
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
    if (isCompleted && audioRef.current && startTime && selectedTopic) {
      // Play completion sound
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      
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

  // Handle regular timer start (counting up)
  const handleStart = useCallback(() => {
    if (!validateTopicSelection()) return;
    
    setStartTime(new Date());
    start();
  }, [validateTopicSelection, start]);

  // Handle timer with preset duration
  const handleStartTimer = useCallback((minutes: number) => {
    if (!validateTopicSelection()) return;
    
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
    <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label className="block text-sm font-medium text-neutral-700 mb-1">נושא</Label>
          <Select
            value={selectedTopic}
            onValueChange={setSelectedTopic}
            disabled={isRunning || isLoading}
          >
            <SelectTrigger className="w-full p-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary">
              <SelectValue placeholder="בחר נושא" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading">טוען נושאים...</SelectItem>
              ) : topics && topics.length > 0 ? (
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
          <Label className="block text-sm font-medium text-neutral-700 mb-1">תיאור</Label>
          <Input
            placeholder="מה אתה עושה?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isRunning}
            className="w-full p-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>
      
      {/* Timer Display */}
      <div className="mt-4 text-center">
        <div className="text-3xl font-bold mb-2">{formatTime()}</div>
      </div>
      
      {/* Timer Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
        {!isRunning ? (
          <>
            {/* Preset timer buttons */}
            <Button 
              onClick={() => handleStartTimer(5)} 
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
            >
              <TimerIcon className="ml-1 h-4 w-4" />
              <span>5 דקות</span>
            </Button>
            
            <Button 
              onClick={() => handleStartTimer(20)} 
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center"
            >
              <Clock5Icon className="ml-1 h-4 w-4" />
              <span>20 דקות</span>
            </Button>
            
            <Button 
              onClick={() => handleStartTimer(40)} 
              className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center"
            >
              <BellIcon className="ml-1 h-4 w-4" />
              <span>40 דקות</span>
            </Button>
            
            {/* Manual timer */}
            <Button 
              onClick={handleStart} 
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 flex items-center"
            >
              <PlayIcon className="ml-1 h-4 w-4" />
              <span>התחל (ללא הגבלה)</span>
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleStop} 
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
          >
            <PauseIcon className="ml-1 h-4 w-4" />
            <span>ביטול טיימר</span>
          </Button>
        )}
      </div>
      
      {/* Manual Time Entry */}
      <div className="flex justify-center mt-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="px-4 py-2 bg-neutral-100 text-neutral-700 border-neutral-300 rounded-md hover:bg-neutral-200 flex items-center"
              disabled={isRunning}
            >
              <PlusIcon className="ml-1 h-4 w-4" />
              <span>הוסף רשומה ידנית</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוספת זמן ידנית</DialogTitle>
            </DialogHeader>
            <ManualTimeEntry />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
