import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";

type Range = { from: string; to: string };
const DEFAULT_RANGE: Range = { from: "2025-07-01", to: "2025-08-14" }; // set dynamically in your app

export default function EventExplorer() {
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const [funnel, setFunnel] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [neglected, setNeglected] = useState<any[]>([]);
  const [cart, setCart] = useState<any>(null);
  const [wishlist, setWishlist] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);

  const query = useMemo(() => `?from=${range.from}&to=${range.to}&client_id=1`, [range]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/insights/funnel${query}`).then(r=>r.json()),
      fetch(`/api/insights/top-products${query}`).then(r=>r.json()),
      fetch(`/api/insights/neglected-products${query}`).then(r=>r.json()),
      fetch(`/api/insights/cart-health${query}`).then(r=>r.json()),
      fetch(`/api/insights/wishlist-impact${query}`).then(r=>r.json()),
      fetch(`/api/insights/timeseries${query}`).then(r=>r.json()),
    ]).then(([f,t,n,c,w,ts]) => {
      setFunnel(f); setTopProducts(t); setNeglected(n); setCart(c); setWishlist(w); setTimeseries(ts);
    });
  }, [query]);

  const funnelRates = useMemo(() => {
    if (!funnel) return null;
    const { sessions, add_to_cart_sessions, order_sessions } = funnel;
    const toAtc = sessions ? (add_to_cart_sessions / sessions) * 100 : 0;
    const toOrder = add_to_cart_sessions ? (order_sessions / add_to_cart_sessions) * 100 : 0;
    return { toAtc, toOrder };
  }, [funnel]);

  return (
    <div className="space-y-6">
      {/* Filters / Date Range */}
      <Card>
        <CardContent className="py-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">From</span>
            <Input type="date" value={range.from} onChange={e => setRange(r => ({...r, from: e.target.value}))} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">To</span>
            <Input type="date" value={range.to} onChange={e => setRange(r => ({...r, to: e.target.value}))} />
          </div>
          <Button variant="outline" onClick={()=>setRange(DEFAULT_RANGE)}>Reset</Button>
        </CardContent>
      </Card>

      {/* Top: Timeseries & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-80">
          <CardHeader><CardTitle>Revenue & Orders Over Time</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-muted-foreground">
              Anomalies are highlighted in API (use to trigger alerts).
            </div>
          </CardContent>
        </Card>
        <Card className="h-80">
          <CardHeader><CardTitle>Funnel Conversion</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <Stat label="Sessions" value={funnel?.sessions ?? 0} />
            <Stat label="Add to Cart" value={funnel?.add_to_cart_sessions ?? 0} sub={`${funnelRates?.toAtc?.toFixed(1)}%`} />
            <Stat label="Orders" value={funnel?.order_sessions ?? 0} sub={`${funnelRates?.toOrder?.toFixed(1)}%`} />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="cart">Cart Health</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist Impact</TabsTrigger>
          <TabsTrigger value="opps">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6 mt-4">
          <Card className="h-96">
            <CardHeader><CardTitle>Top Products by Quantity</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <XAxis dataKey="product_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_qty" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Neglected Products (engaged, no sales)</CardTitle></CardHeader>
            <CardContent>
              {neglected.length === 0 ? (
                <p className="text-muted-foreground">No neglected products 🎉</p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {neglected.map((p:any) => <li key={p.product_id} className="p-3 rounded-lg bg-muted/30">{p.product_id}</li>)}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cart" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle>Cart KPIs</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Carts Started" value={cart?.carts_started ?? 0} />
              <Stat label="Carts → Orders" value={cart?.carts_converted ?? 0}
                    sub={`${cart && cart.carts_started ? ((cart.carts_converted/cart.carts_started)*100).toFixed(1) : 0}%`} />
              <Stat label="Removals" value={cart?.removed ?? 0} />
              <Stat label="Qty Updates" value={cart?.updates ?? 0} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Average Cart Value</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{name:"ACV", value: cart?.acv ?? 0 }, {name:"Goal", value: Math.max(0, (cart?.acv ?? 0)*0.3)}]} dataKey="value" outerRadius={120} label />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wishlist" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle>Wishlist Conversion Lift</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Wishlist→Order" value={`${((wishlist?.wishlist_conversion_rate ?? 0)*100).toFixed(1)}%`} />
              <Stat label="No-Wishlist→Order" value={`${((wishlist?.non_wishlist_conversion_rate ?? 0)*100).toFixed(1)}%`} />
              <div className="col-span-2">
                <Button className="w-full" variant="outline">
                  Create campaign: “Convert Wishlists” <TrendingUp className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opps" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Quick Opportunities</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button variant="secondary" onClick={()=>alert("Filter: Neglected products with high add_to_cart events")}>
                Push neglected-but-engaged
              </Button>
              <Button variant="secondary" onClick={()=>alert("Filter: High remove_from_cart rate")}>
                Fix high-abandon carts
              </Button>
              <Button variant="secondary" onClick={()=>alert("Filter: Wishlist → Order segments")}>
                Retarget wishlisters
              </Button>
              <Button variant="secondary" onClick={()=>alert("Filter: Price-sensitive (many qty updates)")}>
                Test price incentives
              </Button>
              <Button variant="secondary" onClick={()=>alert("Filter: Anomaly days to replicate or fix")}>
                Investigate anomaly days
              </Button>
              <Button variant="secondary" onClick={()=>alert("Filter: Top sellers low margin → upsell bundles")}>
                Bundle top sellers
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, sub }:{label:string; value:any; sub?:string}) {
  return (
    <div className="p-4 rounded-xl bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground mt-1">{sub}</div> : null}
    </div>
  );
}
