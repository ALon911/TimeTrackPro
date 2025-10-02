import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatDuration } from "@/lib/utils/time";

export function WeeklyChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/stats/weekly-overview"],
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError || !data) {
    return (
      <div className="h-64 flex items-center justify-center bg-card dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700">
        <p className="text-neutral-500 dark:text-neutral-400">שגיאה בטעינת הנתונים</p>
      </div>
    );
  }

  // Transform data for use with recharts and ensure correct order
  // Create a mapping for Hebrew day order (right to left: Sunday to Saturday)
  const dayOrder = ['ש', 'ו', 'ה', 'ד', 'ג', 'ב', 'א'];
  
  const chartData = data
    .map((item: any) => ({
      day: item.dayOfWeek,
      hours: item.totalDuration / 3600, // Convert seconds to hours
      totalDuration: item.totalDuration,
      dayIndex: dayOrder.indexOf(item.dayOfWeek)
    }))
    .sort((a: any, b: any) => a.dayIndex - b.dayIndex); // Sort by day order (right to left)

  // Create a custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const duration = formatDuration(payload[0].payload.totalDuration);
      
      return (
        <div className="bg-white dark:bg-slate-800 p-2 border border-neutral-200 dark:border-slate-700 shadow-md rounded-md">
          <p className="font-medium text-sm dark:text-neutral-200">{payload[0].payload.day}</p>
          <p className="text-primary dark:text-blue-400">{duration}</p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="hours" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
