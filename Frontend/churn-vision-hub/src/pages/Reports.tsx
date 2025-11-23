// src/pages/Reports.tsx
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Download,
  Search,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Target,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import {
  generateWeeklyReport,
  downloadReportPDF,
} from "@/services/analysis";

interface Summary {
  totalCustomers: number;
  highRiskCount: number;
  churnedThisWeek: number;
  retentionRate: number;
  avgChurnProbability: number;
  prevWeekComparison: {
    highRisk: number;
    churned: number;
    retention: number;
  };
}

interface TopRiskFactor {
  factor: string;
  impact: "High" | "Medium" | "Low" | string;
}

interface Recommendation {
  action: string;
  priority: "high" | "medium" | "low" | string;
  expectedImpact: string;
}

interface SegmentBreakdown {
  segment: string;
  count: number;
  riskLevel: number;
  trend: "up" | "down";
}

interface WeeklyReport {
  weekEnding: Date;
  summary: Summary;
  keyInsights: string[];
  topRiskFactors: TopRiskFactor[];
  recommendations: Recommendation[];
  segmentBreakdown: SegmentBreakdown[];
  executiveSummary?: string;
}

const Reports = () => {
  // Get client ID from localStorage
  const clientIdStr = localStorage.getItem("client_id");
  const clientId = clientIdStr ? parseInt(clientIdStr, 10) : null;

  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [weekEnding, setWeekEnding] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!clientId || isNaN(clientId)) {
      setError("Client ID not found. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const reportData = await generateWeeklyReport(clientId, weekEnding);

      // Convert weekEnding string to Date
      const weekEndingDate = new Date(weekEnding + "T00:00:00");

      const report: WeeklyReport = {
        weekEnding: weekEndingDate,
        summary: reportData.summary,
        keyInsights: reportData.keyInsights || [],
        topRiskFactors: reportData.topRiskFactors || [],
        recommendations: reportData.recommendations || [],
        segmentBreakdown: reportData.segmentBreakdown || [],
        executiveSummary: reportData.executiveSummary,
      };

      setSelectedReport(report);
    } catch (err: any) {
      console.error("Failed to generate report", err);
      setError(err?.message || "Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedReport || !clientId || isNaN(clientId)) return;
    try {
      const weekEndingStr = format(selectedReport.weekEnding, "yyyy-MM-dd");
      await downloadReportPDF(clientId, weekEndingStr);
    } catch (err) {
      console.error("Failed to download PDF", err);
      setError("Failed to download PDF. Please try again.");
    }
  };

  // DETAIL VIEW
  if (selectedReport) {
  return (
      <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="bg-card border-b border-border sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-8 py-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedReport(null)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Reports
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleDownloadPdf}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="max-w-5xl mx-auto px-8 py-8">
            <div className="bg-card rounded-lg border border-border shadow-sm p-12">
              {/* Report Header */}
              <div className="border-b border-border pb-8 mb-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                      Weekly Retention &amp; Churn Risk Report
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      Week Ending:{" "}
                      {format(selectedReport.weekEnding, "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  Executive Summary
                </h2>

                {selectedReport.executiveSummary && (
                  <div className="bg-muted/40 rounded-lg p-5 mb-6">
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                      {selectedReport.executiveSummary}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      Total Customers
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {selectedReport.summary.totalCustomers.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      At High Risk
                    </div>
                    <div className="text-2xl font-bold text-destructive">
                      {selectedReport.summary.highRiskCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      {selectedReport.summary.prevWeekComparison.highRisk > 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-destructive" />
                          <span className="text-destructive">
                            +
                            {selectedReport.summary.prevWeekComparison.highRisk.toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-success" />
                          <span className="text-success">
                            {selectedReport.summary.prevWeekComparison.highRisk.toFixed(1)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      Churned This Week
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {selectedReport.summary.churnedThisWeek}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      {selectedReport.summary.prevWeekComparison.churned > 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-destructive" />
                          <span className="text-destructive">
                            +
                            {selectedReport.summary.prevWeekComparison.churned.toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-success" />
                          <span className="text-success">
                            {selectedReport.summary.prevWeekComparison.churned.toFixed(1)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      Retention Rate
                    </div>
                    <div className="text-2xl font-bold text-success">
                      {selectedReport.summary.retentionRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      {selectedReport.summary.prevWeekComparison.retention > 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-success" />
                          <span className="text-success">
                            +
                            {selectedReport.summary.prevWeekComparison.retention.toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-destructive" />
                          <span className="text-destructive">
                            {selectedReport.summary.prevWeekComparison.retention.toFixed(1)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Key Insights */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  Key Insights This Week
                </h2>
                <div className="bg-muted/30 rounded-lg p-6">
                  <ul className="space-y-3">
                    {selectedReport.keyInsights.map((insight, idx) => (
                      <li key={idx} className="flex gap-3 text-foreground">
                        <span className="text-primary font-semibold mt-0.5">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Top Risk Factors */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Top Risk Factors
                </h2>
                <div className="space-y-3">
                  {selectedReport.topRiskFactors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                    >
                      <span className="font-medium text-foreground">
                        {factor.factor}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          factor.impact === "High"
                            ? "bg-destructive/20 text-destructive"
                            : factor.impact === "Medium"
                            ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {factor.impact} Impact
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Customer Segment Breakdown */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Customer Segment Analysis
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedReport.segmentBreakdown.map((segment, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">
                          {segment.segment}
                        </h3>
                        <div className="flex items-center gap-1">
                          {segment.trend === "up" ? (
                            <TrendingUp className="h-4 w-4 text-destructive" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-success" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customers:</span>
                          <span className="font-medium text-foreground">
                            {segment.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Risk Level:</span>
                          <span
                            className={`font-medium ${
                              segment.riskLevel > 30
                                ? "text-destructive"
                                : segment.riskLevel > 20
                                ? "text-yellow-600 dark:text-yellow-500"
                                : "text-success"
                            }`}
                          >
                            {segment.riskLevel}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recommendations */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Recommended Actions
                </h2>
                <div className="space-y-4">
                  {selectedReport.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="border-l-4 border-primary bg-muted/30 p-5 rounded-r-lg"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-semibold text-foreground flex-1">
                          {rec.action}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            rec.priority === "high"
                              ? "bg-destructive/20 text-destructive"
                              : rec.priority === "medium"
                              ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {rec.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Expected Impact:
                        </span>{" "}
                        {rec.expectedImpact}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Footer */}
              <div className="border-t border-border pt-6 mt-10">
                <p className="text-sm text-muted-foreground text-center">
                  This report was automatically generated by your predictive
                  analytics engine.
                  <br />
                  For questions or support, contact your account manager.
                </p>
              </div>
            </div>
          </div>
        </div>
    );
  }

  // GENERATE REPORT VIEW
  return (
    <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Weekly Reports
          </h1>
          <p className="text-muted-foreground">
            Generate professional weekly retention and churn risk reports by analyzing your events data.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
              </div>
        )}

        {/* Report Generator */}
        <Card className="mb-6">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Generate Weekly Report
            </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="flex gap-4 flex-col md:flex-row">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Week Ending Date
                </label>
                <Input
                  type="date"
                  value={weekEnding}
                  onChange={(e) => setWeekEnding(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select the end date of the week you want to analyze
                </p>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGenerateReport}
                  disabled={loading || !clientId || isNaN(clientId)}
                  className="w-full md:w-auto"
                >
                  {loading ? (
                    <>
                      <span className="mr-2">Generating...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
              </div>
            </CardContent>
          </Card>

        {/* Info Card */}
          <Card>
            <CardHeader>
            <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                • Select a week ending date to analyze events from that week
              </p>
              <p>
                • The system will query your events table and perform churn analysis
              </p>
              <p>
                • ML predictions are run on customer behavior data
              </p>
              <p>
                • An AI-generated executive summary is created for easy understanding
              </p>
              <p>
                • Reports are generated on-demand and not stored in the database
              </p>
              </div>
            </CardContent>
          </Card>
    </div>
  );
};

export default Reports;
