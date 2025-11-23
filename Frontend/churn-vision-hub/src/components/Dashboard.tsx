import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/MetricCard";
import CustomerSegmentCard from "@/components/CustomerSegmentCard";
import { Card } from "@/components/ui/card";
import { Users, TrendingDown, DollarSign, AlertTriangle, Target, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { generateMockCustomers, featureImportanceData, churnTrendData } from "@/utils/mockData";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const customers = generateMockCustomers();
  
  const totalCustomers = customers.length;
  const highRiskCount = customers.filter(c => c.riskLevel === "High").length;
  const avgChurnRate = (customers.reduce((acc, c) => acc + c.churnProbability, 0) / customers.length * 100).toFixed(1);
  const totalRevenue = customers.reduce((acc, c) => acc + c.totalSpend, 0);
  
  const segmentData = [
    { 
      segment: "High-Value", 
      count: customers.filter(c => c.segment === "High-Value").length,
      percentage: 15,
      churnRate: 12,
      avgValue: "$125K",
      color: "#10b981"
    },
    { 
      segment: "Regular", 
      count: customers.filter(c => c.segment === "Regular").length,
      percentage: 35,
      churnRate: 28,
      avgValue: "$25K",
      color: "#0ea5e9"
    },
    { 
      segment: "Occasional", 
      count: customers.filter(c => c.segment === "Occasional").length,
      percentage: 30,
      churnRate: 65,
      avgValue: "$5K",
      color: "#f59e0b"
    },
    { 
      segment: "New", 
      count: customers.filter(c => c.segment === "New").length,
      percentage: 20,
      churnRate: 42,
      avgValue: "$1.2K",
      color: "#8b5cf6"
    }
  ];

  const riskDistribution = [
    { name: "Low Risk", value: customers.filter(c => c.riskLevel === "Low").length, color: "#10b981" },
    { name: "Medium Risk", value: customers.filter(c => c.riskLevel === "Medium").length, color: "#f59e0b" },
    { name: "High Risk", value: customers.filter(c => c.riskLevel === "High").length, color: "#ef4444" }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">E-Commerce Customer Churn Intelligence</h1>
            <p className="text-muted-foreground mt-1">Predicting churn for your online shoppers with 94.3% accuracy</p>
          </div>
          <Button onClick={() => navigate("/high-risk")}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            View High Risk
          </Button>
        </div>

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
            value={`$${(customers.filter(c => c.riskLevel === "High").reduce((acc, c) => acc + c.totalSpend, 0) / 1000).toFixed(0)}K`}
            icon={<DollarSign className="h-6 w-6 text-warning" />}
          />
          <MetricCard
            title="Interventions This Month"
            value="247"
            change={12.3}
            trend="up"
            icon={<Target className="h-6 w-6 text-success" />}
          />
          <MetricCard
            title="Model Accuracy"
            value="94.3%"
            change={1.2}
            trend="up"
            icon={<Activity className="h-6 w-6 text-primary" />}
          />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Customer Segmentation</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {segmentData.map((segment) => (
              <CustomerSegmentCard key={segment.segment} {...segment} />
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Churn Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Top Churn Risk Factors</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={featureImportanceData.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="feature" width={150} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Churn Rate Trends & Interventions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={churnTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)"
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="churnRate" stroke="#ef4444" strokeWidth={2} name="Churn Rate %" />
              <Line yAxisId="right" type="monotone" dataKey="interventions" stroke="#10b981" strokeWidth={2} name="Interventions" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recently Identified High-Risk Customers</h3>
          <div className="space-y-4">
            {customers.filter(c => c.riskLevel === "High").slice(0, 5).map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{customer.name}</h4>
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
                      {(customer.churnProbability * 100).toFixed(0)}% Risk
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {customer.topRiskFactors.slice(0, 2).map((factor, idx) => (
                      <span key={idx} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/customers`)}>
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
