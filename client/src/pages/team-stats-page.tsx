import { useParams, Link } from 'wouter';
import { useTeamStats } from '@/hooks/use-team-stats';
import { useTeams } from '@/hooks/use-teams';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Clock, Download, LineChart, Users } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { formatTime, formatDurationHumanReadable } from '@/lib/time-utils';
import { Skeleton } from '@/components/ui/skeleton';

// User Hebrew locale for dates
const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return format(date, 'dd MMMM yyyy', { locale: he });
  } catch (error) {
    return dateStr;
  }
};

export default function TeamStatsPage() {
  const { teamId } = useParams();
  const teamIdNumber = teamId ? parseInt(teamId) : undefined;
  
  const { teamStats, memberActivity, topicDistribution, teamMembers, isLoading, error } = useTeamStats(teamIdNumber);
  const { teams } = useTeams();

  // Find current team name
  const team = teams?.find(t => t.id === teamIdNumber);
  
  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            <Skeleton className="h-10 w-48" />
          </h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-4">שגיאה בטעינת נתוני הצוות</h2>
          <p className="text-muted-foreground mb-6">{error.message || 'אירעה שגיאה בעת טעינת נתוני הצוות'}</p>
          <Link href="/teams">
            <Button>חזרה לרשימת הצוותים</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">סטטיסטיקות צוות</h1>
          <p className="text-muted-foreground mt-1">{team?.name || ''}</p>
        </div>
        
        {teamIdNumber && (
          <div className="flex gap-2">
            <Link href={`/teams`}>
              <Button variant="outline">חזרה לרשימת הצוותים</Button>
            </Link>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="members">חברי צוות</TabsTrigger>
          <TabsTrigger value="topics">נושאים</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {teamStats && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    זמן כולל
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatTime(teamStats.totalSeconds)}</div>
                  <p className="text-muted-foreground mt-1" dir="rtl">
                    {teamStats.totalSeconds === 0 
                      ? "אין נתוני זמן לצוות זה עדיין" 
                      : formatDurationHumanReadable(teamStats.totalSeconds)}
                  </p>
                  <p className="text-muted-foreground mt-1">בסך הכל עבור כל חברי הצוות</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    חברי צוות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{teamStats.membersCount}</div>
                  <p className="text-muted-foreground mt-1">סך חברי הצוות הפעילים</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-primary" />
                    פעילות בנושאים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{topicDistribution?.length || 0}</div>
                  <p className="text-muted-foreground mt-1">מספר הנושאים בהם הצוות עובד</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members">
          <div className="space-y-6">
            <h2 className="text-xl font-bold">פעילות חברי הצוות</h2>
            
            {memberActivity?.map(member => (
              <Card key={member.userId}>
                <CardHeader>
                  <CardTitle>{member.email}</CardTitle>
                  <CardDescription>
                    שעת פעילות עיקרית: {member.mostActiveHour}:00
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span>זמן כולל:</span>
                    <span className="font-medium">{formatTime(member.totalSeconds)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2" dir="rtl">
                    {member.totalSeconds === 0 
                      ? "אין נתוני זמן לחבר זה עדיין" 
                      : formatDurationHumanReadable(member.totalSeconds)}
                  </div>
                  
                  <div className="flex items-center justify-between mb-1">
                    <span>פעילות אחרונה:</span>
                    <span className="font-medium" dir="rtl">{formatDate(member.lastActiveDay)}</span>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">חלק יחסי מהזמן הכולל של הצוות</span>
                      <span className="text-sm font-medium">
                        {teamStats?.totalSeconds && teamStats.totalSeconds > 0 && member.totalSeconds > 0 ? 
                          `${Math.round((member.totalSeconds / teamStats.totalSeconds) * 100)}%` : 
                          '-'
                        }
                      </span>
                    </div>
                    <Progress 
                      value={teamStats?.totalSeconds && teamStats.totalSeconds > 0 && member.totalSeconds > 0 ? 
                        (member.totalSeconds / teamStats.totalSeconds) * 100 : 0
                      } 
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(!memberActivity || memberActivity.length === 0) && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">אין נתוני פעילות זמינים עבור חברי הצוות</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="topics">
          <div className="space-y-6">
            <h2 className="text-xl font-bold">התפלגות זמן לפי נושאים</h2>
            
            {topicDistribution?.map(topic => (
              <Card key={topic.topic.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: topic.topic.color }}
                      ></div>
                      <CardTitle>{topic.topic.name}</CardTitle>
                    </div>
                    <div className="text-xl font-bold">
                      {topic.totalSeconds > 0 && topic.percentage > 0 ? `${topic.percentage.toFixed(1)}%` : '-'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span>זמן כולל:</span>
                    <span className="font-medium">{formatTime(topic.totalSeconds)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2" dir="rtl">
                    {topic.totalSeconds === 0 
                      ? "אין נתוני זמן לנושא זה עדיין" 
                      : formatDurationHumanReadable(topic.totalSeconds)}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">פעילות לפי חברי צוות:</h4>
                    {topic.breakdownByUser.map(user => (
                      <div key={user.userId} className="flex items-center justify-between text-sm">
                        <span>{user.email}</span>
                        <span className="font-medium">
                          {user.seconds === 0 
                            ? "אין נתוני זמן" 
                            : `${formatTime(user.seconds)} (${user.percentage.toFixed(1)}%)`}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(!topicDistribution || topicDistribution.length === 0) && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">אין נתוני נושאים זמינים עבור צוות זה</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}