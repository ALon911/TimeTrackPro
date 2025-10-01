import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PlayIcon, PauseIcon, TimerIcon, Clock5Icon, BellIcon, XIcon, Share2Icon, Loader2 } from 'lucide-react';
import { audioManager } from "@/lib/audio-utils";
import { useSyncedTimer } from '@/hooks/use-synced-timer';

export function SyncedTimeTracker() {
  const { data: topics, isLoading } = useQuery({ 
    queryKey: ['/api/topics'] 
  });
  
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [customMinutes, setCustomMinutes] = useState<number>(0);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mutation to save time entry to database
  const createTimeEntryMutation = useMutation({
    mutationFn: async (timeEntry: {
      topicId: number;
      description: string | null;
      startTime: string;
      endTime: string;
      duration: number;
    }) => {
      const res = await apiRequest("POST", "/api/time-entries", timeEntry);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch time entries and stats
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/recent-sessions"] });
      
      toast({
        title: "זמן נשמר בהצלחה",
        description: `נוספה רשומת זמן חדשה: ${description || "ללא תיאור"}`,
      });
    },
    onError: (error) => {
      console.error('❌ Failed to save time entry:', error);
      toast({
        title: "שגיאה בשמירת הזמן",
        description: "לא ניתן לשמור את הזמן. אנא נסה שוב.",
        variant: "destructive",
      });
    }
  });
  
  // Use the synchronized timer hook
  const {
    seconds,
    isRunning,
    isPaused,
    isCompleted,
    isCountDown,
    startTime,
    duration,
    topicId,
    description: timerDescription,
    start,
    pause,
    resume,
    stop,
    reset,
    formatTime,
    isLoading: timerLoading,
    isStarting,
    isUpdating,
    isStopping,
    error: timerError
  } = useSyncedTimer({ autoSync: true, syncInterval: 2000 });
  
  // Handle timer completion
  useEffect(() => {
    if (isCompleted && isCountDown && !hasSaved) {
      console.log('🎉 Timer completed, saving to database...');
      setHasSaved(true); // Prevent multiple saves
      
      audioManager.playTimerComplete();
      
      // Save time entry to database when timer completes
      if (topicId && startTime) {
        const endTime = new Date();
        const startTimeDate = new Date(startTime);
        const duration = Math.floor((endTime.getTime() - startTimeDate.getTime()) / 1000);
        
        console.log('💾 Saving time entry to database:', {
          topicId,
          description,
          startTime: startTimeDate.toISOString(),
          endTime: endTime.toISOString(),
          duration
        });
        
        createTimeEntryMutation.mutate({
          topicId,
          description: description || null,
          startTime: startTimeDate.toISOString(),
          endTime: endTime.toISOString(),
          duration: duration,
        });
      }
      
      toast({
        title: "הטיימר הסתיים!",
        description: "טיימר הספירה לאחור שלך הסתיים והזמן נשמר.",
      });
    }
  }, [isCompleted, isCountDown, topicId, startTime, description, hasSaved, createTimeEntryMutation, toast]);
  
  // Reset save flag when starting a new timer
  useEffect(() => {
    if (isRunning && !isPaused && !isCompleted) {
      setHasSaved(false);
    }
  }, [isRunning, isPaused, isCompleted]);
  
  // Handle timer errors
  useEffect(() => {
    if (timerError) {
      toast({
        title: "שגיאת טיימר",
        description: "אירעה שגיאה בסנכרון הטיימר.",
        variant: "destructive",
      });
    }
  }, [timerError, toast]);
  
  
  // Start countdown timer
  const startCountdownTimer = useCallback((minutes: number) => {
    if (!selectedTopic) {
      toast({
        title: "אנא בחר נושא",
        description: "עליך לבחור נושא לפני התחלת הטיימר.",
        variant: "destructive",
      });
      return;
    }
    
    const durationSeconds = minutes * 60;
    audioManager.playTimerStart();
    start(parseInt(selectedTopic), description, durationSeconds, true);
    
    toast({
      title: "טיימר ספירה לאחור התחיל",
      description: `טיימר הספירה לאחור של ${minutes} דקות פועל כעת ומסונכרן בכל המכשירים.`,
    });
  }, [selectedTopic, description, start, toast]);
  
  // Handle timer controls
  const handleStart = useCallback(() => {
    console.log('🔘 Button clicked:', { isRunning, isPaused });
    
    // If timer is paused, resume it
    if (isPaused) {
      console.log('▶️ Resuming timer');
      try {
        resume();
        toast({
          title: "הטיימר חודש",
          description: "הטיימר שלך חודש ומסונכרן.",
        });
      } catch (error) {
        console.error('❌ Resume failed:', error);
        toast({
          title: "שגיאה בחידוש הטיימר",
          description: "לא ניתן לחדש את הטיימר. אנא נסה שוב.",
          variant: "destructive",
        });
      }
    } else if (isRunning) {
      // If timer is running, pause it
      console.log('⏸️ Pausing timer');
      try {
        pause();
        toast({
          title: "הטיימר הושהה",
          description: "הטיימר שלך הושהה ומסונכרן.",
        });
      } catch (error) {
        console.error('❌ Pause failed:', error);
        toast({
          title: "שגיאה בהשהיית הטיימר",
          description: "לא ניתן להשהות את הטיימר. אנא נסה שוב.",
          variant: "destructive",
        });
      }
    } else {
      // Start new countdown timer with current customMinutes
      if (customMinutes <= 0) {
        toast({
          title: "משך זמן לא תקין",
          description: "אנא הכנס מספר דקות תקין (לפחות דקה אחת).",
          variant: "destructive",
        });
        return;
      }
      console.log('🚀 Starting countdown timer');
      startCountdownTimer(customMinutes);
    }
  }, [isRunning, isPaused, resume, pause, customMinutes, startCountdownTimer, toast]);
  
  const handleStop = useCallback(() => {
    try {
      stop();
      setSelectedTopic("");
      setDescription("");
      toast({
        title: "הטיימר נעצר",
        description: "הטיימר שלך נעצר ומסונכרן.",
      });
    } catch (error) {
      console.error('❌ Stop failed:', error);
      toast({
        title: "שגיאה בעצירת הטיימר",
        description: "לא ניתן לעצור את הטיימר. אנא נסה שוב.",
        variant: "destructive",
      });
    }
  }, [stop, toast]);
  
  const handleReset = useCallback(() => {
    try {
      reset();
      setSelectedTopic("");
      setDescription("");
      setCustomMinutes(0);
    } catch (error) {
      console.error('❌ Reset failed:', error);
      toast({
        title: "שגיאה באיפוס הטיימר",
        description: "לא ניתן לאפס את הטיימר. אנא נסה שוב.",
        variant: "destructive",
      });
    }
  }, [reset, toast]);
  
  
  // Format display time
  const displayTime = formatTime(seconds);
  
  // Get current topic name
  const currentTopic = topics?.find(topic => topic.id === topicId);
  
  return (
    <div className="space-y-6">
      {/* Timer Display */}
      <div className="text-center space-y-4">
        <div className="text-6xl font-mono font-bold text-primary">
          {displayTime}
        </div>
        
        {isRunning && (
          <div className="text-sm text-muted-foreground">
            {isCountDown ? 'טיימר ספירה לאחור' : 'טיימר רגיל'} • 
            {currentTopic ? ` נושא: ${currentTopic.name}` : ''}
            {timerDescription && ` • ${timerDescription}`}
          </div>
        )}
        
        {startTime && (
          <div className="text-xs text-muted-foreground">
            התחיל: {new Date(startTime).toLocaleTimeString('he-IL')}
          </div>
        )}
      </div>
      
      {/* Timer Controls */}
      <div className="flex justify-center gap-3">
        {!isRunning && !isPaused ? (
          <Button
            onClick={handleStart}
            disabled={isStarting || !selectedTopic || customMinutes <= 0}
            size="lg"
            className="px-8"
          >
            {isStarting ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <TimerIcon className="w-5 h-5 mr-2" />
            )}
            {isStarting ? "מתחיל..." : `התחל ${customMinutes} דקות`}
          </Button>
        ) : (
          <>
            <Button
              onClick={handleStart}
              variant={isPaused ? "default" : "secondary"}
              size="lg"
              className="px-6"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : isPaused ? (
                <>
                  <PlayIcon className="w-5 h-5 mr-2" />
                  המשך
                </>
              ) : (
                <>
                  <PauseIcon className="w-5 h-5 mr-2" />
                  השהה
                </>
              )}
            </Button>
            
            <Button
              onClick={handleStop}
              variant="destructive"
              size="lg"
              className="px-6"
              disabled={isStopping}
            >
              {isStopping ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <XIcon className="w-5 h-5 mr-2" />
              )}
              {isStopping ? "עוצר..." : "עצור"}
            </Button>
          </>
        )}
        
        {(isRunning || isCompleted) && (
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="px-6"
          >
            איפוס
          </Button>
        )}
      </div>
      
      {/* Topic Selection */}
      <div className="space-y-2">
        <Label htmlFor="topic" className="text-right">בחר נושא</Label>
        <Select value={selectedTopic} onValueChange={setSelectedTopic}>
          <SelectTrigger className="w-full sm:w-1/3 text-right">
            <SelectValue placeholder="בחר נושא למעקב" />
          </SelectTrigger>
          <SelectContent>
            {topics?.map((topic) => (
              <SelectItem key={topic.id} value={topic.id.toString()}>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: topic.color }}
                  />
                  <span>{topic.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">תיאור (אופציונלי)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="על מה אתה עובד?"
          disabled={isRunning}
        />
      </div>
      
      {/* Countdown Timer Section */}
      {!isRunning && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center space-x-2">
            <Clock5Icon className="w-5 h-5" />
            <Label className="text-lg font-semibold">טיימר ספירה לאחור</Label>
          </div>
          
          {/* Preset Buttons */}
          <div className="space-y-2">
            <Label>בחר זמן מהיר:</Label>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomMinutes(5)}
                className="flex-1"
              >
                5 דקות
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomMinutes(20)}
                className="flex-1"
              >
                20 דקות
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomMinutes(40)}
                className="flex-1"
              >
                40 דקות
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <Label htmlFor="customMinutes">משך זמן (דקות)</Label>
              <Input
                id="customMinutes"
                type="number"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 0)}
                placeholder="הכנס דקות"
                min="1"
                max="1440"
                className="w-32"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Sync Status */}
      <div className="text-center text-sm text-muted-foreground">
        {isRunning && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>מסונכרן בכל המכשירים</span>
          </div>
        )}
      </div>
      
      {/* Loading State */}
      {timerLoading && (
        <div className="text-center text-sm text-muted-foreground">
          מסנכרן טיימר...
        </div>
      )}
    </div>
  );
}
