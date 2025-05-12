import { Sidebar } from "@/components/sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { TimeTracker } from "@/components/time-tracker";
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">מעקב זמן</h2>
            <p className="text-neutral-600">נהל את רשומות הזמן שלך</p>
          </div>
          
          {/* Timer Section */}
          <section className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">מעקב זמן</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <span className="material-icons ml-2">add</span>
                    הוסף ידנית
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>הוספת זמן ידנית</DialogTitle>
                  </DialogHeader>
                  <ManualTimeEntry />
                </DialogContent>
              </Dialog>
            </div>
            <TimeTracker />
          </section>
          
          {/* Filters and Entries */}
          <section className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">רשומות זמן</h3>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="search" className="mb-2 block">חיפוש</Label>
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
                    <SelectTrigger id="topic-filter">
                      <SelectValue placeholder="טוען נושאים..." />
                    </SelectTrigger>
                  </Select>
                ) : (
                  <Select
                    value={selectedTopic}
                    onValueChange={setSelectedTopic}
                  >
                    <SelectTrigger id="topic-filter">
                      <SelectValue placeholder="בחר נושא" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">כל הנושאים</SelectItem>
                        {topics?.map((topic: any) => (
                          <SelectItem key={topic.id} value={topic.id.toString()}>
                            {topic.name}
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
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}
