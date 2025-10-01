import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { SyncedTimeTracker } from "@/components/synced-time-tracker";
import { StatCard } from "@/components/stat-card";
import { WeeklyChart } from "@/components/charts/weekly-chart";
import { TopicDistributionChart } from "@/components/charts/topic-distribution-chart";
import { TimeEntriesTable } from "@/components/time-entries-table";
import { InvitationNotification } from "@/components/invitation-notification";
import SuggestionsWidget from "@/components/suggestions-widget";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarCheck2, Calendar, TrendingUp, ListChecks } from "lucide-react";
import { MobileHeader } from "@/components/mobile-header";
import { MobileNavigation } from "@/components/mobile-navigation";

export default function DashboardPage() {
  const { user } = useAuth();
  const today = new Date();
  const formattedDate = format(today, "EEEE, d בMMMM yyyy", { locale: he });

  const { data: dailyStats, isLoading: isLoadingDaily } = useQuery({
    queryKey: ["/api/stats/daily"],
  });

  const { data: weeklyStats, isLoading: isLoadingWeekly } = useQuery({
    queryKey: ["/api/stats/weekly"],
  });

  const { data: mostTracked, isLoading: isLoadingMostTracked } = useQuery({
    queryKey: ["/api/stats/most-tracked"],
  });

  const { data: recentSessions, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["/api/stats/recent-sessions"],
  });

  // Helper function to format seconds to HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8 mb-16 md:mb-0">
      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1 dark:text-white">שלום!</h2>
        <p className="text-neutral-600 dark:text-neutral-400">{formattedDate}</p>
      </div>
      
      {/* Timer Section */}
      <section className="bg-card dark:bg-slate-800 rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-white">מעקב זמן</h3>
        <SyncedTimeTracker />
      </section>
      
      {/* Stats Overview */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-white">סטטיסטיקה</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoadingDaily ? (
            <div className="h-32 bg-card dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <StatCard
              title="סהכ היום"
              value={dailyStats ? formatDuration(dailyStats.total) : "אין נתונים"}
              icon={<CalendarCheck2 className="h-5 w-5" />}
              iconBg="bg-blue-100 dark:bg-blue-900"
              iconColor="text-primary"
              change={dailyStats ? dailyStats.percentChange : 0}
              increase={dailyStats ? dailyStats.increase : false}
              compareText="מאתמול"
            />
          )}
          
          {isLoadingWeekly ? (
            <div className="h-32 bg-card dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <StatCard
              title="סהכ השבוע"
              value={formatDuration(weeklyStats?.total || 0)}
              icon={<Calendar className="h-5 w-5" />}
              iconBg="bg-purple-100 dark:bg-purple-900"
              iconColor="text-secondary"
              change={weeklyStats?.percentChange || 0}
              increase={weeklyStats?.increase || false}
              compareText="משבוע שעבר"
            />
          )}
          
          {isLoadingMostTracked ? (
            <div className="h-32 bg-card dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : mostTracked ? (
            <StatCard
              title="הנושא המוביל"
              value={mostTracked?.topic?.name || "אין נתונים"}
              icon={<TrendingUp className="h-5 w-5" />}
              iconBg="bg-blue-100 dark:bg-blue-900"
              iconColor="text-primary"
              infoText={`${formatDuration(mostTracked?.totalTime || 0)} שעות החודש`}
            />
          ) : (
            <StatCard
              title="הנושא המוביל"
              value="אין נתונים"
              icon={<TrendingUp className="h-5 w-5" />}
              iconBg="bg-blue-100 dark:bg-blue-900"
              iconColor="text-primary"
              infoText="אין נתונים להצגה"
            />
          )}
          
          {isLoadingRecent ? (
            <div className="h-32 bg-card dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <StatCard
              title="מספר רשומות"
              value={recentSessions?.length.toString() || "0"}
              icon={<ListChecks className="h-5 w-5" />}
              iconBg="bg-green-100 dark:bg-green-900"
              iconColor="text-success dark:text-green-400"
              infoText={`${recentSessions?.length || 0} רשומות השבוע`}
            />
          )}
        </div>
      </section>
      
      {/* Team Invitations Section */}
      <div className="mb-8">
        <InvitationNotification />
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <WeeklyChart />
        <TopicDistributionChart />
      </div>
      
      
      {/* AI Suggestions Section */}
      <div className="mb-8">
        <SuggestionsWidget />
      </div>
      
      {/* Recent Activity Section */}
      <TimeEntriesTable limit={4} showViewAllLink={true} />
    </div>
  );
}
