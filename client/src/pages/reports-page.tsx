import { useState } from "react";
import { WeeklyChart } from "@/components/charts/weekly-chart";
import { TopicDistributionChart } from "@/components/charts/topic-distribution-chart";
import { StatCard } from "@/components/stat-card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, Clock, TrendingUp, BarChart, Users, Info, Download, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { formatDurationHumanReadable } from "@/lib/time-utils";
import { he } from "date-fns/locale";
import { TimeEntriesTable } from "@/components/time-entries-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTeams } from "@/hooks/use-teams";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TeamMemberActivity {
  userId: number;
  username: string;
  email: string;
  totalTime: number;
  totalSeconds: number;
  topicCount: number;
}

interface TeamTopicDistribution {
  topic: {
    id: number;
    name: string;
    color: string;
  };
  totalTime: number;
  percentage: number;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string>("personal");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const { teams, isLoadingTeams } = useTeams();
  const { toast } = useToast();

  // Personal stats queries
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

  // Team stats queries
  const { data: teamMemberActivity, isLoading: isLoadingTeamMemberActivity } = useQuery({
    queryKey: ["/api/teams/stats/member-activity", selectedTeam],
    queryFn: async () => {
      if (!selectedTeam) return [];
      try {
        const res = await apiRequest('GET', `/api/teams/${selectedTeam}/stats/member-activity`);
        return await res.json();
      } catch (error) {
        console.error("Error loading team members:", error);
        return [];
      }
    },
    enabled: !!selectedTeam,
  });

  const { data: teamTopicDistribution, isLoading: isLoadingTeamTopicDistribution } = useQuery({
    queryKey: ["/api/teams/stats/topic-distribution", selectedTeam],
    queryFn: async () => {
      if (!selectedTeam) return [];
      try {
        const res = await apiRequest('GET', `/api/teams/${selectedTeam}/stats/topic-distribution`);
        return await res.json();
      } catch (error) {
        console.error("Error loading team topic distribution:", error);
        return [];
      }
    },
    enabled: !!selectedTeam,
  });

  const { data: teamStats, isLoading: isLoadingTeamStats } = useQuery({
    queryKey: ["/api/teams/stats", selectedTeam],
    queryFn: async () => {
      if (!selectedTeam) return { totalTime: 0, memberCount: 0, topicCount: 0 };
      try {
        const res = await apiRequest('GET', `/api/teams/${selectedTeam}/stats`);
        return await res.json();
      } catch (error) {
        console.error("Error loading team stats:", error);
        return { totalTime: 0, memberCount: 0, topicCount: 0 };
      }
    },
    enabled: !!selectedTeam,
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

  // Get team name from ID
  const getTeamName = (teamId: string) => {
    if (!teams) return "";
    const team = teams.find(t => t.id.toString() === teamId);
    return team?.name || "";
  };

  // Handle export to Excel
  const handleExportPersonalData = async () => {
    try {
      // לבדוק אם יש שגיאות או בעיות קריאה בלבד תחילה
      const checkResponse = await fetch('/api/export', {
        method: 'HEAD'
      });
      
      if (checkResponse.headers.get('Content-Type')?.includes('application/json')) {
        // יש שגיאה - לקרוא את הנתונים
        const response = await fetch('/api/export');
        const data = await response.json();
        
        if (data.readOnly) {
          toast({
            title: "מצב הדגמה",
            description: "לא ניתן לייצא נתונים במצב הדגמה. מסד הנתונים במצב קריאה בלבד.",
            variant: "destructive"
          });
          return;
        }
        
        if (!data.success) {
          toast({
            title: "שגיאה בייצוא",
            description: data.error || "אירעה שגיאה בעת ייצוא הנתונים. נסה שוב מאוחר יותר.",
            variant: "destructive"
          });
          return;
        }
      }
      
      // אם הגענו לכאן, אפשר להמשיך בהורדה
      window.location.href = '/api/export';
      
      toast({
        title: "ייצוא התחיל",
        description: "הדוח האישי שלך יורד כקובץ אקסל",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "שגיאה בייצוא",
        description: "לא הצלחנו לייצא את הנתונים. נסה שוב מאוחר יותר.",
        variant: "destructive"
      });
    }
  };
  
  const handleExportTeamData = async () => {
    if (!selectedTeam) {
      toast({
        title: "בחר צוות",
        description: "יש לבחור צוות לפני ייצוא",
        variant: "destructive"
      });
      return;
    }
    
    console.log("מתחיל ייצוא צוות עם מזהה:", selectedTeam);
    
    try {
      // לבדוק אם יש שגיאות או בעיות קריאה בלבד תחילה
      const checkResponse = await fetch(`/api/teams/${selectedTeam}/export`, {
        method: 'HEAD'
      });
      
      if (checkResponse.headers.get('Content-Type')?.includes('application/json')) {
        // יש שגיאה - לקרוא את הנתונים
        const response = await fetch(`/api/teams/${selectedTeam}/export`);
        const data = await response.json();
        
        if (data.readOnly) {
          toast({
            title: "מצב הדגמה",
            description: "לא ניתן לייצא נתונים במצב הדגמה. מסד הנתונים במצב קריאה בלבד.",
            variant: "destructive"
          });
          return;
        }
        
        if (!data.success) {
          toast({
            title: "שגיאה בייצוא",
            description: data.error || "אירעה שגיאה בעת ייצוא הנתונים. נסה שוב מאוחר יותר.",
            variant: "destructive"
          });
          return;
        }
      }
      
      // אם הגענו לכאן, אפשר להמשיך בהורדה
      window.location.href = `/api/teams/${selectedTeam}/export`;
      
      toast({
        title: "ייצוא התחיל",
        description: "אם הדו״ח מוכן, הוא יורד אוטומטית לקומפיוטר שלך",
      });
    } catch (error) {
      console.error("Error during team data export:", error);
      toast({
        title: "שגיאה בייצוא",
        description: "אירעה שגיאה בעת ייצוא הנתונים. נסה שוב מאוחר יותר.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">דוחות</h2>
          <p className="text-muted-foreground">סקירת הנתונים וסטטיסטיקות</p>
        </div>
        
        {activeTab === "personal" ? (
          <Button onClick={handleExportPersonalData} variant="outline" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>ייצא לאקסל</span>
          </Button>
        ) : selectedTeam ? (
          <Button onClick={handleExportTeamData} variant="outline" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>ייצא לאקסל</span>
          </Button>
        ) : null}
      </div>
      
      <Tabs defaultValue="personal" value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="personal">הדוחות שלי</TabsTrigger>
          <TabsTrigger value="team" disabled={teams?.length === 0}>דוחות צוות</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" className="mt-6">
          {/* Personal Stats Cards */}
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
                  trend={dailyStats?.increase ? dailyStats?.percentChange : -(dailyStats?.percentChange || 0)} 
                  trendLabel={dailyStats?.percentChange > 0 ? 'מאתמול' : 'מאתמול'}
                  iconBg="bg-primary/10"
                  iconColor="text-primary"
                  secondaryValue={(dailyStats?.total === 0 || !dailyStats?.total) 
                    ? "אין נתוני זמן עדיין" 
                    : formatDurationHumanReadable(dailyStats?.total || 0)}
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
                  trend={weeklyStats?.increase ? weeklyStats?.percentChange : -(weeklyStats?.percentChange || 0)} 
                  trendLabel="מהשבוע הקודם"
                  iconBg="bg-blue-100"
                  iconColor="text-blue-700"
                  secondaryValue={(weeklyStats?.total === 0 || !weeklyStats?.total) 
                    ? "אין נתוני זמן עדיין" 
                    : formatDurationHumanReadable(weeklyStats?.total || 0)}
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
                  secondaryValue={(mostTracked?.totalTime === 0 || !mostTracked?.totalTime) 
                    ? "אין נתוני זמן עדיין" 
                    : `${formatTime(mostTracked?.totalTime || 0)} (${formatDurationHumanReadable(mostTracked?.totalTime || 0)})`}
                  color={mostTracked?.topic?.color}
                  iconBg="bg-green-100"
                  iconColor="text-green-700"
                />
              )}
              
              <StatCard 
                title="סה״כ נושאים" 
                value={topicDistribution?.length ? topicDistribution.length.toString() : '0'} 
                icon={<BarChart className="h-4 w-4" />}
                iconBg="bg-purple-100"
                iconColor="text-purple-700"
              />
            </div>
          </section>
          
          {/* Personal Charts */}
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
        </TabsContent>
        
        <TabsContent value="team" className="mt-6">
          {/* Team Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>בחר צוות לצפייה בנתונים</CardTitle>
              <CardDescription>הצג סטטיסטיקות וניתוחים עבור הצוות הנבחר</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTeams ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : teams?.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-muted-foreground">אין לך צוותים פעילים כרגע</p>
                </div>
              ) : (
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="בחר צוות" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
          
          {selectedTeam ? (
            <>
              {/* Team Stats */}
              <div className="text-xl font-bold mb-4">צוות: {getTeamName(selectedTeam)}</div>
              
              {/* Team Overview Stats */}
              <section className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard 
                    title="זמן כולל של הצוות" 
                    value={formatTime(teamStats?.totalSeconds || 0)} 
                    icon={<Clock className="h-4 w-4" />}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-700"
                  />
                  
                  <StatCard 
                    title="חברי צוות" 
                    value={teamStats?.membersCount?.toString() || '0'} 
                    icon={<Users className="h-4 w-4" />}
                    iconBg="bg-green-100"
                    iconColor="text-green-700"
                  />
                  
                  <StatCard 
                    title="נושאים בצוות" 
                    value={teamTopicDistribution?.length?.toString() || '0'} 
                    icon={<BarChart className="h-4 w-4" />}
                    iconBg="bg-purple-100"
                    iconColor="text-purple-700"
                  />
                </div>
              </section>
              
              {/* Team Member Activity */}
              <section className="mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>פעילות חברי צוות</CardTitle>
                    <CardDescription>מידע על הפעילות והזמן שמושקע על ידי כל חבר בצוות</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTeamMemberActivity ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : !teamMemberActivity || teamMemberActivity.length === 0 ? (
                      <div className="text-center py-8">
                        <Info className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">אין נתוני פעילות זמינים לצוות זה</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b text-center">
                              <th className="py-2 px-4 text-xs font-semibold">משתמש</th>
                              <th className="py-2 px-4 text-xs font-semibold">זמן כולל</th>
                              <th className="py-2 px-4 text-xs font-semibold">כמות נושאים</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamMemberActivity.map((member: TeamMemberActivity) => (
                              <tr key={member.userId} className="border-b hover:bg-muted/50">
                                <td className="py-2 px-4 text-center">{member.email}</td>
                                <td className="py-2 px-4 text-center">{formatTime(member.totalSeconds || 0)}</td>
                                <td className="py-2 px-4 text-center">{member.topicCount || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
              
              {/* Team Topic Distribution */}
              <section>
                <Card>
                  <CardHeader>
                    <CardTitle>התפלגות פעילות לפי נושא</CardTitle>
                    <CardDescription>כיצד מתחלק הזמן שצוות זה מבלה על משימות שונות</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTeamTopicDistribution ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : !teamTopicDistribution || teamTopicDistribution.length === 0 ? (
                      <div className="text-center py-8">
                        <Info className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">אין נתוני נושאים זמינים לצוות זה</p>
                      </div>
                    ) : (
                      <>
                        <div className="h-64 mb-6">
                          <TopicDistributionChart data={teamTopicDistribution} />
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b text-center">
                                <th className="py-2 px-4 text-xs font-semibold">נושא</th>
                                <th className="py-2 px-4 text-xs font-semibold">זמן כולל</th>
                                <th className="py-2 px-4 text-xs font-semibold">אחוז</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teamTopicDistribution.map((item: TeamTopicDistribution) => (
                                <tr key={item.topic.id} className="border-b hover:bg-muted/50">
                                  <td className="py-2 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.topic.color || '#888' }}></div>
                                      <span>{item.topic.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-4 text-center">{formatTime(item.totalSeconds || 0)}</td>
                                  <td className="py-2 px-4 text-center">{item.percentage?.toFixed(1) || 0}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </section>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </>
  );
}