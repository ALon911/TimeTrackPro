import { Sidebar } from "@/components/sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { WeeklyChart } from "@/components/charts/weekly-chart";
import { TopicDistributionChart } from "@/components/charts/topic-distribution-chart";
import { StatCard } from "@/components/stat-card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, Clock, TrendingUp, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, endOfWeek, isThisWeek } from "date-fns";
import { he } from "date-fns/locale";
import { TimeEntriesTable } from "@/components/time-entries-table";

export default function ReportsPage() {
  const { data: dailyStats, isLoading: isLoadingDaily } = useQuery({
    queryKey: ["/api/stats/daily"],
  });

  const { data: weeklyStats, isLoading: isLoadingWeekly } = useQuery({
    queryKey: ["/api/stats/weekly"],
  });

  const { data: mostTracked, isLoading: isLoadingMostTracked } = useQuery({
    queryKey: ["/api/stats/most-tracked"],
  });

  const { data: topicDistribution, isLoading: isLoadingDistribution } = useQuery({
    queryKey: ["/api/stats/topic-distribution"],
  });

  // Helper function to format seconds to HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format date range for current week
  const today = new Date();
  const start = startOfWeek(today, { locale: he });
  const end = endOfWeek(today, { locale: he });
  const weekRange = `${format(start, 'd MMM', { locale: he })} - ${format(end, 'd MMM', { locale: he })}`;

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
            <h2 className="text-2xl font-bold mb-1">דוחות</h2>
            <p className="text-neutral-600">סקירת הנתונים וסטטיסטיקות</p>
          </div>
          
          {/* Stats Cards */}
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoadingDaily ? (
                <div className="h-32 bg-white rounded-xl flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <StatCard
                  title="סהכ היום"
                  value={formatDuration(dailyStats?.total || 0)}
                  icon={<Clock className="h-5 w-5" />}
                  iconBg="bg-blue-100"
                  iconColor="text-primary"
                  change={dailyStats?.percentChange || 0}
                  increase={dailyStats?.increase || false}
                  compareText="משמול"
                />
              )}
              
              {isLoadingWeekly ? (
                <div className="h-32 bg-white rounded-xl flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <StatCard
                  title="סהכ השבוע"
                  value={formatDuration(weeklyStats?.total || 0)}
                  icon={<Calendar className="h-5 w-5" />}
                  iconBg="bg-purple-100"
                  iconColor="text-secondary"
                  change={weeklyStats?.percentChange || 0}
                  increase={weeklyStats?.increase || false}
                  compareText="משבוע שעבר"
                />
              )}
              
              {isLoadingMostTracked ? (
                <div className="h-32 bg-white rounded-xl flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : mostTracked ? (
                <StatCard
                  title="הנושא המוביל"
                  value={mostTracked?.topic?.name || "אין נתונים"}
                  icon={<TrendingUp className="h-5 w-5" />}
                  iconBg="bg-blue-100"
                  iconColor="text-primary"
                  infoText={`${formatDuration(mostTracked?.totalTime || 0)} שעות החודש`}
                />
              ) : (
                <StatCard
                  title="הנושא המוביל"
                  value="אין נתונים"
                  icon={<TrendingUp className="h-5 w-5" />}
                  iconBg="bg-blue-100"
                  iconColor="text-primary"
                  infoText="אין נתונים להצגה"
                />
              )}
              
              {isLoadingDistribution ? (
                <div className="h-32 bg-white rounded-xl flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <StatCard
                  title="מספר נושאים פעילים"
                  value={(topicDistribution?.filter((t: any) => t.totalTime > 0)?.length || 0).toString()}
                  icon={<BarChart className="h-5 w-5" />}
                  iconBg="bg-green-100"
                  iconColor="text-success"
                  infoText="נושאים עם רשומות זמן החודש"
                />
              )}
            </div>
          </section>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">סקירה שבועית</CardTitle>
                <p className="text-sm text-neutral-500">{weekRange}</p>
              </CardHeader>
              <CardContent>
                <WeeklyChart />
              </CardContent>
            </Card>
            
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">התפלגות לפי נושא</CardTitle>
                <p className="text-sm text-neutral-500">החודש הנוכחי</p>
              </CardHeader>
              <CardContent>
                <TopicDistributionChart />
              </CardContent>
            </Card>
          </div>
          
          {/* Weekly Time Entries */}
          <Card className="shadow-md mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">רשומות השבוע</CardTitle>
              <p className="text-sm text-neutral-500">{weekRange}</p>
            </CardHeader>
            <CardContent>
              <TimeEntriesTable 
                limit={10} 
                showViewAllLink={true} 
                filterByCurrentWeek={true}
              />
            </CardContent>
          </Card>
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}
