import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Topic, TimeEntry, InsertTimeEntry } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateDurationInSeconds } from "@/lib/utils";

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntryId?: number; // For editing existing entry
  userId: number;
  topics: Topic[];
}

export function TimeEntryDialog({ 
  open, 
  onOpenChange, 
  timeEntryId, 
  userId, 
  topics 
}: TimeEntryDialogProps) {
  const [topicId, setTopicId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch time entry details if editing
  const { data: timeEntry, isSuccess: isTimeEntryLoaded } = useQuery<TimeEntry>({
    queryKey: ["/api/time-entries", timeEntryId],
    queryFn: async () => {
      if (!timeEntryId) return null;
      const res = await fetch(`/api/time-entries/${timeEntryId}`);
      if (!res.ok) throw new Error("Failed to fetch time entry");
      return res.json();
    },
    enabled: !!timeEntryId && open,
  });
  
  // Reset form when dialog opens or time entry changes
  useEffect(() => {
    if (open) {
      if (timeEntry && isTimeEntryLoaded) {
        // Populate form with existing time entry
        setTopicId(timeEntry.topicId.toString());
        setDescription(timeEntry.description || "");
        
        const startDate = new Date(timeEntry.startTime);
        setDate(startDate.toISOString().slice(0, 10));
        setStartTime(startDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }));
        
        const endDate = new Date(timeEntry.endTime);
        setEndTime(endDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }));
      } else {
        // Reset form for new entry
        setTopicId(topics.length > 0 ? topics[0].id.toString() : "");
        setDescription("");
        setDate(new Date().toISOString().slice(0, 10));
        setStartTime("09:00");
        setEndTime("10:00");
      }
    }
  }, [open, timeEntry, isTimeEntryLoaded, topics]);
  
  const createTimeEntryMutation = useMutation({
    mutationFn: async (newTimeEntry: InsertTimeEntry) => {
      const res = await apiRequest("POST", "/api/time-entries", newTimeEntry);
      return await res.json();
    },
    onSuccess: () => {
      invalidateQueries();
      toast({
        title: "רשומת זמן נוצרה בהצלחה",
        description: `רשומת הזמן נוצרה בהצלחה.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "שגיאה ביצירת רשומת זמן",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const updateTimeEntryMutation = useMutation({
    mutationFn: async (updatedTimeEntry: Partial<InsertTimeEntry>) => {
      const res = await apiRequest("PUT", `/api/time-entries/${timeEntryId}`, updatedTimeEntry);
      return await res.json();
    },
    onSuccess: () => {
      invalidateQueries();
      toast({
        title: "רשומת זמן עודכנה בהצלחה",
        description: `רשומת הזמן עודכנה בהצלחה.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "שגיאה בעדכון רשומת זמן",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/daily"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/topic-distribution"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly-overview"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/recent-sessions"] });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topicId) {
      toast({
        title: "שגיאה",
        description: "חובה לבחור נושא",
        variant: "destructive",
      });
      return;
    }
    
    // Create Date objects for start and end times
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);
    
    // Validate that end time is after start time
    if (endDateTime <= startDateTime) {
      toast({
        title: "שגיאה",
        description: "זמן הסיום חייב להיות אחרי זמן ההתחלה",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate duration in seconds
    const duration = calculateDurationInSeconds(startDateTime, endDateTime);
    
    if (timeEntryId) {
      // Update existing time entry
      updateTimeEntryMutation.mutate({
        topicId: parseInt(topicId),
        description,
        startTime: startDateTime,
        endTime: endDateTime,
        duration,
        isManual: true
      });
    } else {
      // Create new time entry
      createTimeEntryMutation.mutate({
        userId,
        topicId: parseInt(topicId),
        description,
        startTime: startDateTime,
        endTime: endDateTime,
        duration,
        isManual: true
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{timeEntryId ? "עריכת רשומת זמן" : "הוספת זמן ידנית"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic">נושא</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger className="w-1/3 text-right">
                  <SelectValue placeholder="בחר נושא" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(topic => (
                    <SelectItem key={topic.id} value={topic.id.toString()}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-sm ml-2" 
                          style={{ backgroundColor: topic.color }}
                        />
                        {topic.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">תיאור</Label>
              <Input
                id="description"
                placeholder="הזן תיאור פעילות..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">תאריך</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">זמן התחלה</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">זמן סיום</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
            <Button 
              type="submit"
              disabled={createTimeEntryMutation.isPending || updateTimeEntryMutation.isPending}
            >
              {timeEntryId ? "עדכן" : "שמור"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
