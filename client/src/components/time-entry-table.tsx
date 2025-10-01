import { TimeEntrySummary } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface TimeEntryTableProps {
  entries: TimeEntrySummary[];
  onEdit?: (id: number) => void;
  showAll?: boolean;
}

export function TimeEntryTable({ entries, onEdit, showAll = false }: TimeEntryTableProps) {
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/time-entries/${id}`);
    },
    onSuccess: () => {
      // Invalidate and refetch all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/topic-distribution"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/recent-sessions"] });
      
      toast({
        title: "רשומה נמחקה בהצלחה",
        description: "רשומת הזמן נמחקה מהמערכת",
      });
      
      setEntryToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "שגיאה במחיקת הרשומה",
        description: error.message,
        variant: "destructive",
      });
      setEntryToDelete(null);
    },
  });
  
  const handleDeleteConfirm = () => {
    if (entryToDelete !== null) {
      deleteEntryMutation.mutate(entryToDelete);
    }
  };
  
  const handleEdit = (id: number) => {
    if (onEdit) {
      onEdit(id);
    }
  };
  
  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeader className="text-center font-medium text-neutral-500">תיאור</TableHeader>
              <TableHeader className="text-center font-medium text-neutral-500">נושא</TableHeader>
              <TableHeader className="text-center font-medium text-neutral-500">תאריך</TableHeader>
              <TableHeader className="text-center font-medium text-neutral-500">זמן</TableHeader>
              <TableHeader className="text-center font-medium text-neutral-500">משך</TableHeader>
              <TableHeader className="text-center font-medium text-neutral-500"></TableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium text-center">{entry.description || "—"}</TableCell>
                <TableCell className="text-center">
                  <span 
                    className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" 
                    style={{ 
                      backgroundColor: `${entry.topic.color}20`, // Add 20% opacity
                      color: entry.topic.color 
                    }}
                  >
                    {entry.topic.name}
                  </span>
                </TableCell>
                <TableCell className="text-neutral-600 text-center">{entry.date}</TableCell>
                <TableCell className="text-neutral-600 text-center">{entry.timeRange}</TableCell>
                <TableCell className="text-neutral-600 text-center">{entry.duration}</TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-primary hover:text-blue-700"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(entry.id)}>
                        <Edit className="ml-2 h-4 w-4" />
                        <span>ערוך</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setEntryToDelete(entry.id)}
                      >
                        <Trash2 className="ml-2 h-4 w-4" />
                        <span>מחק</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                  אין רשומות זמן להצגה
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={entryToDelete !== null} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את רשומת הזמן לצמיתות ולא ניתן יהיה לשחזר אותה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
