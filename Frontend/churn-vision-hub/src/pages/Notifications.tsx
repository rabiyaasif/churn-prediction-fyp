// src/pages/Notifications.tsx
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";

export default function Notifications() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>

      {/* Email Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Email Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>High churn risk users</span>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span>Sales milestones</span>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <span>API errors</span>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>In-App Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="border p-3 rounded-lg">⚠️ 5 users flagged as high churn risk today</div>
          <div className="border p-3 rounded-lg">✅ Sales milestone reached: $10,000 this week</div>
          <div className="border p-3 rounded-lg">❌ API error: Payment event failed</div>
        </CardContent>
      </Card>
    </div>
  );
}
