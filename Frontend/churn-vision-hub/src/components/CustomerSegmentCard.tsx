import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CustomerSegmentCardProps {
  segment: string;
  count: number;
  percentage: number;
  churnRate: number;
  avgValue: string;
  color: string;
}

const CustomerSegmentCard = ({ segment, count, percentage, churnRate, avgValue, color }: CustomerSegmentCardProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{segment}</h3>
          <p className="text-sm text-muted-foreground mt-1">{count.toLocaleString()} customers</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-medium`} style={{ backgroundColor: `${color}20`, color: color }}>
          {percentage}%
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Churn Risk</span>
            <span className="font-medium text-foreground">{churnRate}%</span>
          </div>
          <Progress value={churnRate} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">Avg. Value</span>
          <span className="text-sm font-semibold text-foreground">{avgValue}</span>
        </div>
      </div>
    </Card>
  );
};

export default CustomerSegmentCard;
