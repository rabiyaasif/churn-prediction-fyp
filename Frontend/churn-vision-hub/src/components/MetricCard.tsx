import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  trend?: "up" | "down";
}

const MetricCard = ({ title, value, change, icon, trend }: MetricCardProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {trend === "up" ? (
                <ArrowUp className="h-4 w-4 text-success" />
              ) : (
                <ArrowDown className="h-4 w-4 text-destructive" />
              )}
              <span className={`text-sm font-medium ${trend === "up" ? "text-success" : "text-destructive"}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-sm text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-3">
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;
