import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseTimeToSeconds } from "@/lib/utils/time";

const formSchema = z.object({
  topicId: z.string().min(1, "נא לבחור נושא"),
  description: z.string().optional(),
  startTime: z.string().min(1, "נא להזין זמן התחלה"),
  endTime: z.string().min(1, "נא להזין זמן סיום"),
  date: z.string().min(1, "נא להזין תאריך"),
});

type FormValues = z.infer<typeof formSchema>;

export function ManualTimeEntry() {
  const { toast } = useToast();
  const { data: topics, isLoading: isLoadingTopics } = useQuery({ 
    queryKey: ['/api/topics'] 
  });
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topicId: "",
      description: "",
      startTime: "",
      endTime: "",
      date: new Date().toISOString().split('T')[0], // Today's date
    }
  });
  
  const createEntryMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Parse the form values
      const startDate = new Date(`${data.date}T${data.startTime}`);
      const endDate = new Date(`${data.date}T${data.endTime}`);
      
      // Calculate duration in seconds
      const durationSeconds = (endDate.getTime() - startDate.getTime()) / 1000;
      
      if (durationSeconds <= 0) {
        throw new Error("זמן הסיום חייב להיות אחרי זמן ההתחלה");
      }
      
      const timeEntry = {
        topicId: parseInt(data.topicId),
        description: data.description || null,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        duration: durationSeconds,
        isManual: true
      };
      
      const response = await apiRequest("POST", "/api/time-entries", timeEntry);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/daily'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/weekly'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/most-tracked'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/recent-sessions'] });
      
      toast({
        title: "זמן נוסף",
        description: "רשומת הזמן נוספה בהצלחה",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה",
        description: `שגיאה בהוספת רשומת זמן: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: FormValues) => {
    createEntryMutation.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="topic">נושא</Label>
        <Select onValueChange={(value) => register("topicId").onChange({ target: { value } } as any)}>
          <SelectTrigger id="topic" className="w-full text-right">
            <SelectValue placeholder="בחר נושא" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingTopics ? (
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
        {errors.topicId && (
          <p className="text-sm text-red-500">{errors.topicId.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">תיאור</Label>
        <Input
          id="description"
          placeholder="הזן תיאור פעילות..."
          {...register("description")}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="date">תאריך</Label>
        <Input
          id="date"
          type="date"
          {...register("date")}
        />
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">זמן התחלה</Label>
          <Input
            id="startTime"
            type="time"
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="text-sm text-red-500">{errors.startTime.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="endTime">זמן סיום</Label>
          <Input
            id="endTime"
            type="time"
            {...register("endTime")}
          />
          {errors.endTime && (
            <p className="text-sm text-red-500">{errors.endTime.message}</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            ביטול
          </Button>
        </DialogClose>
        <Button 
          type="submit" 
          disabled={createEntryMutation.isPending}
        >
          {createEntryMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          שמור
        </Button>
      </div>
    </form>
  );
}
