import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MoreVertical, Loader2, Edit, Trash2 } from "lucide-react";
import { format, isThisWeek, startOfWeek, endOfWeek } from "date-fns";
import { he } from "date-fns/locale";
import { formatDurationHumanReadable } from "@/lib/time-utils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { ManualTimeEntry } from "./manual-time-entry";

interface TimeEntriesTableProps {
  limit?: number;
  showViewAllLink?: boolean;
  searchTerm?: string;
  topicId?: number;
  filterByCurrentWeek?: boolean;
}

export function TimeEntriesTable({ 
  limit = 4, 
  showViewAllLink = false,
  searchTerm = "",
  topicId,
  filterByCurrentWeek = false,
}: TimeEntriesTableProps) {
  const { toast } = useToast();
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  
  // Setup filter parameters
  let queryParams = `?limit=${limit}`;
  if (topicId) {
    queryParams += `&topicId=${topicId}`;
  }
  
  const { data: entries, isLoading } = useQuery({
    queryKey: ["/api/time-entries" + queryParams],
    refetchInterval: 3000, // רענון אוטומטי כל 3 שניות
    refetchOnWindowFocus: true, // רענון כאשר המשתמש חוזר לחלון
  });
  
  const { data: topics } = useQuery({
    queryKey: ["/api/topics"],
    staleTime: Infinity,
  });
  
  // Delete mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/time-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/recent-sessions"] });
      
      toast({
        title: "רשומה נמחקה",
        description: "רשומת הזמן נמחקה בהצלחה",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה במחיקה",
        description: `שגיאה במחיקת רשומת הזמן: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filter entries based on search term and current week if needed
  // First remove potential duplicates by using a Map with entry id as key
  const uniqueEntries = entries && Array.isArray(entries) ? 
    Array.from(new Map(entries.map((entry: any) => [entry.id, entry])).values()) : 
    [];
    
  const filteredEntries = uniqueEntries.filter((entry: any) => {
    // Filter by search term
    if (searchTerm && !entry.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by current week if needed
    if (filterByCurrentWeek) {
      const entryDate = new Date(entry.startTime);
      if (!isThisWeek(entryDate, { locale: he })) {
        return false;
      }
    }
    
    return true;
  });
  
  // Function to find topic name by ID
  const getTopicName = (topicId: number) => {
    if (!topics || !Array.isArray(topics)) return "לא ידוע";
    const topic = topics.find((t: any) => t.id === topicId);
    return topic?.name || "לא ידוע";
  };
  
  // Function to get topic color by ID
  const getTopicColor = (topicId: number) => {
    if (!topics || !Array.isArray(topics)) return "#6366f1";
    const topic = topics.find((t: any) => t.id === topicId);
    return topic?.color || "#6366f1";
  };
  
  // Function to format the date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d בMMMM yyyy", { locale: he });
  };
  
  // Function to format the time range
  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${format(start, "HH:mm", { locale: he })} - ${format(end, "HH:mm", { locale: he })}`;
  };
  
  // Function to handle entry deletion
  const handleDelete = (id: number) => {
    deleteEntryMutation.mutate(id);
  };
  
  // Function to handle entry edit
  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return (
      <div className="text-center p-10">
        <p className="text-neutral-500">אין רשומות זמן להצגה</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold dark:text-white">פעילות אחרונה</h3>
        {showViewAllLink && (
          <Link href="/time-entries">
            <span className="text-primary text-sm hover:underline cursor-pointer">הצג הכל</span>
          </Link>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">תיאור</TableHead>
              <TableHead className="text-center">נושא</TableHead>
              <TableHead className="text-center">תאריך</TableHead>
              <TableHead className="text-center">זמן</TableHead>
              <TableHead className="text-center">משך</TableHead>
              <TableHead className="text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries?.slice(0, limit).map((entry: any) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium text-center">{entry.description || "---"}</TableCell>
                <TableCell className="text-center">
                  <span 
                    className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    style={{ 
                      backgroundColor: `${getTopicColor(entry.topicId)}20`,
                      color: getTopicColor(entry.topicId)
                    }}
                  >
                    {getTopicName(entry.topicId)}
                  </span>
                </TableCell>
                <TableCell className="text-neutral-600 text-center" dir="rtl">{formatDate(entry.startTime)}</TableCell>
                <TableCell className="text-neutral-600 text-center">{formatTimeRange(entry.startTime, entry.endTime)}</TableCell>
                <TableCell className="text-neutral-600 text-center" dir="rtl">
                  {formatDurationHumanReadable(entry.duration)}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => {
                            e.preventDefault();
                            handleEdit(entry);
                          }}>
                            <Edit className="ml-2 h-4 w-4" />
                            <span>ערוך</span>
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>עריכת רשומת זמן</DialogTitle>
                          </DialogHeader>
                          <ManualTimeEntry />
                        </DialogContent>
                      </Dialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500">
                            <Trash2 className="ml-2 h-4 w-4" />
                            <span>מחק</span>
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>מחיקת רשומת זמן</AlertDialogTitle>
                            <AlertDialogDescription>
                              האם אתה בטוח שברצונך למחוק את רשומת הזמן הזו?
                              לא ניתן לשחזר פעולה זו.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(entry.id)}
                              className="bg-red-500 hover:bg-red-700"
                            >
                              מחק
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
