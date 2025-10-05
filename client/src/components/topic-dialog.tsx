import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Topic, InsertTopic } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRandomColor } from "@/lib/utils";

interface TopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic?: Topic; // For editing existing topic
  userId: number;
}

export function TopicDialog({ open, onOpenChange, topic, userId }: TopicDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(getRandomColor());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Reset form when dialog opens or topic changes
  useEffect(() => {
    if (open) {
      if (topic) {
        setName(topic.name);
        setColor(topic.color);
      } else {
        setName("");
        setColor(getRandomColor());
      }
    }
  }, [open, topic]);
  
  const createTopicMutation = useMutation({
    mutationFn: async (newTopic: InsertTopic) => {
      const res = await apiRequest("POST", "/api/topics", newTopic);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({
        title: "נושא נוצר בהצלחה",
        description: `הנושא "${name}" נוצר בהצלחה.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "שגיאה ביצירת נושא",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const updateTopicMutation = useMutation({
    mutationFn: async (updatedTopic: Partial<InsertTopic>) => {
      const res = await apiRequest("PUT", `/api/topics/${topic!.id}`, updatedTopic);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({
        title: "נושא עודכן בהצלחה",
        description: `הנושא "${name}" עודכן בהצלחה.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "שגיאה בעדכון נושא",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast({
        title: "שגיאה",
        description: "חובה להזין שם נושא",
        variant: "destructive",
      });
      return;
    }
    
    if (topic) {
      // Update existing topic
      updateTopicMutation.mutate({
        name,
        color
      });
    } else {
      // Create new topic
      createTopicMutation.mutate({
        userId,
        name,
        color
      });
    }
  };
  
  // Predefined colors for selection
  const colors = [
    '#6366f1', // indigo (primary)
    '#8b5cf6', // violet (secondary)
    '#ec4899', // pink
    '#10b981', // emerald (success)
    '#f59e0b', // amber
    '#ef4444', // red (error)
    '#06b6d4', // cyan
    '#3b82f6', // blue
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{topic ? "עריכת נושא" : "נושא חדש"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם הנושא</Label>
              <Input
                id="name"
                placeholder="הזן שם נושא..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>צבע</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
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
              disabled={createTopicMutation.isPending || updateTopicMutation.isPending}
            >
              {topic ? "עדכן" : "שמור"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
