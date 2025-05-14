import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  change?: number;
  increase?: boolean;
  compareText?: string;
  infoText?: string;
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
      </CardContent>
    </Card>
  );
}
