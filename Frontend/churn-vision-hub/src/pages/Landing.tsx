import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Users, 
  CheckCircle, ArrowRight, Star, Zap
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: TrendingUp,
    title: "Predictive Analytics",
    description: "AI-powered algorithms analyze customer behavior patterns to predict churn risk with 94% accuracy."
  },
  // {
  //   icon: AlertTriangle,
  //   title: "Real-time Alerts",
  //   description: "Get instant notifications when customers show early signs of churn so you can take action immediately."
  // },
  {
    icon: Users,
    title: "Customer Insights",
    description: "Deep dive into individual customer profiles and understand what drives their loyalty or dissatisfaction."
  },
  {
    icon: BarChart3,
    title: "Advanced Reports",
    description: "Comprehensive analytics and custom reports to track retention metrics and campaign effectiveness."
  }
];

const stats = [
  { value: "7+ Metrics", label: "Analysis" },
  { value: "4 Segments", label: "Segmentation" },
  { value: "Insights", label: "Risk Detection" },
  { value: "Weekly", label: "AI-Generated Reports" }
];


export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-dashboard">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">ChurnPredict</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/docs">
                <Button variant="ghost">Documentation</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6">
            <Zap className="w-3 h-3 mr-2" />
            AI-Powered Churn Prevention
          </Badge>
          
          <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
            Predict and Prevent
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Customer Churn</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Use advanced machine learning to identify at-risk customers before they leave. 
            
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            {/* <Button variant="outline" size="lg">
              Watch Demo
            </Button> */}
          </div>

          {/* Stats */}
          {/* Stats */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
  {stats.map((stat, index) => (
    <div key={index} className="text-center">
      <div className="text-lg font-semibold text-foreground mb-1">{stat.value}</div>
      <div className="text-sm text-muted-foreground">{stat.label}</div>
    </div>
  ))}
</div>

        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything you need to reduce churn
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools and insights to understand your customers and keep them engaged.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-card-border hover:shadow-card-hover transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-card border-y border-border">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to reduce churn and increase revenue?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of businesses using ChurnPredict to build stronger customer relationships.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link to="/signup">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                  Start Your Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">ChurnPredict</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}