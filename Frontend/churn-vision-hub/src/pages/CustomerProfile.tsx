// src/pages/CustomerProfile.tsx
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getCustomerProfiles } from "@/services/analysis";

const CustomerProfile = () => {
  // Get clientId from localStorage and validate it
  const clientIdStr = localStorage.getItem("client_id");
  const clientId = clientIdStr ? parseInt(clientIdStr, 10) : null;

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

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
        setLoading(true);
        const offset = (currentPage - 1) * itemsPerPage;
        const data = await getCustomerProfiles(clientId, itemsPerPage, offset, null, segmentFilter !== "all" ? segmentFilter : undefined, riskFilter !== "all" ? riskFilter : undefined);
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
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [clientId, currentPage, itemsPerPage, segmentFilter, riskFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [segmentFilter, riskFilter]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Customers are already filtered by backend, so use them directly
  const filteredCustomers = allCustomers;

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          E-Commerce Customer Database
        </h1>
        <p className="text-muted-foreground mt-1">
          Complete churn risk profiles for your online shoppers
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
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
        {loading ? (
          "Loading customers..."
        ) : (
          <>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} customers
          </>
        )}
      </div>

      {/* Customer cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No customers found matching your filters.
          </div>
        ) : (
          filteredCustomers.map((customer) => (
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
               
              </div>
            </div>
          </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-border rounded-md text-sm bg-background"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
