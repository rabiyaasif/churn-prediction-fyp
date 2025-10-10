// src/pages/Reports.tsx
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const salesData = [
  { date: "Mon", sales: 120 },
  { date: "Tue", sales: 200 },
  { date: "Wed", sales: 150 },
  { date: "Thu", sales: 300 },
  { date: "Fri", sales: 250 },
];

const productData = [
  { name: "Product A", sold: 400 },
  { name: "Product B", sold: 300 },
  { name: "Product C", sold: 200 },
  { name: "Product D", sold: 150 },
];

export default function Reports() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList>
          <TabsTrigger value="sales">Sales Reports</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="retention">Retention & Churn</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend (This Week)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 flex gap-2">
                <Button>Export as PDF</Button>
                <Button variant="outline">Export as CSV</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Performance */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sold" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex gap-2">
                <Button>Export as PDF</Button>
                <Button variant="outline">Export as CSV</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention / Churn */}
        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle>Retention & Churn Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Retention Rate: <span className="font-bold text-green-600">85%</span>
              </p>
              <p className="text-gray-600">
                Churn Rate: <span className="font-bold text-red-600">15%</span>
              </p>
              <div className="mt-4 flex gap-2">
                <Button>Export as PDF</Button>
                <Button variant="outline">Export as CSV</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
