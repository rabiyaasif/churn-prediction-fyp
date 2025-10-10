import { useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { 
  BookOpen, Key, Code, Send, ArrowRight, BarChart3,
  CheckCircle, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const onboardingSteps = [
  { 
    title: "Introduction", 
    path: "/onboarding/intro", 
    icon: BookOpen,
    description: "Learn about ChurnPredict"
  },
  { 
    title: "Get Your API Key", 
    path: "/onboarding/api-key", 
    icon: Key,
    description: "Generate your tracking keys"
  },
  { 
    title: "Add Tracking Snippet", 
    path: "/onboarding/tracking", 
    icon: Code,
    description: "Install the tracking code"
  },
  { 
    title: "Send Test Event", 
    path: "/onboarding/test", 
    icon: Send,
    description: "Verify your integration"
  },
  { 
    title: "Next Steps", 
    path: "/onboarding/next", 
    icon: ArrowRight,
    description: "Start using the dashboard"
  }
];

export function OnboardingLayout() {
  const location = useLocation();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const isActive = (path: string) => location.pathname === path;
  const isCompleted = (path: string) => completedSteps.includes(path);
  const currentStepIndex = onboardingSteps.findIndex(step => isActive(step.path));

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Left Navigation - Snowflake Style */}
        <aside className="w-80 bg-card border-r border-border">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">ChurnPredict</h1>
                <p className="text-sm text-muted-foreground">Setup Guide</p>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="p-6 border-b border-border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Setup Progress</span>
                <span className="text-sm text-muted-foreground">
                  {completedSteps.length}/{onboardingSteps.length}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(completedSteps.length / onboardingSteps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Steps */}
          <nav className="p-4 space-y-2">
            {onboardingSteps.map((step, index) => {
              const completed = isCompleted(step.path);
              const active = isActive(step.path);
              
              return (
                <NavLink
                  key={step.path}
                  to={step.path}
                  className={`
                    block p-4 rounded-lg border transition-all duration-200
                    ${active 
                      ? 'bg-primary/5 border-primary text-primary' 
                      : completed
                        ? 'bg-success/5 border-success/20 text-success hover:bg-success/10'
                        : 'border-border hover:bg-muted text-foreground'
                    }
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`
                      flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5
                      ${active 
                        ? 'bg-primary text-primary-foreground' 
                        : completed 
                          ? 'bg-success text-success-foreground'
                          : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {completed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : active ? (
                        <step.icon className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          STEP {index + 1}
                        </span>
                      </div>
                      <h3 className="font-medium mt-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* Help Section */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border bg-muted/30">
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Need Help?</h3>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
                  📚 View Documentation
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
                  💬 Contact Support
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Progress Header */}
          <div className="bg-card border-b border-border px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                  <span>STEP {currentStepIndex + 1} OF {onboardingSteps.length}</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {onboardingSteps[currentStepIndex]?.title || "Setup"}
                </h1>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/dashboard'}
              >
                Skip to Dashboard
              </Button>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            <Outlet context={{ completedSteps, setCompletedSteps }} />
          </div>
        </main>
      </div>
    </div>
  );
}