// src/pages/CustomerProfile.tsx
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCustomerProfiles } from "@/services/analysis";

const CustomerProfile = () => {
  // Get clientId from localStorage and validate it
  const clientIdStr = localStorage.getItem("client_id");
  const clientId = clientIdStr ? parseInt(clientIdStr, 10) : null;

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  useEffect(() => {
    if (!clientId || isNaN(clientId)) {
      console.error("Client ID not found. Please log in again.");
      setAllCustomers([]);
      setTotalCount(0);
      return;
    }

    const loadCustomers = async () => {
      try {
        const data = await getCustomerProfiles(clientId, 500, 0);
        setAllCustomers(data.customers || []);
        setTotalCount(
          typeof data.count === "number"
            ? data.count
            : (data.customers?.length ?? 0)
        );
      } catch (err) {
        console.error("Failed to load customers", err);
        setAllCustomers([]);
        setTotalCount(0);
      }
    };

    loadCustomers();
  }, [clientId]);

  const filteredCustomers = allCustomers.filter((customer) => {
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSegment =
      segmentFilter === "all" || customer.segment === segmentFilter;

    const matchesRisk =
      riskFilter === "all" || customer.riskLevel === riskFilter;

    return matchesSearch && matchesSegment && matchesRisk;
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "Medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "Low":
        return "bg-success/10 text-success border-success/20";
      default:
        return "";
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case "High-Value":
        return "bg-success/10 text-success border-success/20";
      case "Regular":
        return "bg-primary/10 text-primary border-primary/20";
      case "Occasional":
        return "bg-warning/10 text-warning border-warning/20";
      case "New":
        return "bg-accent/10 text-accent border-accent/20";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            E-Commerce Customer Database
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete churn risk profiles for your online shoppers
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              <SelectItem value="High-Value">High-Value</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="Occasional">Occasional</SelectItem>
              <SelectItem value="New">New</SelectItem>
            </SelectContent>
          </Select>

          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="High">High Risk</SelectItem>
              <SelectItem value="Medium">Medium Risk</SelectItem>
              <SelectItem value="Low">Low Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Summary text */}
      <div className="text-sm text-muted-foreground mb-2">
        Showing {filteredCustomers.length} of {totalCount} customers
      </div>

      {/* Customer cards */}
      <div className="space-y-4">
        {filteredCustomers.map((customer) => (
          <Card
            key={customer.id}
            className="p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left section: customer info + metrics + risk factors */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {customer.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {customer.id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getRiskColor(customer.riskLevel)}>
                      {customer.riskLevel} Risk
                    </Badge>
                    <Badge className={getSegmentColor(customer.segment)}>
                      {customer.segment}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Churn Probability
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {(customer.churnProbability * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Spend
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      ${(customer.totalSpend / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-lg font-bold text-foreground">
                      {customer.orderCount}
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
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Top Risk Factors:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {customer.topRiskFactors.map((factor: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right section: recommended actions */}
              <div className="lg:w-80 lg:border-l lg:pl-6 border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Recommended Actions:
                </h4>
                <ul className="space-y-2">
                  {customer.recommendations.map((rec: string, idx: number) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-4"
                  variant={customer.riskLevel === "High" ? "default" : "outline"}
                >
                  Take Action
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CustomerProfile;
