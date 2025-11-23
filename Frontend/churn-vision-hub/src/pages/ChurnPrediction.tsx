import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { featureImportanceData as mockFeatureImportanceData, churnTrendData as mockChurnTrendData } from "@/utils/mockData";
import { Brain, TrendingUp, Target } from "lucide-react";
import { fetchChurnAnalysis } from "@/services/analysis";

const ChurnPrediction = () => {
  // -------- API state --------
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // -------- Static fallbacks (your original values) --------
  const fallbackModelPerformance = [
    { metric: "Accuracy", value: 94.3 },
    { metric: "Precision", value: 91.8 },
    { metric: "Recall", value: 89.2 },
    { metric: "F1 Score", value: 90.5 },
    { metric: "AUC-ROC", value: 96.1 },
  ];

  const fallbackSegmentPerformance = [
    { segment: "High-Value", accuracy: 96.5, predictions: 215 },
    { segment: "Regular", accuracy: 93.2, predictions: 485 },
    { segment: "Occasional", accuracy: 91.8, predictions: 392 },
    { segment: "New", accuracy: 89.4, predictions: 268 },
  ];

  const fallbackFeatureCategories = [
    { category: "RFM Analysis", importance: 44 },
    { category: "Conversion Rates", importance: 38 },
    { category: "Engagement", importance: 32 },
    { category: "Temporal Trends", importance: 28 },
    { category: "Product Engagement", importance: 25 },
    { category: "Risk Indicators", importance: 42 },
  ];

  const fallbackActivityLog = [
    {
      time: "2 hours ago",
      event: "Batch prediction completed",
      details: "1,385 customers scored",
      status: "success",
    },
    {
      time: "6 hours ago",
      event: "Feature importance recalculated",
      details: "Top 5 features shifted",
      status: "info",
    },
    {
      time: "1 day ago",
      event: "Data drift check passed",
      details: "All features within threshold",
      status: "success",
    },
    {
      time: "2 days ago",
      event: "Model retrained",
      details: "Accuracy improved to 94.3%",
      status: "success",
    },
    {
      time: "3 days ago",
      event: "Low confidence alert",
      details: "8 predictions flagged for review",
      status: "warning",
    },
  ];

  // -------- Fetch from backend on mount --------
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

        const apiData = await fetchChurnAnalysis(clientId);
        // apiData is exactly the `data` object from your response
        setData(apiData);
      } catch (err: any) {
        console.error("Failed to load churn analysis:", err);
        setError(err?.message || "Failed to load churn analysis");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // -------- Choose between API data and fallbacks --------
  const modelPerformance =
    data?.modelPerformance && data.modelPerformance.length > 0
      ? data.modelPerformance
      : fallbackModelPerformance;

  const segmentPerformance =
    data?.segmentPerformance && data.segmentPerformance.length > 0
      ? data.segmentPerformance
      : fallbackSegmentPerformance;

  const featureCategories =
    data?.featureCategories && data.featureCategories.length > 0
      ? data.featureCategories
      : fallbackFeatureCategories;

  const featureImportanceForChart =
    data?.featureImportanceData && data.featureImportanceData.length > 0
      ? data.featureImportanceData
      : mockFeatureImportanceData;

  const churnTrendForChart =
    data?.churnTrendData && data.churnTrendData.length > 0
      ? data.churnTrendData
      : mockChurnTrendData;

  const activityLog =
    data?.activityLog && data.activityLog.length > 0
      ? data.activityLog
      : fallbackActivityLog;

  // Overall accuracy for the KPI card (from backend if available)
  const overallAccuracy =
    modelPerformance.find((m: any) => m.metric === "Accuracy")?.value ?? 94.3;

  const totalPredictionsPerWeek =
    churnTrendForChart[churnTrendForChart.length - 1]?.predictions ?? 1385;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Churn Prediction Model Performance
        </h1>
        <p className="text-muted-foreground mt-1">
          XGBoost churn model accuracy, drift monitoring, and feature impact analysis.
        </p>
        {loading && (
          <p className="text-xs text-muted-foreground mt-1">
            Loading latest metrics…
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive mt-1">
            Failed to load live data, showing fallback values.
          </p>
        )}
      </div>

      {/* Top KPIs */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Churn Model</p>
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {overallAccuracy.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">Overall Accuracy</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Features Used</p>
            <Target className="h-5 w-5 text-accent" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {data?.featureImportanceData?.length ?? 29}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Across 7 categories</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Predictions / Week</p>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {totalPredictionsPerWeek.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">+8.2% from last week</p>
        </Card>
      </div>

      {/* Model performance bar chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Model Performance Metrics
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={modelPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" domain={[80, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Feature category radar + segment performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Feature Category Importance
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={featureCategories}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="category"
                stroke="hsl(var(--muted-foreground))"
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 50]}
                stroke="hsl(var(--muted-foreground))"
              />
              <Radar
                name="Importance"
                dataKey="importance"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.5}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Segment-wise Model Performance
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={segmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="segment" stroke="hsl(var(--muted-foreground))" />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                domain={[0, 100]}
              />
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
              <Bar
                yAxisId="left"
                dataKey="accuracy"
                fill="hsl(var(--primary))"
                name="Accuracy %"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="predictions"
                fill="hsl(var(--accent))"
                name="Predictions"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Full feature importance rankings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Complete Feature Importance Rankings (29 Features)
        </h3>
        <ResponsiveContainer width="100%" height={600}>
          <BarChart data={featureImportanceForChart} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis
              type="category"
              dataKey="feature"
              width={200}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: any, _name: any, props: any) => [
                `${value} (${props.payload.category})`,
                "Importance",
              ]}
            />
            <Bar
              dataKey="importance"
              fill="hsl(var(--chart-1))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Temporal churn trends */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Temporal Analysis: Churn Trends Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={churnTrendForChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="churnRate"
              stroke="hsl(var(--destructive))"
              strokeWidth={3}
              name="Churn Rate %"
            />
            <Line
              type="monotone"
              dataKey="predictions"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Total Predictions"
            />
            <Line
              type="monotone"
              dataKey="interventions"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              name="Successful Interventions"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Drift monitoring + confidence distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Data Drift Monitoring
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Feature Distribution Drift
                </span>
                <span className="text-sm font-semibold text-success">Low</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success w-[15%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Target Variable Drift
                </span>
                <span className="text-sm font-semibold text-success">Stable</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success w-[8%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Model Confidence
                </span>
                <span className="text-sm font-semibold text-primary">
                  High (92.1%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[92%]" />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">
                Last Retrain: 2 days ago
              </p>
              <Button size="sm" className="w-full">
                Trigger Manual Retrain
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Prediction Confidence Distribution
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  High Confidence (&gt;90%)
                </span>
                <span className="text-sm font-semibold text-foreground">68%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success w-[68%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Medium Confidence (70–90%)
                </span>
                <span className="text-sm font-semibold text-foreground">24%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-warning w-[24%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Low Confidence (&lt;70%)
                </span>
                <span className="text-sm font-semibold text-foreground">8%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-destructive w-[8%]" />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Low confidence predictions may indicate edge cases or new behavioral
                patterns not seen during training.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Architecture details */}
      <Card className="p-6 bg-primary/5">
        <h3 className="text-lg font-semibold text-foreground mb-3">
          Model Architecture Details
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              XGBoost Configuration
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 100 Estimators</li>
              <li>• Max Depth: 6</li>
              <li>• Learning Rate: 0.1</li>
              <li>• Row/Column Sampling: 80%</li>
              <li>• StandardScaler Normalization</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Temporal Windows
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 90-day Observation Window</li>
              <li>• 10-day Gap Period</li>
              <li>• 45-day Prediction Window</li>
              <li>• 16+ Training Snapshots</li>
              <li>• Real-time Prediction Pipeline</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Activity log */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Recent Model Activity Log
        </h3>
        <div className="space-y-3">
          {activityLog.map((log: any, idx: number) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-3 rounded-lg border border-border"
            >
              <div
                className={`w-2 h-2 rounded-full mt-2 ${
                  log.status === "success"
                    ? "bg-success"
                    : log.status === "warning"
                    ? "bg-warning"
                    : "bg-primary"
                }`}
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {log.event}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.details}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {log.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ChurnPrediction;
