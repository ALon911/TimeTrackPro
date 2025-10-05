import { Card, CardContent } from "@/components/ui/card";
import { formatSecondsToHumanReadable } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  change?: {
    value: number;
    isIncrease: boolean;
    label: string;
  };
  secondaryText?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  change,
  secondaryText
}: StatCardProps) {
  // If the value is a number in seconds, format it nicely
  const displayValue = typeof value === 'number' ? formatSecondsToHumanReadable(value) : value;
  
  return (
    <Card className="border border-neutral-100">
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-sm font-medium text-neutral-500 mb-1">{title}</h4>
            <p className="text-2xl font-bold">{displayValue}</p>
          </div>
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgColor} ${iconColor}`}
          >
            <span className="material-icons">{icon}</span>
          </div>
        </div>
        
        {change && (
          <div className="mt-4 flex items-center text-sm">
            <span 
              className={`flex items-center ${
                change.isIncrease ? 'text-success' : 'text-error'
              }`}
            >
              <span className="material-icons text-sm ml-1">
                {change.isIncrease ? 'arrow_upward' : 'arrow_downward'}
              </span>
              {change.value}%
            </span>
            <span className="text-neutral-500 mr-2">{change.label}</span>
          </div>
        )}
        
        {secondaryText && !change && (
          <div className="mt-4 text-neutral-500 text-sm">
            {secondaryText}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
