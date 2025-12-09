import { useEffect, useState } from "react";
import MetricCard from "@/components/MetricCard";
import CustomerSegmentCard from "@/components/CustomerSegmentCard";
import { Card } from "@/components/ui/card";
import {
  Users,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Target,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getDashboardAnalytics } from "@/services/analysis";

const Dashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get clientId from localStorage and validate it
  const clientIdStr = localStorage.getItem("client_id");
  const clientId = clientIdStr ? parseInt(clientIdStr, 10) : null;

  useEffect(() => {
    if (!clientId || isNaN(clientId)) {
      setError("Client ID not found. Please log in again.");
      setLoading(false);
      return;
    }

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboardAnalytics(clientId);
        setAnalytics(data);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-destructive font-medium">
          Failed to load dashboard analytics.
        </p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const {
    summary,
    segments,
    risk_distribution,
    feature_importance,
    churn_trend,
    high_risk_customers,
  } = analytics;

  // Top metrics
  const totalCustomers: number = summary.total_customers ?? 0;
  const avgChurnRate: string = (
    (summary.avg_churn_probability ?? 0) * 100
  ).toFixed(1);
  const highRiskCount: number = summary.high_risk_count ?? 0;
  const totalRevenueAtRisk: number = summary.revenue_at_risk ?? 0;
  const interventionsThisMonth: number = summary.interventions_this_month ?? 0;
  const modelAccuracyPercent: string = (
    (summary.model_accuracy ?? 0) * 100
  ).toFixed(1);

  // Segmentation cards
  const segmentData = (segments || []).map((s: any) => ({
    segment: s.segment,
    count: s.count,
    percentage: s.percentage,
    churnRate: s.churnRate,
    // you can change formatting if you want K notation
    avgValue: `$${s.avgValue.toFixed(0)}`,
    color: s.color,
  }));

  // Risk distribution for pie chart
  const riskDistribution = risk_distribution || [];

  // Feature importance for bar chart
  const featureImportanceData = (feature_importance || []).slice(0, 6);

  // Churn trend for line chart
  const churnTrendData = churn_trend || [];

  // High risk customers list
  const highRiskCustomers = (high_risk_customers || []).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          E-Commerce Customer Churn Intelligence
        </h1>
        <p className="text-muted-foreground mt-1">
          Predicting churn for your online shoppers with{" "}
          {modelAccuracyPercent}% accuracy
        </p>
      </div>

      {/* Top metric cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Customers"
          value={totalCustomers.toLocaleString()}
          change={5.2}
          trend="up"
          icon={<Users className="h-6 w-6 text-primary" />}
        />
        <MetricCard
          title="Average Churn Risk"
          value={`${avgChurnRate}%`}
          change={3.1}
          trend="down"
          icon={<TrendingDown className="h-6 w-6 text-destructive" />}
        />
        <MetricCard
          title="High Risk Customers"
          value={highRiskCount}
          change={8.4}
          trend="down"
          icon={<AlertTriangle className="h-6 w-6 text-warning" />}
        />
        <MetricCard
          title="Total Revenue at Risk"
          value={`$${(totalRevenueAtRisk / 1000).toFixed(0)}K`}
          icon={<DollarSign className="h-6 w-6 text-warning" />}
        />
        <MetricCard
          title="Interventions This Month"
          value={interventionsThisMonth.toString()}
          change={12.3}
          trend="up"
          icon={<Target className="h-6 w-6 text-success" />}
        />
        <MetricCard
          title="Model Accuracy"
          value={`${modelAccuracyPercent}%`}
          change={1.2}
          trend="up"
          icon={<Activity className="h-6 w-6 text-primary" />}
        />
      </div>

      {/* Segmentation */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Customer Segmentation
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {segmentData.map((segment: any) => (
            <CustomerSegmentCard key={segment.segment} {...segment} />
          ))}
        </div>
      </div>

      {/* Risk distribution + feature importance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Churn Risk Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Top Churn Risk Factors
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureImportanceData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
              <YAxis
                type="category"
                dataKey="feature"
                width={150}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar
                dataKey="importance"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Churn trends */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Churn Rate Trends & Interventions
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={churnTrendData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="churnRate"
              stroke="#ef4444"
              strokeWidth={2}
              name="Churn Rate %"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="interventions"
              stroke="#10b981"
              strokeWidth={2}
              name="Interventions"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* High risk customers */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Recently Identified High-Risk Customers
        </h3>
        <div className="space-y-4">
          {highRiskCustomers.map((customer: any) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {customer.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {customer.email}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
                    {(customer.churnProbability * 100).toFixed(0)}% Risk
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {customer.topRiskFactors.slice(0, 2).map(
                    (factor: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
                      >
                        {factor}
                      </span>
                    )
                  )}
                </div>
              </div>
              {/* <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/customers`)}
              >
                View Details
              </Button> */}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
