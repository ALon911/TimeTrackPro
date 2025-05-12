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
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-neutral-500">שגיאה בטעינת הנתונים</p>
      </div>
    );
  }

  // Transform data for use with recharts
  const chartData = data.map((item: any) => ({
    day: item.dayOfWeek,
    hours: item.totalDuration / 3600, // Convert seconds to hours
    totalDuration: item.totalDuration,
  }));

  // Create a custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const duration = formatDuration(payload[0].payload.totalDuration);
      
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-sm">{payload[0].payload.day}</p>
          <p className="text-primary">{duration}</p>
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
