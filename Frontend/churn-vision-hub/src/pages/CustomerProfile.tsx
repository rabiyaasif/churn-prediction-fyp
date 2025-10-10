// src/pages/CustomerProfile.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CustomerProfile() {
  // Hardcoded customer profile
  const customer = {
    id: 1,
    name: "Ali Raza",
    email: "ali.raza@example.com",
    joined: "2023-02-10",
    churnRisk: "High",
    churnRiskPercent: 72,
    purchases: [
      { id: 101, item: "Wireless Headphones", date: "2024-12-15", amount: "$120" },
      { id: 102, item: "Smartwatch", date: "2024-11-20", amount: "$250" },
      { id: 103, item: "Gaming Mouse", date: "2024-10-05", amount: "$80" },
    ],
    events: [
      { id: 1, type: "Login", date: "2025-08-18" },
      { id: 2, type: "Viewed Product", date: "2025-08-17" },
      { id: 3, type: "Added to Cart", date: "2025-08-16" },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Personal Details */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Name:</strong> {customer.name}</p>
          <p><strong>Email:</strong> {customer.email}</p>
          <p><strong>Joined:</strong> {customer.joined}</p>
        </CardContent>
      </Card>

      {/* Churn Risk */}
      <Card>
        <CardHeader>
          <CardTitle>Churn Risk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            <Badge
              variant={
                customer.churnRisk === "High"
                  ? "destructive"
                  : customer.churnRisk === "Medium"
                  ? "secondary"
                  : "default"
              }
            >
              {customer.churnRisk}
            </Badge>
            <Progress value={customer.churnRiskPercent} className="w-1/2" />
            <span>{customer.churnRiskPercent}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {customer.purchases.map((p) => (
              <li key={p.id} className="p-3 border rounded-lg flex justify-between">
                <span>{p.item} ({p.date})</span>
                <span className="font-semibold">{p.amount}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Event Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {customer.events.map((e) => (
              <li key={e.id} className="p-2 border rounded-md">
                <span className="font-medium">{e.type}</span> — {e.date}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
