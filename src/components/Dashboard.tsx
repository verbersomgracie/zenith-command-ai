import { motion } from "framer-motion";
import { CheckSquare, Wallet, Target, TrendingUp } from "lucide-react";
import ChatInterface from "./ChatInterface";
import StatsCard from "./StatsCard";
import QuickActions from "./QuickActions";
import ActivityFeed from "./ActivityFeed";
import SystemStatus from "./SystemStatus";

const Dashboard = () => {
  const stats = [
    {
      icon: CheckSquare,
      title: "Active Tasks",
      value: 24,
      subtitle: "8 due today",
      trend: { value: 12, isPositive: true },
    },
    {
      icon: Wallet,
      title: "Monthly Balance",
      value: "$4,285",
      subtitle: "Budget: $5,000",
      trend: { value: 8, isPositive: true },
    },
    {
      icon: Target,
      title: "Habit Streak",
      value: "14 days",
      subtitle: "Best: 21 days",
      trend: { value: 5, isPositive: true },
    },
    {
      icon: TrendingUp,
      title: "Productivity",
      value: "87%",
      subtitle: "This week",
      trend: { value: 3, isPositive: true },
    },
  ];

  return (
    <div className="flex-1 ml-20 lg:ml-64 min-h-screen bg-grid-pattern">
      <div className="p-4 lg:p-8 max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Good Evening, <span className="text-primary text-glow-sm">Commander</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                All systems operational • {new Date().toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass-card px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <StatsCard
              key={stat.title}
              icon={stat.icon}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              trend={stat.trend}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface - Main */}
          <div className="lg:col-span-2 h-[600px]">
            <ChatInterface />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <QuickActions />
            <ActivityFeed />
            <SystemStatus />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
