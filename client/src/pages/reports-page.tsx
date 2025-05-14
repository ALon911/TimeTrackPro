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

  const { data: weeklyOverview, isLoading: isLoadingWeeklyOverview } = useQuery({
    queryKey: ["/api/stats/weekly-overview"],
  });

  const formatTime = (seconds: number) => {
    if (!seconds) return '0:00:00';
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
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">דוחות</h2>
        <p className="text-muted-foreground">סקירת הנתונים וסטטיסטיקות</p>
      </div>
          
      {/* Stats Cards */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoadingDaily ? (
            <div className="h-32 bg-card rounded-xl flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <StatCard 
              title="היום" 
              value={formatTime(dailyStats?.total || 0)} 
              icon={<Calendar className="h-4 w-4" />} 
              trend={dailyStats?.percentChange} 
              trendLabel={dailyStats?.percentChange > 0 ? 'יותר מאתמול' : 'פחות מאתמול'}
            />
          )}
          
          {isLoadingWeekly ? (
            <div className="h-32 bg-card rounded-xl flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <StatCard 
              title="השבוע" 
              value={formatTime(weeklyStats?.total || 0)} 
              icon={<Clock className="h-4 w-4" />} 
              trend={weeklyStats?.percentChange} 
              trendLabel={weekRange}
            />
          )}
          
          {isLoadingMostTracked ? (
            <div className="h-32 bg-card rounded-xl flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <StatCard 
              title="נושא מוביל" 
              value={mostTracked?.topic?.name || 'אין נתונים'} 
              icon={<TrendingUp className="h-4 w-4" />} 
              secondaryValue={formatTime(mostTracked?.totalTime || 0)}
              color={mostTracked?.topic?.color}
            />
          )}
          
          <StatCard 
            title="סה״כ נושאים" 
            value={topicDistribution?.length || '0'} 
            icon={<BarChart className="h-4 w-4" />} 
          />
        </div>
      </section>
      
      {/* Charts */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>סקירה שבועית</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingWeeklyOverview ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : weeklyOverview?.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <p>אין נתונים להצגה</p>
                <p className="text-sm">התחל לעקוב אחר הזמן שלך כדי לראות סטטיסטיקות כאן</p>
              </div>
            ) : (
              <div className="h-64">
                <WeeklyChart data={weeklyOverview || []} />
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>התפלגות לפי נושא</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDistribution ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : topicDistribution?.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <p>אין נתונים להצגה</p>
                <p className="text-sm">צור נושאים והתחל לעקוב אחר הזמן שלך</p>
              </div>
            ) : (
              <div className="h-64">
                <TopicDistributionChart data={topicDistribution || []} />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      
      {/* Recent Sessions */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>פעילות אחרונה</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeEntriesTable 
              limit={5} 
              showViewAllLink={true}
            />
          </CardContent>
        </Card>
      </section>
    </>
  );
}