import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, TrendingUp, Clock, Target, BarChart3, Brain } from 'lucide-react';

interface UserSummary {
  totalTimeSpent: number;
  averageSessionDuration: number;
  mostProductiveHours: number[];
  topTopics: Array<{ topic: string; time: number; percentage: number }>;
  weeklyPattern: Array<{ day: string; time: number }>;
  productivityScore: number;
  suggestions: string[];
}

interface InsightSuggestion {
  id: string;
  type: 'insights';
  title: string;
  description: string;
  actionable: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number;
  createdAt: string;
  isRead: boolean;
  isApplied: boolean;
}

export function SummaryInsights() {
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [insights, setInsights] = useState<InsightSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummaryAndInsights();
  }, []);

  const fetchSummaryAndInsights = async () => {
    try {
      setLoading(true);
      
      // Fetch summary
      const summaryResponse = await fetch('/api/suggestions/summary');
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }

      // Fetch insights
      const insightsResponse = await fetch('/api/suggestions/insights');
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData);
      }
    } catch (error) {
      console.error('Error fetching summary and insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'גבוה';
      case 'medium': return 'בינוני';
      case 'low': return 'נמוך';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">סקירה ותובנות</h2>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
      <div className="flex items-center gap-2">
        <Brain className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">סקירה ותובנות</h2>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Time Spent */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">זמן כולל</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(summary.totalTimeSpent)}</div>
              <p className="text-xs text-muted-foreground">
                זמן כולל שעקבת
              </p>
            </CardContent>
          </Card>

          {/* Average Session */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ממוצע סשן</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(summary.averageSessionDuration)}</div>
              <p className="text-xs text-muted-foreground">
                לכל סשן
              </p>
            </CardContent>
          </Card>

          {/* Productivity Score */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ציון פרודוקטיביות</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.productivityScore}/100</div>
              <Progress value={summary.productivityScore} className="mt-2" />
            </CardContent>
          </Card>

          {/* Most Productive Hours */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">שעות שיא</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.mostProductiveHours.length > 0 
                  ? summary.mostProductiveHours.slice(0, 3).map(h => `${h}:00`).join(', ')
                  : 'אין נתונים'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                השעות הכי פרודוקטיביות
              </p>
            </CardContent>
          </Card>

          {/* Top Topics */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">נושאים מובילים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summary.topTopics.slice(0, 3).map((topic, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{topic.topic}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatTime(topic.time)}
                      </span>
                      <Badge variant="secondary">
                        {topic.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Suggestions */}
      {summary && summary.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              הצעות מהירות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Insights Suggestions */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              תובנות אישיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{insight.title}</h4>
                    <div className="flex gap-2">
                      <Badge className={getPriorityColor(insight.priority)}>
                        {getPriorityText(insight.priority)}
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(insight.confidence * 100)}% ביטחון
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {insight.description}
                  </p>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-blue-900 mb-1">פעולה מומלצת:</p>
                    <p className="text-sm text-blue-800">{insight.actionable}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {(!summary || summary.totalTimeSpent === 0) && insights.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">התחל לעקוב לקבלת תובנות</h3>
            <p className="text-muted-foreground mb-4">
              התחל לעקוב אחר הזמן שלך כדי לפתוח תובנות והמלצות אישיות.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• עקוב אחר הסשנים שלך</p>
              <p>• סווג את הפעילויות שלך</p>
              <p>• קבל המלצות אישיות</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
