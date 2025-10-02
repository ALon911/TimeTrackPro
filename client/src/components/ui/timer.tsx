import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTimerDisplay } from "@/lib/time-utils";
import { Topic, InsertTimeEntry } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlayIcon, PlusIcon, PauseIcon } from "lucide-react";

interface TimerProps {
  topics: Topic[];
  userId: number;
}

export function Timer({ topics, userId }: TimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [description, setDescription] = useState("");
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);
  
  const createTimeEntryMutation = useMutation({
    mutationFn: async (timeEntry: InsertTimeEntry) => {
      const res = await apiRequest("POST", "/api/time-entries", timeEntry);
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
      toast({
        title: "שגיאה בשמירת הזמן",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleToggleTimer = () => {
    if (!selectedTopicId) {
      toast({
        title: "בחר נושא",
        description: "יש לבחור נושא לפני התחלת המעקב",
        variant: "destructive",
      });
      return;
    }
    
    if (isActive) {
      // Stop timer
      if (timerRef.current) window.clearInterval(timerRef.current);
      
      // If timer was actually running for some time, save the entry
      if (seconds > 0 && startTimeRef.current) {
        const endTime = new Date();
        
        createTimeEntryMutation.mutate({
          userId,
          topicId: parseInt(selectedTopicId),
          description,
          startTime: startTimeRef.current,
          endTime,
          duration: seconds,
          isManual: false
        });
        
        // Reset timer
        setSeconds(0);
        setDescription("");
        startTimeRef.current = null;
      }
    } else {
      // Start timer
      startTimeRef.current = new Date();
      timerRef.current = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    
    setIsActive(!isActive);
  };
  
  const handleOpenManualEntry = () => {
    // Handle manual entry dialog here
    console.log("Open manual entry dialog");
  };
  
  return (
    <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label className="block text-sm font-medium text-neutral-700 mb-1">נושא</Label>
          <Select 
            value={selectedTopicId} 
            onValueChange={setSelectedTopicId}
            disabled={isActive}
          >
            <SelectTrigger className="w-full p-3 border border-neutral-300 focus:ring-2 focus:ring-primary focus:border-primary text-right">
              <SelectValue placeholder="בחר נושא" />
            </SelectTrigger>
            <SelectContent>
              {topics.map(topic => (
                <SelectItem key={topic.id} value={topic.id.toString()}>
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-sm mr-2" 
                      style={{ backgroundColor: topic.color }}
                    />
                    {topic.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="block text-sm font-medium text-neutral-700 mb-1">תיאור</Label>
          <Input 
            className="w-full sm:w-1/3 p-3 border border-neutral-300 focus:ring-2 focus:ring-primary focus:border-primary" 
            placeholder="מה אתה עושה?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isActive && seconds > 0}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div className="text-2xl font-bold font-mono">{formatTimerDisplay(seconds)}</div>
        <div className="flex gap-2">
          <Button 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 flex items-center"
            onClick={handleToggleTimer}
            disabled={createTimeEntryMutation.isPending}
          >
            {isActive ? (
              <>
                <PauseIcon className="ml-1 h-4 w-4" />
                <span>הפסק</span>
              </>
            ) : (
              <>
                <PlayIcon className="ml-1 h-4 w-4" />
                <span>התחל</span>
              </>
            )}
          </Button>
          <Button 
            variant="secondary" 
            className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-300 flex items-center"
            onClick={handleOpenManualEntry}
            disabled={isActive}
          >
            <PlusIcon className="ml-1 h-4 w-4" />
            <span>הוסף ידנית</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
