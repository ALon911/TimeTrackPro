import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { TopicForm } from "@/components/topic-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function TopicsPage() {
  const { toast } = useToast();
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);

  const { data: rawTopics = [], isLoading: isLoadingTopics } = useQuery({
    queryKey: ['/api/topics'],
  });
  
  // Manually de-duplicate topics to ensure we never show duplicates
  const topicsMap = new Map();
  if (Array.isArray(rawTopics)) {
    rawTopics.forEach(topic => {
      if (topic && topic.id) {
        topicsMap.set(topic.id, topic);
      }
    });
  }
  const topics = Array.from(topicsMap.values());

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/topics", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
      setIsAddTopicOpen(false);
      toast({
        title: "נושא חדש נוצר בהצלחה",
        variant: "default",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/topics/${data.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
      setEditingTopic(null);
      toast({
        title: "הנושא עודכן בהצלחה",
        variant: "default",
      });
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/topics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
      toast({
        title: "הנושא נמחק בהצלחה",
        variant: "default",
      });
    }
  });
  
  const handleEdit = (topic: any) => {
    setEditingTopic(topic);
  };
  
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">נושאים</h2>
          <p className="text-neutral-600">נהל את הנושאים שלך למעקב הזמן</p>
        </div>
        
        <Dialog open={isAddTopicOpen} onOpenChange={setIsAddTopicOpen}>
          <DialogTrigger asChild>
            <Button>
              <span className="material-icons ml-2">add</span>
              נושא חדש
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוסף נושא חדש</DialogTitle>
              <DialogDescription>
                צור נושא חדש לשימוש בטיימרים שלך
              </DialogDescription>
            </DialogHeader>
            <TopicForm 
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
              onSuccess={() => setIsAddTopicOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {editingTopic && (
        <Dialog open={!!editingTopic} onOpenChange={() => setEditingTopic(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ערוך נושא</DialogTitle>
              <DialogDescription>
                שנה את פרטי הנושא שבחרת
              </DialogDescription>
            </DialogHeader>
            <TopicForm 
              defaultValues={editingTopic}
              onSubmit={(data) => updateMutation.mutate({ ...data, id: editingTopic.id })}
              isPending={updateMutation.isPending}
              onSuccess={() => setEditingTopic(null)}
            />
          </DialogContent>
        </Dialog>
      )}
      
      <section className="mt-8">
        {isLoadingTopics ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center p-10 border rounded-md">
            <p className="text-muted-foreground mb-4">עדיין אין לך נושאים</p>
            <Button onClick={() => setIsAddTopicOpen(true)}>הוסף את הנושא הראשון שלך</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {topics.map((topic: any) => (
              <Card key={topic.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: topic.color }}
                      />
                      <h3 className="text-lg font-medium">{topic.name}</h3>
                    </div>
                    <div className="flex gap-1 -mr-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(topic)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                            <AlertDialogDescription>
                              פעולה זו לא ניתנת לביטול. זה ימחק לצמיתות את הנושא ואת כל הרשומות המשויכות אליו.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(topic.id)} className="bg-destructive text-destructive-foreground">
                              כן, מחק
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
