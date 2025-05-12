import { TopicDistribution as TopicDistributionType } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { formatSecondsToHumanReadable } from "@/lib/utils";

interface TopicDistributionProps {
  data: TopicDistributionType[];
  className?: string;
}

export function TopicDistribution({ data, className }: TopicDistributionProps) {
  // Sort data by percentage (highest first)
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);
  
  // Generate CSS for the pie chart segments
  const generatePieChartStyles = () => {
    let styles = '';
    let currentDegree = 0;
    
    sortedData.forEach((item, index) => {
      const degrees = (item.percentage / 100) * 360;
      
      if (index === 0) {
        // First segment
        styles += `
          .pie-segment:nth-child(1) {
            transform: rotate(0deg);
            background-color: ${item.topic.color};
            clip-path: polygon(50% 50%, 100% 50%, 100% 0, 50% 0);
          }
        `;
      } else {
        // Other segments
        styles += `
          .pie-segment:nth-child(${index + 1}) {
            transform: rotate(${currentDegree}deg);
            background-color: ${item.topic.color};
          }
        `;
      }
      
      currentDegree += degrees;
    });
    
    return styles;
  };
  
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-4">התפלגות לפי נושא</h3>
        
        <div className="flex items-center justify-center">
          {data.length > 0 ? (
            <div className="flex items-center">
              {/* Pie Chart */}
              <div className="relative w-48 h-48">
                <style>{generatePieChartStyles()}</style>
                {sortedData.map((item, index) => (
                  <div 
                    key={index}
                    className="pie-segment absolute inset-0 border-[16px] rounded-full"
                    style={{
                      borderColor: 'transparent',
                      borderTopColor: item.topic.color,
                      borderRightColor: index === 0 ? item.topic.color : 'transparent',
                      transform: `rotate(${(item.percentage / 100) * 360}deg)`
                    }}
                  />
                ))}
              </div>
              
              {/* Legend */}
              <div className="mr-6">
                <ul className="space-y-3">
                  {sortedData.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-sm ml-2"
                        style={{ backgroundColor: item.topic.color }}
                      />
                      <span className="text-sm">{item.topic.name} ({item.percentage}%)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              אין נתונים זמינים להצגה
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
