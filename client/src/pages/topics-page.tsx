import { Sidebar } from "@/components/sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TopicForm } from "@/components/topic-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function TopicsPage() {
  const { toast } = useToast();
  const [editingTopic, setEditingTopic] = useState<any>(null);
  
  const { data: topics, isLoading } = useQuery({
    queryKey: ["/api/topics"],
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/topics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({
        title: "נושא נמחק",
        description: "הנושא נמחק בהצלחה",
      });
    },
    onError: (error) => {
      toast({
        title: "שגיאה",
        description: `שגיאה במחיקת הנושא: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleEdit = (topic: any) => {
    setEditingTopic(topic);
  };
  
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" dir="rtl">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white shadow-sm p-4 flex md:hidden items-center justify-between">
          <button className="p-1">
            <span className="material-icons">menu</span>
          </button>
          <h1 className="text-xl font-bold text-primary">TimeTracker</h1>
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
            <span className="text-sm font-medium">מ</span>
          </div>
        </header>
        
        <div className="flex-1 p-4 md:p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-1">נושאים</h2>
              <p className="text-neutral-600">נהל את הנושאים שלך למעקב הזמן</p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <span className="material-icons ml-2">add</span>
                  נושא חדש
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>הוספת נושא חדש</DialogTitle>
                </DialogHeader>
                <TopicForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/topics"] })} />
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Topics List */}
          <section className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h3 className="text-xl font-semibold mb-6">רשימת נושאים</h3>
            
            {isLoading ? (
              <div className="flex justify-center p-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : topics?.length === 0 ? (
              <div className="text-center p-10 text-neutral-500">
                <p>אין נושאים להצגה. הוסף נושא חדש כדי להתחיל.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics?.map((topic: any) => (
                  <Card key={topic.id} className="border border-neutral-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-sm ml-2"
                            style={{ backgroundColor: topic.color }}
                          />
                          <span className="font-medium">{topic.name}</span>
                        </div>
                        <div className="flex space-x-2 space-x-reverse">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(topic)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>עריכת נושא</DialogTitle>
                              </DialogHeader>
                              <TopicForm 
                                topic={editingTopic} 
                                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/topics"] })} 
                              />
                            </DialogContent>
                          </Dialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>מחיקת נושא</AlertDialogTitle>
                                <AlertDialogDescription>
                                  האם אתה בטוח שברצונך למחוק את הנושא "{topic.name}"?
                                  כל רשומות הזמן המשויכות לנושא זה יימחקו גם כן.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ביטול</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(topic.id)}
                                  className="bg-red-500 hover:bg-red-700"
                                >
                                  מחק
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}
