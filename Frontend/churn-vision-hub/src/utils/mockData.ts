export interface Customer {
  id: string;
  name: string;
  email: string;
  segment: "High-Value" | "Regular" | "Occasional" | "New";
  churnProbability: number;
  riskLevel: "Low" | "Medium" | "High";
  lastPurchase: string;
  totalSpend: number;
  orderCount: number;
  daysSinceLastPurchase: number;
  topRiskFactors: string[];
  recommendations: string[];
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  category: string;
}

export interface ChurnTrend {
  date: string;
  churnRate: number;
  predictions: number;
  interventions: number;
}

export const generateMockCustomers = (): Customer[] => {
  const segments: Customer["segment"][] = ["High-Value", "Regular", "Occasional", "New"];
  const names = [
    "Acme Corporation", "TechStart Inc", "Global Solutions", "Innovate Labs",
    "Digital Ventures", "Enterprise Systems", "Cloud Nine Co", "Quantum Tech",
    "Nexus Industries", "Apex Solutions", "Summit Partners", "Vertex Group",
    "Catalyst Enterprises", "Horizon Tech", "Pinnacle Corp", "Matrix Solutions"
  ];
  
  return Array.from({ length: 50 }, (_, i) => {
    const segment = segments[Math.floor(Math.random() * segments.length)];
    const churnProb = segment === "High-Value" ? Math.random() * 0.3 : 
                     segment === "Regular" ? 0.2 + Math.random() * 0.4 :
                     segment === "Occasional" ? 0.5 + Math.random() * 0.4 :
                     Math.random() * 0.6;
    
    const riskLevel: Customer["riskLevel"] = churnProb > 0.7 ? "High" : churnProb > 0.3 ? "Medium" : "Low";
    const daysSince = segment === "High-Value" ? Math.floor(Math.random() * 20) :
                      segment === "Regular" ? Math.floor(Math.random() * 40) :
                      segment === "Occasional" ? 30 + Math.floor(Math.random() * 60) :
                      Math.floor(Math.random() * 30);
    
    return {
      id: `CUST-${String(i + 1).padStart(4, "0")}`,
      name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ""),
      email: `contact@${names[i % names.length].toLowerCase().replace(/\s+/g, "")}.com`,
      segment,
      churnProbability: Math.round(churnProb * 100) / 100,
      riskLevel,
      lastPurchase: new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      totalSpend: segment === "High-Value" ? 50000 + Math.random() * 150000 :
                  segment === "Regular" ? 10000 + Math.random() * 40000 :
                  segment === "Occasional" ? 2000 + Math.random() * 8000 :
                  500 + Math.random() * 2000,
      orderCount: segment === "High-Value" ? 20 + Math.floor(Math.random() * 80) :
                  segment === "Regular" ? 5 + Math.floor(Math.random() * 20) :
                  segment === "Occasional" ? 1 + Math.floor(Math.random() * 5) :
                  Math.floor(Math.random() * 3),
      daysSinceLastPurchase: daysSince,
      topRiskFactors: getTopRiskFactors(segment, churnProb),
      recommendations: getRecommendations(riskLevel, segment)
    };
  }).sort((a, b) => b.churnProbability - a.churnProbability);
};

const getTopRiskFactors = (segment: string, churnProb: number): string[] => {
  const allFactors = [
    "Declining purchase frequency",
    "Low cart-to-purchase conversion",
    "High cart abandonment rate",
    "Increased refund requests",
    "Reduced category diversity",
    "Long gap since last activity",
    "Low engagement with wishlists",
    "High support ticket volume",
    "Declining average order value",
    "Reduced view-to-cart rate"
  ];
  
  const numFactors = churnProb > 0.7 ? 4 : churnProb > 0.3 ? 3 : 2;
  return allFactors.slice(0, numFactors);
};

const getRecommendations = (riskLevel: string, segment: string): string[] => {
  if (riskLevel === "High") {
    return [
      "Immediate personal outreach recommended",
      "Offer 20% retention discount",
      "Schedule success review call",
      "Priority support access"
    ];
  } else if (riskLevel === "Medium") {
    return [
      "Send re-engagement campaign",
      "Offer exclusive product preview",
      "Personalized product recommendations",
      "Feature usage training"
    ];
  } else {
    return [
      "Continue standard engagement",
      "Quarterly business review",
      "Upsell opportunities identified"
    ];
  }
};

export const featureImportanceData: FeatureImportance[] = [
  { feature: "Days Since Last Purchase", importance: 0.18, category: "Recency" },
  { feature: "Purchase Frequency", importance: 0.15, category: "Frequency" },
  { feature: "Cart-to-Purchase Rate", importance: 0.12, category: "Conversion" },
  { feature: "Total Monetary Value", importance: 0.11, category: "Monetary" },
  { feature: "Cart Abandonment Rate", importance: 0.09, category: "Engagement" },
  { feature: "Refund Rate", importance: 0.08, category: "Risk Indicators" },
  { feature: "Category Diversity", importance: 0.07, category: "Product Engagement" },
  { feature: "View-to-Cart Rate", importance: 0.06, category: "Conversion" },
  { feature: "Support Ticket Intensity", importance: 0.05, category: "Risk Indicators" },
  { feature: "Activity Trend", importance: 0.04, category: "Temporal Trends" },
  { feature: "Wishlist Engagement", importance: 0.03, category: "Engagement" },
  { feature: "Average Order Value", importance: 0.02, category: "Monetary" }
];

export const churnTrendData: ChurnTrend[] = [
  { date: "Week 1", churnRate: 15.2, predictions: 1240, interventions: 95 },
  { date: "Week 2", churnRate: 14.8, predictions: 1285, interventions: 102 },
  { date: "Week 3", churnRate: 16.1, predictions: 1320, interventions: 115 },
  { date: "Week 4", churnRate: 14.5, predictions: 1295, interventions: 98 },
  { date: "Week 5", churnRate: 13.9, predictions: 1310, interventions: 89 },
  { date: "Week 6", churnRate: 13.2, predictions: 1340, interventions: 85 },
  { date: "Week 7", churnRate: 12.8, predictions: 1360, interventions: 82 },
  { date: "Week 8", churnRate: 12.1, predictions: 1385, interventions: 78 }
];

export interface RealTimeEvent {
  id: string;
  customerId: string;
  customerName: string;
  eventType: "risk_increased" | "risk_decreased" | "action_needed" | "purchase" | "cart_abandoned" | "refund";
  riskLevel: "Low" | "Medium" | "High";
  previousRisk?: number;
  currentRisk: number;
  timestamp: string;
  description: string;
}

export interface CohortData {
  cohortName: string;
  month: string;
  customersCount: number;
  retentionRate: number;
  churnRate: number;
  avgLifetimeValue: number;
}

export interface ActionItem {
  id: string;
  customerId: string;
  customerName: string;
  priority: "Critical" | "High" | "Medium";
  actionType: "retention_call" | "discount_offer" | "email_campaign" | "support_ticket" | "review_meeting";
  status: "pending" | "in_progress" | "completed";
  assignedTo?: string;
  dueDate: string;
  estimatedValue: number;
  riskScore: number;
}

export const generateRealTimeEvents = (): RealTimeEvent[] => {
  const eventTypes: RealTimeEvent["eventType"][] = ["risk_increased", "risk_decreased", "action_needed", "purchase", "cart_abandoned", "refund"];
  const names = ["Sarah Johnson", "Michael Chen", "Emma Davis", "James Wilson", "Olivia Brown", "Liam Martinez", "Sophia Garcia", "Noah Anderson"];
  
  return Array.from({ length: 20 }, (_, i) => {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const currentRisk = Math.random();
    const riskLevel: RealTimeEvent["riskLevel"] = currentRisk > 0.7 ? "High" : currentRisk > 0.3 ? "Medium" : "Low";
    const minutesAgo = Math.floor(Math.random() * 120);
    
    return {
      id: `EVT-${String(i + 1).padStart(5, "0")}`,
      customerId: `CUST-${String(Math.floor(Math.random() * 50) + 1).padStart(4, "0")}`,
      customerName: names[i % names.length],
      eventType,
      riskLevel,
      previousRisk: eventType === "risk_increased" || eventType === "risk_decreased" ? currentRisk + (eventType === "risk_increased" ? -0.2 : 0.2) : undefined,
      currentRisk: Math.round(currentRisk * 100) / 100,
      timestamp: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      description: getEventDescription(eventType, names[i % names.length])
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const getEventDescription = (eventType: RealTimeEvent["eventType"], name: string): string => {
  const descriptions = {
    risk_increased: `${name}'s churn risk increased significantly due to declining engagement`,
    risk_decreased: `${name} showed improved engagement - risk score decreased`,
    action_needed: `${name} requires immediate retention action`,
    purchase: `${name} completed a purchase - positive signal`,
    cart_abandoned: `${name} abandoned cart with high-value items`,
    refund: `${name} requested a refund - negative engagement signal`
  };
  return descriptions[eventType];
};

export const generateCohortData = (): CohortData[] => {
  const months = ["Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024", "Jun 2024"];
  const cohorts = ["New Signups", "Black Friday", "Spring Sale", "Loyalty Program", "Referral", "Organic"];
  
  return cohorts.map((cohort, i) => ({
    cohortName: cohort,
    month: months[i % months.length],
    customersCount: 200 + Math.floor(Math.random() * 500),
    retentionRate: 60 + Math.random() * 30,
    churnRate: 10 + Math.random() * 25,
    avgLifetimeValue: 1000 + Math.random() * 4000
  }));
};

export const generateActionItems = (): ActionItem[] => {
  const names = ["Sarah Johnson", "Michael Chen", "Emma Davis", "James Wilson", "Olivia Brown", "Liam Martinez", "Sophia Garcia", "Noah Anderson"];
  const actionTypes: ActionItem["actionType"][] = ["retention_call", "discount_offer", "email_campaign", "support_ticket", "review_meeting"];
  const statuses: ActionItem["status"][] = ["pending", "in_progress", "completed"];
  const priorities: ActionItem["priority"][] = ["Critical", "High", "Medium"];
  const assignees = ["Alex Turner", "Sam Rodriguez", "Jordan Lee", "Taylor Kim"];
  
  return Array.from({ length: 15 }, (_, i) => {
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const riskScore = priority === "Critical" ? 0.8 + Math.random() * 0.15 : 
                     priority === "High" ? 0.6 + Math.random() * 0.2 : 
                     0.4 + Math.random() * 0.2;
    const daysFromNow = Math.floor(Math.random() * 7);
    
    return {
      id: `ACT-${String(i + 1).padStart(4, "0")}`,
      customerId: `CUST-${String(Math.floor(Math.random() * 50) + 1).padStart(4, "0")}`,
      customerName: names[i % names.length],
      priority,
      actionType: actionTypes[Math.floor(Math.random() * actionTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      assignedTo: Math.random() > 0.3 ? assignees[Math.floor(Math.random() * assignees.length)] : undefined,
      dueDate: new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      estimatedValue: 500 + Math.random() * 4500,
      riskScore: Math.round(riskScore * 100) / 100
    };
  }).sort((a, b) => {
    const priorityOrder = { Critical: 0, High: 1, Medium: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};
