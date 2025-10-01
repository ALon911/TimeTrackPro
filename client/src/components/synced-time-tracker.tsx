import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PlayIcon, PauseIcon, TimerIcon, Clock5Icon, BellIcon, XIcon, Share2Icon } from 'lucide-react';
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
  
  const { toast } = useToast();
  
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
    error: timerError
  } = useSyncedTimer({ autoSync: true, syncInterval: 2000 });
  
  // Handle timer completion
  useEffect(() => {
    if (isCompleted && isCountDown) {
      audioManager.playTimerComplete();
      toast({
        title: "הטיימר הסתיים!",
        description: "טיימר הספירה לאחור שלך הסתיים.",
      });
    }
  }, [isCompleted, isCountDown, toast]);
  
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
  
  // Start regular timer
  const startRegularTimer = useCallback(() => {
    if (!selectedTopic) {
      toast({
        title: "אנא בחר נושא",
        description: "עליך לבחור נושא לפני התחלת הטיימר.",
        variant: "destructive",
      });
      return;
    }
    
    audioManager.playTimerStart();
    start(parseInt(selectedTopic), description, undefined, false);
    
    toast({
      title: "הטיימר התחיל",
      description: "הטיימר שלך פועל כעת ומסונכרן בכל המכשירים.",
    });
  }, [selectedTopic, description, start, toast]);
  
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
    if (isRunning) {
      if (isPaused) {
        resume();
        toast({
          title: "הטיימר חודש",
          description: "הטיימר שלך חודש ומסונכרן.",
        });
      } else {
        pause();
        toast({
          title: "הטיימר הושהה",
          description: "הטיימר שלך הושהה ומסונכרן.",
        });
      }
    } else {
      startRegularTimer();
    }
  }, [isRunning, isPaused, resume, pause, startRegularTimer, toast]);
  
  const handleStop = useCallback(() => {
    stop();
    setSelectedTopic("");
    setDescription("");
    toast({
      title: "הטיימר נעצר",
      description: "הטיימר שלך נעצר ומסונכרן.",
    });
  }, [stop, toast]);
  
  const handleReset = useCallback(() => {
    reset();
    setSelectedTopic("");
    setDescription("");
    setCustomMinutes(0);
  }, [reset]);
  
  // Handle countdown timer start
  const handleStartCountdown = useCallback(() => {
    if (customMinutes <= 0) {
      toast({
        title: "משך זמן לא תקין",
        description: "אנא הכנס מספר דקות תקין (לפחות דקה אחת).",
        variant: "destructive",
      });
      return;
    }
    
    startCountdownTimer(customMinutes);
  }, [customMinutes, startCountdownTimer, toast]);
  
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
      <div className="flex justify-center space-x-4">
        {!isRunning ? (
          <Button
            onClick={handleStart}
            disabled={timerLoading || !selectedTopic}
            size="lg"
            className="px-8"
          >
            <PlayIcon className="w-5 h-5 mr-2" />
            התחל טיימר
          </Button>
        ) : (
          <>
            <Button
              onClick={handleStart}
              variant={isPaused ? "default" : "secondary"}
              size="lg"
              className="px-6"
            >
              {isPaused ? (
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
            >
              <XIcon className="w-5 h-5 mr-2" />
              עצור
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
        <Label htmlFor="topic">בחר נושא</Label>
        <Select value={selectedTopic} onValueChange={setSelectedTopic}>
          <SelectTrigger>
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
            <div className="flex space-x-2">
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
            
            <Button
              onClick={handleStartCountdown}
              disabled={timerLoading || !selectedTopic || customMinutes <= 0}
              className="mt-6"
            >
              <TimerIcon className="w-4 h-4 mr-2" />
              התחל ספירה לאחור
            </Button>
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
