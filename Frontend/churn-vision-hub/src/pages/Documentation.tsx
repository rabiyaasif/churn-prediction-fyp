import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, Code, AlertCircle, CheckCircle, 
  Copy, ExternalLink, Key, Database, Zap
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const API_BASE_URL = "http://localhost:8000"; // Replace with your production URL

export default function Documentation() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language = "json", id }: { code: string; language?: string; id: string }) => (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? (
          <CheckCircle className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-dashboard">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">ChurnPredict API Documentation</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Introduction */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            API Integration Guide
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Integrate ChurnPredict APIs into your website to enable churn prediction. 
            Track products, users, and customer events to get accurate churn risk predictions.
          </p>
          
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                All API endpoints require authentication using your API key. Include it in the request header:
              </p>
              <CodeBlock 
                code={`X-API-Key: your_api_key_here`} 
                language="text"
                id="auth-header"
              />
              <p className="text-sm text-muted-foreground mt-4">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                <strong>Important:</strong> You will receive your API key when you register. Keep it secure and never expose it in client-side code.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* API Tabs */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Products API
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Users API
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Events API
            </TabsTrigger>
          </TabsList>

          {/* Products API */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Products API</CardTitle>
                <CardDescription>
                  Integrate this API in your backend to automatically sync products when they are added to your catalog.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono">POST</Badge>
                    <code className="text-sm">{API_BASE_URL}/products/bulk</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Insert one or multiple products at once. Products are automatically associated with your account via API key.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Required Fields
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                    <li><code className="bg-muted px-1 rounded">product_id</code> (string) - Your unique identifier for this product</li>
                    <li><code className="bg-muted px-1 rounded">name</code> (string) - Product name</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Optional Fields</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                    <li><code className="bg-muted px-1 rounded">description</code> (string) - Product description</li>
                    <li><code className="bg-muted px-1 rounded">category</code> (string) - Product category</li>
                    <li><code className="bg-muted px-1 rounded">price</code> (float) - Product price</li>
                    <li><code className="bg-muted px-1 rounded">currency</code> (string) - Currency code (e.g., "USD", "EUR")</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Request Example (Single Product)</h3>
                  <CodeBlock
                    code={`{
  "product_id": "prod_001",
  "name": "Wireless Headphones",
  "description": "Premium noise-cancelling headphones",
  "category": "Electronics",
  "price": 199.99,
  "currency": "USD"
}`}
                    id="product-single"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Request Example (Multiple Products)</h3>
                  <CodeBlock
                    code={`[
  {
    "product_id": "prod_001",
    "name": "Wireless Headphones",
    "description": "Premium noise-cancelling headphones",
    "category": "Electronics",
    "price": 199.99,
    "currency": "USD"
  },
  {
    "product_id": "prod_002",
    "name": "Laptop Stand",
    "description": "Adjustable aluminum laptop stand",
    "category": "Accessories",
    "price": 49.99,
    "currency": "USD"
  }
]`}
                    id="product-multiple"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Response</h3>
                  <CodeBlock
                    code={`{
  "inserted": 2
}`}
                    id="product-response"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Integration Example (JavaScript/Node.js)</h3>
                  <CodeBlock
                    code={`// When a product is added to your catalog
async function syncProduct(product) {
  const response = await fetch('${API_BASE_URL}/products/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key_here'
    },
    body: JSON.stringify([{
      product_id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      currency: product.currency || 'USD'
    }])
  });
  
  const result = await response.json();
  console.log(\`Synced \${result.inserted} product(s)\`);
}`}
                    language="javascript"
                    id="product-integration"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>💡 Best Practice:</strong> Call this API whenever you add a new product to your catalog. 
                    You can send multiple products in a single request for better performance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users API */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Users API</CardTitle>
                <CardDescription>
                  Integrate this API in your signup flow to automatically register new users when they create an account on your website.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono">POST</Badge>
                    <code className="text-sm">{API_BASE_URL}/users/</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Register a customer/user in the system. Users are automatically associated with your account via API key.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Required Fields
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                    <li><code className="bg-muted px-1 rounded">user_id</code> (string) - Your unique identifier for this user/customer</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Optional Fields</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                    <li><code className="bg-muted px-1 rounded">email</code> (string) - Customer's email address</li>
                    <li><code className="bg-muted px-1 rounded">name</code> (string) - Customer's name</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Request Example</h3>
                  <CodeBlock
                    code={`{
  "user_id": "user_12345",
  "email": "customer@example.com",
  "name": "John Doe"
}`}
                    id="user-request"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Response</h3>
                  <CodeBlock
                    code={`{
  "user_id": "user_12345",
  "email": "customer@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z"
}`}
                    id="user-response"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Integration Example (JavaScript/Node.js)</h3>
                  <CodeBlock
                    code={`// When a new user signs up on your website
async function registerUser(userData) {
  const response = await fetch('${API_BASE_URL}/users/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key_here'
    },
    body: JSON.stringify({
      user_id: userData.id, // Your internal user ID
      email: userData.email,
      name: userData.name
    })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('User registered:', result.user_id);
  }
}`}
                    language="javascript"
                    id="user-integration"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Bulk Insert Users</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    For importing existing users, use the bulk endpoint:
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono">POST</Badge>
                    <code className="text-sm">{API_BASE_URL}/users/bulk</code>
                  </div>
                  <CodeBlock
                    code={`[
  {
    "user_id": "user_001",
    "email": "user1@example.com",
    "name": "User One"
  },
  {
    "user_id": "user_002",
    "email": "user2@example.com",
    "name": "User Two"
  }
]`}
                    id="user-bulk"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>💡 Best Practice:</strong> Call this API immediately after a successful user registration. 
                    Use your internal user ID as <code className="bg-muted px-1 rounded">user_id</code> to maintain consistency across all APIs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events API */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Events API</CardTitle>
                <CardDescription>
                  Track customer behavior events in real-time. This is the core of churn prediction - events are used to calculate features for the ML model.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono">POST</Badge>
                    <code className="text-sm">{API_BASE_URL}/events/bulk</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Track customer behavior events. Send single events or batch multiple events together.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Required Fields
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                    <li><code className="bg-muted px-1 rounded">event_type</code> (string) - Type of event (see Event Types below)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Optional Fields</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                    <li><code className="bg-muted px-1 rounded">user_id</code> (string) - User who performed the action</li>
                    <li><code className="bg-muted px-1 rounded">product_id</code> (string) - Product involved in the event</li>
                    <li><code className="bg-muted px-1 rounded">email</code> (string) - User's email (alternative to user_id if user not registered)</li>
                    <li><code className="bg-muted px-1 rounded">session_id</code> (string) - Session identifier for grouping related events</li>
                    <li><code className="bg-muted px-1 rounded">quantity</code> (integer) - Quantity involved (e.g., items purchased, items added to cart)</li>
                    <li><code className="bg-muted px-1 rounded">price</code> (float) - Price/value associated with the event</li>
                    <li><code className="bg-muted px-1 rounded">timestamp</code> (datetime) - When the event occurred (ISO 8601 format). If omitted, current time is used.</li>
                    <li><code className="bg-muted px-1 rounded">extra_data</code> (object) - Additional metadata as key-value pairs</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Event Types for Churn Prediction</h3>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      "added_to_cart",
                      "removed_from_cart",
                      "added_to_wishlist",
                      "removed_from_wishlist",
                      "proceed_to_checkout",
                      "purchase",
                      "cart_quantity_updated",
                      "page_view",
                      "search",
                      "login",
                      "logout"
                    ].map((eventType) => (
                      <Badge key={eventType} variant="secondary" className="justify-start">
                        {eventType}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Request Example - Add to Cart</h3>
                  <CodeBlock
                    code={`{
  "user_id": "user_12345",
  "product_id": "prod_001",
  "event_type": "added_to_cart",
  "session_id": "session_abc123",
  "quantity": 1,
  "price": 199.99,
  "timestamp": "2024-01-15T10:25:00Z"
}`}
                    id="event-cart"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Request Example - Remove from Cart</h3>
                  <CodeBlock
                    code={`{
  "user_id": "user_12345",
  "product_id": "prod_001",
  "event_type": "removed_from_cart",
  "session_id": "session_abc123",
  "quantity": 1,
  "price": 199.99
}`}
                    id="event-remove-cart"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Request Example - Add to Wishlist</h3>
                  <CodeBlock
                    code={`{
  "user_id": "user_12345",
  "product_id": "prod_003",
  "event_type": "added_to_wishlist",
  "session_id": "session_abc123"
}`}
                    id="event-wishlist"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Request Example - Proceed to Checkout</h3>
                  <CodeBlock
                    code={`{
  "user_id": "user_12345",
  "event_type": "proceed_to_checkout",
  "session_id": "session_abc123",
  "price": 399.98
}`}
                    id="event-checkout"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Request Example - Purchase</h3>
                  <CodeBlock
                    code={`{
  "user_id": "user_12345",
  "product_id": "prod_001",
  "event_type": "purchase",
  "session_id": "session_abc123",
  "quantity": 2,
  "price": 399.98,
  "timestamp": "2024-01-15T10:30:00Z",
  "extra_data": {
    "payment_method": "credit_card",
    "discount_code": "SAVE10"
  }
}`}
                    id="event-purchase"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Request Example - Batch Events</h3>
                  <CodeBlock
                    code={`[
  {
    "user_id": "user_12345",
    "product_id": "prod_001",
    "event_type": "added_to_cart",
    "session_id": "session_abc123",
    "quantity": 1,
    "price": 199.99
  },
  {
    "user_id": "user_12345",
    "product_id": "prod_001",
    "event_type": "purchase",
    "session_id": "session_abc123",
    "quantity": 1,
    "price": 199.99
  }
]`}
                    id="event-batch"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Response</h3>
                  <CodeBlock
                    code={`{
  "inserted": 2
}`}
                    id="event-response"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Integration Examples</h3>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2">Frontend Integration (JavaScript)</h4>
                    <CodeBlock
                      code={`// Track "Add to Cart" event
async function trackAddToCart(userId, productId, price, quantity) {
  await fetch('${API_BASE_URL}/events/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key_here'
    },
    body: JSON.stringify({
      user_id: userId,
      product_id: productId,
      event_type: 'added_to_cart',
      session_id: getSessionId(), // Your session tracking
      quantity: quantity,
      price: price
    })
  });
}

// Track "Proceed to Checkout" event
async function trackCheckout(userId, totalPrice) {
  await fetch('${API_BASE_URL}/events/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key_here'
    },
    body: JSON.stringify({
      user_id: userId,
      event_type: 'proceed_to_checkout',
      session_id: getSessionId(),
      price: totalPrice
    })
  });
}`}
                      language="javascript"
                      id="event-frontend"
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Backend Integration (Node.js)</h4>
                    <CodeBlock
                      code={`// When customer adds item to wishlist
app.post('/api/wishlist/add', async (req, res) => {
  const { userId, productId } = req.body;
  
  // Your business logic here
  await addToWishlist(userId, productId);
  
  // Track event for churn prediction
  await fetch('${API_BASE_URL}/events/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.CHURN_PREDICT_API_KEY
    },
    body: JSON.stringify({
      user_id: userId,
      product_id: productId,
      event_type: 'added_to_wishlist',
      session_id: req.session.id
    })
  });
  
  res.json({ success: true });
});`}
                      language="javascript"
                      id="event-backend"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm mb-2">
                    <strong>⚠️ Critical for Churn Prediction:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Always include <code className="bg-muted px-1 rounded">user_id</code> or <code className="bg-muted px-1 rounded">email</code> when available</li>
                    <li>Track all cart and wishlist interactions - these are critical for accurate predictions</li>
                    <li>Use consistent <code className="bg-muted px-1 rounded">session_id</code> values to group related events</li>
                    <li>Include <code className="bg-muted px-1 rounded">price</code> and <code className="bg-muted px-1 rounded">quantity</code> for purchase events</li>
                    <li>Send events in real-time for best accuracy, or batch them every 1-5 minutes</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mandatory Data Section */}
        <Card className="mt-12 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Mandatory Data for Accurate Churn Prediction
            </CardTitle>
            <CardDescription>
              To get proper churn predictions, ensure you send the following data:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. User Identification</h3>
              <p className="text-sm text-muted-foreground">
                Always include either <code className="bg-muted px-1 rounded">user_id</code> or <code className="bg-muted px-1 rounded">email</code> in events. 
                This allows us to track individual customer behavior patterns.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Product Information</h3>
              <p className="text-sm text-muted-foreground">
                Include <code className="bg-muted px-1 rounded">product_id</code> in events related to products (cart, wishlist, purchase). 
                Ensure products are synced via the Products API first.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Event Types</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Track these critical events for accurate predictions:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Cart Events:</strong> <code className="bg-muted px-1 rounded">added_to_cart</code>, <code className="bg-muted px-1 rounded">removed_from_cart</code>, <code className="bg-muted px-1 rounded">cart_quantity_updated</code></li>
                <li><strong>Wishlist Events:</strong> <code className="bg-muted px-1 rounded">added_to_wishlist</code>, <code className="bg-muted px-1 rounded">removed_from_wishlist</code></li>
                <li><strong>Purchase Events:</strong> <code className="bg-muted px-1 rounded">proceed_to_checkout</code>, <code className="bg-muted px-1 rounded">purchase</code></li>
                <li><strong>Engagement Events:</strong> <code className="bg-muted px-1 rounded">login</code>, <code className="bg-muted px-1 rounded">page_view</code>, <code className="bg-muted px-1 rounded">search</code></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Session Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Use consistent <code className="bg-muted px-1 rounded">session_id</code> values to group related events. 
                This helps identify customer journeys and behavior patterns.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5. Pricing Information</h3>
              <p className="text-sm text-muted-foreground">
                Include <code className="bg-muted px-1 rounded">price</code> and <code className="bg-muted px-1 rounded">quantity</code> for purchase events. 
                This enables calculation of customer lifetime value and spending patterns.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Handling */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Error Responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">401 Unauthorized</h3>
              <CodeBlock
                code={`{
  "detail": "Invalid or missing API Key"
}`}
                id="error-401"
              />
            </div>
            <div>
              <h3 className="font-semibold mb-2">400 Bad Request</h3>
              <CodeBlock
                code={`{
  "detail": "Invalid request format or missing required fields"
}`}
                id="error-400"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

