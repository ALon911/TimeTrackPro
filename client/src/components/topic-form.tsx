import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTopicSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DialogClose } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

const formSchema = insertTopicSchema.omit({ userId: true });

type TopicFormProps = {
  topic?: any;
  onSuccess: () => void;
};

// Predefined colors
const COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#f97316", // Orange
];

export function TopicForm({ topic, onSuccess }: TopicFormProps) {
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState(topic?.color || COLORS[0]);
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: topic?.name || "",
      color: topic?.color || COLORS[0],
    }
  });
  
  // Update the color when selected
  useEffect(() => {
    setValue("color", selectedColor);
  }, [selectedColor, setValue]);
  
  // Set up mutation for creating or updating a topic
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (topic) {
        // Update existing topic
        const response = await apiRequest("PUT", `/api/topics/${topic.id}`, data);
        return response.json();
      } else {
        // Create new topic
        const response = await apiRequest("POST", "/api/topics", data);
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: topic ? "נושא עודכן" : "נושא נוצר",
        description: topic ? "הנושא עודכן בהצלחה" : "הנושא נוצר בהצלחה",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה",
        description: `שגיאה: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">שם הנושא</Label>
        <Input
          id="name"
          placeholder="הזן שם נושא..."
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message?.toString()}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label>צבע</Label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full transition-all ${
                selectedColor === color ? "ring-2 ring-offset-2 ring-black" : ""
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
        {errors.color && (
          <p className="text-sm text-red-500">{errors.color.message?.toString()}</p>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            ביטול
          </Button>
        </DialogClose>
        <Button 
          type="submit" 
          disabled={mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          {topic ? "עדכן" : "צור נושא"}
        </Button>
      </div>
    </form>
  );
}
