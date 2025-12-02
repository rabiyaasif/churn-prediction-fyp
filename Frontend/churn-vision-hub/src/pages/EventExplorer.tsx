import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Mail, Phone, Gift, TrendingUp, Send, Tag } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchHighRiskCustomers, sendSingleEmail, sendBulkEmails } from "@/services/analysis";

type Customer = {
  id: string;
  name: string;
  email: string;
  riskLevel: string; // "High" | "Medium" | "Low"
  segment: string;
  churnProbability: number; // 0..1
  totalSpend: number;
  daysSinceLastPurchase: number;
  topRiskFactors: string[];
  recommendations: string[];
  features?: {
    added_to_wishlist: number;
    removed_from_wishlist: number;
    added_to_cart: number;
    removed_from_cart: number;
    cart_quantity_updated: number;
    total_sessions: number;
    days_since_last_activity: number;
    total_spent_usd: number;
  };
};

type HighRiskCustomersResponse = {
  totalCustomers: number;
  highRiskCount: number;
  revenueAtRisk: number;
  avgChurnProbability: number;
  customers: Customer[];
};

const EventExplorer = () => {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all"); // Default to all risk levels
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    highRiskCount: 0,
    revenueAtRisk: 0,
    avgChurnProbability: 0,
  });
  
  // Email and discount dialogs
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  // Get clientId from localStorage and validate it
  const clientIdStr = localStorage.getItem("client_id");
  const clientId = clientIdStr ? parseInt(clientIdStr, 10) : null;

  useEffect(() => {
    if (!clientId || isNaN(clientId)) {
      setError("Client ID not found. Please log in again.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const offset = (currentPage - 1) * itemsPerPage;
        const data = await fetchHighRiskCustomers(clientId, {
          limit: itemsPerPage,
          offset: offset,
          segment: segmentFilter !== "all" ? segmentFilter : null,
          risk: riskFilter !== "all" ? riskFilter : null,
        });
        
        setAllCustomers(data.customers || []);
        setTotalCount(data.totalCustomers || 0);
        setMetrics({
          totalCustomers: data.totalCustomers || 0,
          highRiskCount: data.highRiskCount || 0,
          revenueAtRisk: data.revenueAtRisk || 0,
          avgChurnProbability: data.avgChurnProbability || 0,
        });
      } catch (err: any) {
        console.error("Failed to fetch customers:", err);
        setError(err?.message || "Failed to load customers");
        setAllCustomers([]);
        setTotalCount(0);
        setMetrics({
          totalCustomers: 0,
          highRiskCount: 0,
          revenueAtRisk: 0,
          avgChurnProbability: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [clientId, currentPage, itemsPerPage, segmentFilter, riskFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [segmentFilter, riskFilter]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Customers are already filtered by API based on segment and risk filters
  const filteredCustomers = allCustomers;

  // Use metrics from API response
  const highRiskCount = metrics.highRiskCount;
  const totalAtRisk = metrics.revenueAtRisk;
  const avgChurnProb = metrics.avgChurnProbability;

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Loading high-risk shoppers…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          Failed to load high-risk shoppers: {error || "Unknown error"}
        </p>
      </div>
    );
  }

  const highRiskCustomers = filteredCustomers;
  const pctOfTotal = metrics.totalCustomers > 0 ? (highRiskCount / metrics.totalCustomers) * 100 : 0;

  // Get unique segments from customers
  const uniqueSegments = Array.from(new Set(highRiskCustomers.map(c => c.segment)));

  const handlePersonalizedEmail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEmailSubject(`We Miss You, ${customer.name}!`);
    setEmailBody(`Hi ${customer.name},\n\nWe noticed you haven't shopped with us recently. We'd love to have you back!\n\nAs a valued customer, we're offering you a special discount to help you rediscover our products.\n\nBest regards,\nYour Team`);
    setEmailDialogOpen(true);
  };

  const handleBulkEmail = (segment: string) => {
    setSelectedSegment(segment);
    setEmailSubject(`Special Offer for ${segment} Customers`);
    setEmailBody(`Dear Valued Customer,\n\nWe have an exclusive offer just for you! As a ${segment} customer, we're offering you a special discount.\n\nDon't miss out on this opportunity!\n\nBest regards,\nYour Team`);
    setBulkEmailDialogOpen(true);
  };

  const handleSendEmail = async (isBulk: boolean = false) => {
    try {
      if (isBulk) {
        // Fetch all customers in the selected segment (not just current page)
        if (!clientId || isNaN(clientId)) {
          alert("Client ID not found. Please log in again.");
          return;
        }
        
        // Fetch all customers with the segment filter
        const data = await fetchHighRiskCustomers(
          clientId,
          {
            limit: 1000, // Fetch a large number to get all customers
            offset: 0,
            segment: selectedSegment,
            risk: riskFilter !== "all" ? riskFilter : null,
          }
        );
        
        const segmentCustomers = (data.customers || []).filter(
          (c: Customer) => c.segment === selectedSegment
        );
        
        if (segmentCustomers.length === 0) {
          alert(`No customers found in ${selectedSegment} segment.`);
          return;
        }
        
        const recipients = segmentCustomers.map((c) => ({
          email: c.email,
          name: c.name || c.email,
        }));
        
        // Send as plain text - backend will convert to HTML
        const result = await sendBulkEmails(recipients, emailSubject, emailBody);
        
        if (result.success) {
          alert(`Bulk email sent successfully to ${result.sent_count} customers in ${selectedSegment} segment!`);
        } else {
          throw new Error(result.error || "Failed to send bulk email");
        }
      } else {
        if (!selectedCustomer) {
          alert("No customer selected.");
          return;
        }
        
        // Send as plain text - backend will convert to HTML
        const result = await sendSingleEmail(
          selectedCustomer.email,
          selectedCustomer.name || selectedCustomer.email,
          emailSubject,
          emailBody
        );
        
        if (result.success) {
          alert(`Personalized email sent successfully to ${selectedCustomer.name}!`);
        } else {
          throw new Error(result.error || "Failed to send email");
        }
      }
      
      setEmailDialogOpen(false);
      setBulkEmailDialogOpen(false);
      setEmailSubject("");
      setEmailBody("");
      setSelectedCustomer(null);
      setSelectedSegment("");
    } catch (err: any) {
      console.error("Failed to send email:", err);
      alert(`Failed to send email: ${err?.message || "Please try again."}`);
    }
  };

  const handleApplyDiscount = async (customer: Customer | null, segment: string | null) => {
    try {
      if (!discountCode || !discountPercent) {
        alert("Please enter both discount code and percentage.");
        return;
      }

      if (customer) {
        // Send personalized discount email to single customer
        const discountEmailSubject = `Exclusive ${discountPercent}% Off - Use Code ${discountCode}`;
        const discountEmailBody = `Hi ${customer.name},\n\nWe have a special offer just for you!\n\nUse discount code: ${discountCode}\nGet ${discountPercent}% off on your next purchase.\n\nThis offer is valid for a limited time. Don't miss out!\n\nBest regards,\nYour Team`;
        
        const emailResult = await sendSingleEmail(
          customer.email,
          customer.name || customer.email,
          discountEmailSubject,
          discountEmailBody
        );
        
        if (emailResult.success) {
          alert(`Discount code ${discountCode} (${discountPercent}% off) sent via email to ${customer.name}!`);
        } else {
          throw new Error(emailResult.error || "Failed to send discount email");
        }
      } else if (segment) {
        // Send bulk discount emails to all customers in segment
        if (!clientId || isNaN(clientId)) {
          alert("Client ID not found. Please log in again.");
          return;
        }
        
        // Fetch all customers in the segment
        const data = await fetchHighRiskCustomers(
          clientId,
          {
            limit: 1000,
            offset: 0,
            segment: segment,
            risk: riskFilter !== "all" ? riskFilter : null,
          }
        );
        
        const segmentCustomers = (data.customers || []).filter(
          (c: Customer) => c.segment === segment
        );
        
        if (segmentCustomers.length === 0) {
          alert(`No customers found in ${segment} segment.`);
          return;
        }
        
        const recipients = segmentCustomers.map((c) => ({
          email: c.email,
          name: c.name || c.email,
        }));
        
        const discountEmailSubject = `Exclusive ${discountPercent}% Off for ${segment} Customers - Use Code ${discountCode}`;
        const discountEmailBody = `Dear Valued Customer,\n\nAs a ${segment} customer, we have a special offer just for you!\n\nUse discount code: ${discountCode}\nGet ${discountPercent}% off on your next purchase.\n\nThis offer is valid for a limited time. Don't miss out!\n\nBest regards,\nYour Team`;
        
        const emailResult = await sendBulkEmails(recipients, discountEmailSubject, discountEmailBody);
        
        if (emailResult.success) {
          alert(`Discount code ${discountCode} (${discountPercent}% off) sent via email to ${emailResult.sent_count} customers in ${segment} segment!`);
        } else {
          throw new Error(emailResult.error || "Failed to send bulk discount email");
        }
      } else {
        alert("Please select a customer or segment.");
        return;
      }
      
      setDiscountDialogOpen(false);
      setDiscountCode("");
      setDiscountPercent("");
      setSelectedCustomer(null);
      setSelectedSegment("");
    } catch (err: any) {
      console.error("Failed to apply discount:", err);
      alert(`Failed to send discount email: ${err?.message || "Please try again."}`);
    }
  };

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
            ${totalAtRisk > 0 ? (totalAtRisk / 1000).toFixed(0) + "K" : "$0"}
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
          Bulk Actions by Segment
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Apply retention strategies to customers by segment
        </p>
        <div className="space-y-3">
          {uniqueSegments.map((segment) => {
            const segmentCustomers = highRiskCustomers.filter(c => c.segment === segment);
            return (
              <div key={segment} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">{segment}</p>
                  <p className="text-sm text-muted-foreground">{segmentCustomers.length} customers</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkEmail(segment)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedSegment(segment);
                      setDiscountDialogOpen(true);
                    }}
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Apply Discount
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Individual Customer Actions
          </h2>
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} customers
          </div>
        </div>
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
                    <Badge 
                      className={
                        customer.riskLevel === "High" 
                          ? "bg-destructive text-destructive-foreground"
                          : customer.riskLevel === "Medium"
                          ? "bg-warning text-warning-foreground"
                          : "bg-success text-success-foreground"
                      }
                    >
                      {customer.riskLevel} Risk - {(customer.churnProbability * 100).toFixed(0)}%
                    </Badge>
                    <Badge variant="outline" className="ml-2">
                      {customer.segment}
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
                        ${customer.totalSpend > 0 ? (customer.totalSpend / 1000).toFixed(1) + "K" : "$0"}
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
                <Button 
                  className="flex-1"
                  onClick={() => handlePersonalizedEmail(customer)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Personalized Email
                </Button>
                <Button variant="outline" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Schedule Call
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setDiscountDialogOpen(true);
                  }}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Apply Discount
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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

      {/* Personalized Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Send Personalized Email</DialogTitle>
            <DialogDescription>
              Send a personalized email to {selectedCustomer?.name} ({selectedCustomer?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="email-body">Message</Label>
              <textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Email message"
                className="w-full min-h-[200px] px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSendEmail(false)}>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={bulkEmailDialogOpen} onOpenChange={setBulkEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Send Bulk Email to Segment</DialogTitle>
            <DialogDescription>
              Send email to all {selectedSegment} customers ({highRiskCustomers.filter(c => c.segment === selectedSegment).length} customers)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bulk-email-subject">Subject</Label>
              <Input
                id="bulk-email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="bulk-email-body">Message</Label>
              <textarea
                id="bulk-email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Email message"
                className="w-full min-h-[200px] px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSendEmail(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send to All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogDescription>
              {selectedCustomer 
                ? `Apply discount to ${selectedCustomer.name}` 
                : `Apply discount to all ${selectedSegment} customers`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="discount-code">Discount Code</Label>
              <Input
                id="discount-code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="e.g., SAVE20"
              />
            </div>
            <div>
              <Label htmlFor="discount-percent">Discount Percentage</Label>
              <Input
                id="discount-percent"
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="e.g., 20"
                min="1"
                max="100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleApplyDiscount(selectedCustomer, selectedSegment)}>
              <Tag className="h-4 w-4 mr-2" />
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventExplorer;
