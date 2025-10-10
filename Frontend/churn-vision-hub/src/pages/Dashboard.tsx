import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Users, AlertTriangle, 
  DollarSign, Activity, ArrowRight, MoreHorizontal, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";


const highRiskCustomers = [
  {
    name: "Sarah Johnson",
    email: "sarah@company.com",
    riskScore: 87,
    lastActivity: "2 days ago",
    value: "$2,340"
  },
  {
    name: "Mike Chen",
    email: "mike@startup.io",
    riskScore: 76,
    lastActivity: "5 days ago",
    value: "$1,890"
  },
  {
    name: "Emma Davis",
    email: "emma@business.com",
    riskScore: 72,
    lastActivity: "1 week ago",
    value: "$3,120"
  }
];

const recentEvents = [
  {
    type: "purchase",
    customer: "John Smith",
    value: "$234.50",
    time: "2 minutes ago"
  },
  {
    type: "login",
    customer: "Alice Brown",
    value: "Dashboard view",
    time: "5 minutes ago"
  },
  {
    type: "support",
    customer: "David Wilson",
    value: "Ticket created",
    time: "12 minutes ago"
  }
];
const metrics = [
  {
    title: "Total Customers",
    value: "12,847",
    change: "+2.5%",
    trend: "up",
    icon: Users,
    color: "primary"
  },
  {
    title: "Churn Risk",
    value: "324",
    change: "-12%",
    trend: "down",
    icon: AlertTriangle,
    color: "warning"
  },
  {
    title: "Revenue at Risk",
    value: "$45,230",
    change: "-8.2%",
    trend: "down",
    icon: DollarSign,
    color: "destructive"
  },
  {
    title: "Retention Rate",
    value: "94.2%",
    change: "+1.2%",
    trend: "up",
    icon: TrendingUp,
    color: "success"
  }
];

export default function Dashboard() {
  const [bestSelling, setBestSelling] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [neglectedProducts, setNeglectedProducts] = useState([]);

useEffect(() => {
  // Fetch best-selling products
  fetch("http://localhost:8000/api/best-selling", {
    headers: {
      "x-api-key": "75f39c795fcb02286b5e5e9265e12c80e9d848b41dd089f02daeb965204dacb1",
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(setBestSelling)
    .catch(err => console.error(err));

  // Fetch sales over time
  fetch("http://localhost:8000/api/sales-over-time", {
    headers: {
      "x-api-key": "75f39c795fcb02286b5e5e9265e12c80e9d848b41dd089f02daeb965204dacb1",
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(setSalesTrend) // you probably want a different state for this
    .catch(err => console.error(err));

    fetch("http://localhost:8000/api/neglected_items", {
      headers: {
        "x-api-key": "75f39c795fcb02286b5e5e9265e12c80e9d848b41dd089f02daeb965204dacb1",
        "Content-Type": "application/json"
      }
    })
      .then(res => res.json())
      .then(setNeglectedProducts)
      .catch(err => console.error(err));
}, []);

//   useEffect(() => {
// fetch("http://localhost:8000/api/best-selling")
//   .then(res => res.json())
//   .then(setBestSelling)
//   .catch(err => console.error(err));
//     // fetch("/api/sales-trend").then(res => res.json()).then(setSalesTrend);
//     // fetch("/api/neglected-products").then(res => res.json()).then(setNeglectedProducts);
//   }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ecommerce Dashboard</h1>
          <p className="text-muted-foreground">Sales, trends & neglected products</p>
        </div>
        <Button>
          View Full Report
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrend}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="daily_revenue" stroke="#4f46e5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Best Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Best Selling Products</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bestSelling}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_quantity_sold" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Neglected Products */}
      <Card>
        <CardHeader>
          <CardTitle>Neglected Products (No Sales)</CardTitle>
        </CardHeader>
        <CardContent>
          {neglectedProducts.length === 0 ? (
            <p className="text-muted-foreground">No neglected products 🎉</p>
          ) : (
            <ul className="list-disc pl-5">
              {neglectedProducts.map((p, idx) => (
                <li key={idx}>{p.name || p.product_id}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Scroll Down: Your Existing Cards */}
      {/* Insert your old metrics, High Risk Customers, Recent Activity sections here */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="shadow-card hover:shadow-card-hover transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${metric.color}/10`}>
                <metric.icon className={`w-4 h-4 text-${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <div className="flex items-center text-xs mt-1">
                {metric.trend === "up" ? (
                  <TrendingUp className="w-3 h-3 text-success mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive mr-1" />
                )}
                <span className={metric.trend === "up" ? "text-success" : "text-destructive"}>
                  {metric.change}
                </span>
                <span className="text-muted-foreground ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
        {    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">High Risk Customers</CardTitle>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {highRiskCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-foreground">{customer.name}</div>
                  <div className="text-sm text-muted-foreground">{customer.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last activity: {customer.lastActivity}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant={customer.riskScore > 80 ? "destructive" : "warning"}>
                    {customer.riskScore}% risk
                  </Badge>
                  <div className="text-sm font-medium text-foreground">{customer.value}</div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              View All High Risk Customers
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm">
              <Activity className="w-4 h-4 mr-2" />
              Live
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentEvents.map((event, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center
                  ${event.type === 'purchase' ? 'bg-success/10 text-success' : 
                    event.type === 'login' ? 'bg-primary/10 text-primary' : 
                    'bg-warning/10 text-warning'}`}>
                  {event.type === 'purchase' ? '💰' : 
                   event.type === 'login' ? '👤' : '🎧'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{event.customer}</div>
                  <div className="text-sm text-muted-foreground">{event.value}</div>
                </div>
                <div className="text-xs text-muted-foreground">{event.time}</div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              View Event Explorer
            </Button>
          </CardContent>
        </Card>
      </div> }
             <Card className="shadow-card">
         <CardHeader>
           <CardTitle className="text-lg font-semibold">Churn Trend Analysis</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
             <div className="text-center">
               <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground">Chart visualization will be implemented</p>
             </div>
           </div>
         </CardContent>
       </Card>
      
    </div>
  );
}


