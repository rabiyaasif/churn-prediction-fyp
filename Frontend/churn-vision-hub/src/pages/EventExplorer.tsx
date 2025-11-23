import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Mail, Phone, Gift, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { fetchHighRiskCustomers } from "@/services/analysis"; // ⬅️ adjust path if needed

type HighRiskCustomer = {
  id: string;
  name: string;
  email: string;
  segment: string;
  daysSinceLastPurchase: number;
  churnProbability: number; // 0..1
  totalSpend: number;
  topRiskFactors: string[];
  recommendations: string[];
};

type HighRiskResponse = {
  highRiskCount: number;
  revenueAtRisk: number;
  avgChurnProbability: number; // 0..1
  customers: HighRiskCustomer[];
  // if you later add total_customers on backend, you can extend this type
};

const EventExplorer = () => {
  const [data, setData] = useState<HighRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get clientId from localStorage and validate it
    const clientIdStr = localStorage.getItem("client_id");
    const clientId = clientIdStr ? parseInt(clientIdStr, 10) : null;

    if (!clientId || isNaN(clientId)) {
      setError("Client ID not found. Please log in again.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchHighRiskCustomers(clientId, { limit: 500 });
        setData(res);
      } catch (err: any) {
        console.error("Failed to fetch high risk customers:", err);
        setError(err?.message || "Failed to load high risk customers");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Loading high-risk shoppers…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          Failed to load high-risk shoppers: {error || "Unknown error"}
        </p>
      </div>
    );
  }

  const highRiskCustomers = data.customers || [];
  const highRiskCount = data.highRiskCount ?? highRiskCustomers.length;
  const totalAtRisk = data.revenueAtRisk ?? 0;
  const avgChurnProb = data.avgChurnProbability ?? 0;

  // If backend later returns total_customers, plug it here.
  const totalCustomers = (highRiskCustomers.length || highRiskCount) || 1;
  const pctOfTotal = totalCustomers
    ? (highRiskCount / totalCustomers) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h1 className="text-3xl font-bold text-foreground">
              High-Risk Shoppers
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            E-commerce customers likely to churn - take action now
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 border-destructive/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              High-Risk Count
            </p>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {highRiskCount}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {pctOfTotal.toFixed(1)}% of total
          </p>
        </Card>

        <Card className="p-6 border-warning/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Revenue at Risk
            </p>
            <TrendingUp className="h-5 w-5 text-warning" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            ${(totalAtRisk / 1000).toFixed(0)}K
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Total customer value
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Avg. Churn Probability
            </p>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {(avgChurnProb * 100).toFixed(1)}%
          </p>
          <Progress value={avgChurnProb * 100} className="mt-2 h-2" />
        </Card>
      </div>

      <Card className="p-6 bg-destructive/5 border-destructive/20">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Bulk Actions
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Apply retention strategies to all high-risk customers at once
        </p>
        <div className="flex flex-wrap gap-3">
          <Button>
            <Mail className="h-4 w-4 mr-2" />
            Send Retention Email
          </Button>
          <Button variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Schedule Calls
          </Button>
          <Button variant="outline">
            <Gift className="h-4 w-4 mr-2" />
            Apply Discount Code
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Individual Customer Actions
        </h2>
        {highRiskCustomers.map((customer) => (
          <Card
            key={customer.id}
            className="p-6 border-destructive/30 hover:border-destructive/60 transition-colors"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {customer.name}
                    </h3>
                    <Badge className="bg-destructive text-destructive-foreground">
                      {(customer.churnProbability * 100).toFixed(0)}% Churn
                      Risk
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {customer.email}
                  </p>
                  <div className="flex gap-4 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Customer Value
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        ${(customer.totalSpend / 1000).toFixed(1)}K
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Last Purchase
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {customer.daysSinceLastPurchase}d ago
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Segment
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {customer.segment}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Critical Risk Factors
                  </h4>
                  <ul className="space-y-2">
                    {customer.topRiskFactors.map((factor, idx) => (
                      <li
                        key={idx}
                        className="text-sm flex items-start gap-2"
                      >
                        <span className="text-destructive mt-0.5">•</span>
                        <span className="text-foreground">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Immediate Actions Required
                  </h4>
                  <ul className="space-y-2">
                    {customer.recommendations.map((rec, idx) => (
                      <li
                        key={idx}
                        className="text-sm flex items-start gap-2"
                      >
                        <span className="text-success mt-0.5">✓</span>
                        <span className="text-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Personalized Email
                </Button>
                <Button variant="outline" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Schedule Call
                </Button>
                <Button variant="outline" className="flex-1">
                  <Gift className="h-4 w-4 mr-2" />
                  Apply 20% Discount
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventExplorer;
