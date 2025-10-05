import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { ReactNode } from "react";

export interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  change?: number;
  increase?: boolean;
  compareText?: string;
  infoText?: string;
  secondaryValue?: string;
  color?: string;
  trend?: number;
  trendLabel?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  change,
  increase,
  compareText,
  infoText,
  secondaryValue,
  color,
  trend,
  trendLabel,
}: StatCardProps) {
  return (
    <Card className="bg-card rounded-xl shadow-sm p-5 border border-border">
      <CardContent className="p-0">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">{title}</h4>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
        </div>
        
        {(change !== undefined && compareText) && (
          <div className="mt-4 flex items-center text-sm">
            <span className={increase ? "text-success flex items-center" : "text-error flex items-center"}>
              {increase ? (
                <ArrowUpIcon className="ml-1 h-4 w-4" />
              ) : (
                <ArrowDownIcon className="ml-1 h-4 w-4" />
              )}
              {change}%
            </span>
            <span className="text-muted-foreground mr-2">{compareText}</span>
          </div>
        )}
        
        {infoText && (
          <div className="mt-4 text-muted-foreground text-sm">
            {infoText}
          </div>
        )}
        
        {secondaryValue && (
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${color || 'text-primary'}`} dir="rtl">
              {secondaryValue}
            </span>
          </div>
        )}
        
        {trend !== undefined && trendLabel && (
          <div className="mt-4 flex items-center text-sm">
            <span className={trend >= 0 ? "text-success flex items-center" : "text-error flex items-center"}>
              {trend >= 0 ? (
                <ArrowUpIcon className="ml-1 h-4 w-4" />
              ) : (
                <ArrowDownIcon className="ml-1 h-4 w-4" />
              )}
              {Math.abs(trend)}%
            </span>
            <span className="text-muted-foreground mr-2">{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
