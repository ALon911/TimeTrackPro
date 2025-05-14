import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils/time";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export function TopicDistributionChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/stats/topic-distribution"],
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  // Check if there's no data or all topics have zero time
  const hasValidData = data && data.length > 0 && data.some((item: any) => item.totalTime > 0);
  
  if (isError || !hasValidData) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-neutral-500">אין נתונים להצגה</p>
      </div>
    );
  }

  // Format the data for the chart and filter out entries with zero seconds
  const chartData = data
    .filter((item: any) => item.totalTime > 0)
    .map((item: any) => ({
      name: item.topic.name,
      value: item.percentage,
      color: item.topic.color,
      totalTime: item.totalTime,
    }));

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded-md text-right">
          <p className="font-medium">{data.name}</p>
          <p>{data.value}% ({formatDuration(data.totalTime)})</p>
        </div>
      );
    }
    
    return null;
  };

  // Custom legend component for better RTL support
  const CustomLegend = () => {
    return (
      <ul className="space-y-2 mt-4 text-sm">
        {chartData.map((entry, index) => (
          <li key={`legend-${index}`} className="flex items-center">
            <div 
              className="w-4 h-4 rounded-sm ml-2" 
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name} ({entry.value}%)</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="h-64 flex items-center">
      <div className="flex w-full items-center justify-center">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="value"
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="ml-6">
          <CustomLegend />
        </div>
      </div>
    </div>
  );
}
