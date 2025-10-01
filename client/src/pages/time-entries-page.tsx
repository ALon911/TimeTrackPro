import { SyncedTimeTracker } from "@/components/synced-time-tracker";
import { TimeEntriesTable } from "@/components/time-entries-table";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ManualTimeEntry } from "@/components/manual-time-entry";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function TimeEntriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  
  const { data: topics, isLoading: isLoadingTopics } = useQuery({
    queryKey: ["/api/topics"],
  });

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">מעקב זמן</h2>
        <p className="text-neutral-600 dark:text-neutral-400">נהל את רשומות הזמן שלך</p>
      </div>
      
      {/* Timer Section */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">נתחיל לעקוב</h3>
        </div>
        <SyncedTimeTracker />
      </section>
      
      {/* Time Entries Section */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">רשומות זמן</h3>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="search" className="mb-2 block">חיפוש רשומות</Label>
            <Input
              id="search"
              placeholder="חפש לפי תיאור..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full md:w-48">
            <Label htmlFor="topic-filter" className="mb-2 block">סנן לפי נושא</Label>
            {isLoadingTopics ? (
              <Select disabled>
                <SelectTrigger id="topic-filter" className="select-trigger">
                  <SelectValue placeholder="טוען נושאים..." className="select-value" />
                </SelectTrigger>
              </Select>
            ) : (
              <Select
                value={selectedTopic}
                onValueChange={setSelectedTopic}
              >
                <SelectTrigger id="topic-filter" className="select-trigger w-1/3 text-right">
                  <SelectValue placeholder="בחר נושא" className="select-value" />
                </SelectTrigger>
                <SelectContent className="select-content">
                  <SelectGroup>
                    <SelectItem value="all" className="select-item">
                        <div className="select-item-content">
                          <span>כל הנושאים</span>
                        </div>
                    </SelectItem>
                    {topics?.map((topic: any) => (
                      <SelectItem key={topic.id} value={topic.id.toString()} className="select-item">
                        <div className="select-item-content">
                          <span>{topic.name}</span>
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: topic.color }} />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {/* Time Entries Table */}
        <TimeEntriesTable
          limit={10}
          showViewAllLink={false}
          searchTerm={searchTerm}
          topicId={selectedTopic !== "all" ? parseInt(selectedTopic) : undefined}
        />
      </section>
    </>
  );
}