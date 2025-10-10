import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

// Sample data
const churnCustomers = [
  {
    name: "Sarah Johnson",
    email: "sarah@company.com",
    churnScore: 92,
    lastPurchase: "2025-07-28",
    action: "Send 15% discount"
  },
  {
    name: "Mike Chen",
    email: "mike@startup.io",
    churnScore: 85,
    lastPurchase: "2025-06-15",
    action: "Start email re-engagement"
  },
  {
    name: "Emma Davis",
    email: "emma@business.com",
    churnScore: 78,
    lastPurchase: "2025-07-05",
    action: "Offer VIP support call"
  },
  {
    name: "David Wilson",
    email: "david@enterprise.com",
    churnScore: 65,
    lastPurchase: "2025-05-10",
    action: "Invite to loyalty program"
  }
];

export default function ChurnPrediction() {
  const [threshold, setThreshold] = useState(70);
  const [lastPurchaseDate, setLastPurchaseDate] = useState("");

  const filteredCustomers = churnCustomers.filter(
    (customer) =>
      customer.churnScore >= threshold &&
      (!lastPurchaseDate || new Date(customer.lastPurchase) >= new Date(lastPurchaseDate))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Churn Prediction</h1>
          <p className="text-muted-foreground">
            Identify customers at high risk of leaving and recommended retention actions.
          </p>
        </div>
        <Button variant="outline">
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Min Churn Risk %</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Last Purchase After</label>
            <div className="relative">
              <Input
                type="date"
                value={lastPurchaseDate}
                onChange={(e) => setLastPurchaseDate(e.target.value)}
              />
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High-Risk Customers List */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">High Risk Customers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <p className="text-muted-foreground">No customers match the current filters.</p>
          ) : (
            filteredCustomers.map((customer, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground">{customer.name}</div>
                  <div className="text-sm text-muted-foreground">{customer.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last purchase: {customer.lastPurchase}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant={customer.churnScore >= 85 ? "destructive" : "warning"}>
                    {customer.churnScore}% risk
                  </Badge>
                  <div className="text-sm font-medium text-foreground">
                    {customer.action}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
