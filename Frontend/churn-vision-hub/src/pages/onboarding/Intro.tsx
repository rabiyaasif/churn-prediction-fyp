import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Users, AlertTriangle, 
  ArrowRight, CheckCircle, Zap, Target
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track customer behavior and identify patterns that lead to churn"
  },
  {
    icon: TrendingUp,
    title: "Predictive Modeling", 
    description: "AI-powered algorithms predict which customers are likely to churn"
  },
  {
    icon: AlertTriangle,
    title: "Early Warnings",
    description: "Get notified when customers show signs of disengagement"
  },
  {
    icon: Target,
    title: "Actionable Insights",
    description: "Receive specific recommendations to retain at-risk customers"
  }
];

const steps = [
  "Get your unique API key and client ID",
  "Add our tracking snippet to your website", 
  "Send a test event to verify integration",
  "Start monitoring customer behavior"
];

export default function OnboardingIntro() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <Badge variant="secondary" className="mb-4">
          <Zap className="w-3 h-3 mr-2" />
          Welcome to ChurnPredict
        </Badge>
        
        <h1 className="text-4xl font-bold text-foreground leading-tight">
          Predict and prevent customer churn with 
          <span className="bg-gradient-primary bg-clip-text text-transparent"> AI-powered insights</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          ChurnPredict helps e-commerce businesses identify at-risk customers before they leave, 
          so you can take action to retain them and grow your revenue.
        </p>
      </div>

      {/* What You'll Get */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl">What you'll get with ChurnPredict</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Setup Process */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl">Quick setup in 4 easy steps</CardTitle>
          <p className="text-muted-foreground">Get started in less than 5 minutes</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {index + 1}
                </div>
                <span className="text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="text-center shadow-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-success mb-2">94%</div>
            <div className="text-muted-foreground">Prediction accuracy</div>
          </CardContent>
        </Card>
        <Card className="text-center shadow-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary mb-2">32%</div>
            <div className="text-muted-foreground">Average churn reduction</div>
          </CardContent>
        </Card>
        <Card className="text-center shadow-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-warning mb-2">2.4x</div>
            <div className="text-muted-foreground">ROI improvement</div>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Ready to get started?</p>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Link to="/onboarding/api-key">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              Start Setup Process
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Button variant="outline" size="lg">
            Watch Demo Video
          </Button>
        </div>
        
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mt-4">
          <CheckCircle className="w-4 h-4 text-success" />
          <span>Free 14-day trial • No credit card required</span>
        </div>
      </div>
    </div>
  );
}