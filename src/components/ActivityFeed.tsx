import { motion } from "framer-motion";
import { CheckCircle2, DollarSign, Target, AlertCircle } from "lucide-react";

const activities = [
  {
    id: 1,
    icon: CheckCircle2,
    title: "Task Completed",
    description: "Review quarterly report",
    time: "2 min ago",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
  {
    id: 2,
    icon: DollarSign,
    title: "Transaction Logged",
    description: "Subscription payment - $29.99",
    time: "15 min ago",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: 3,
    icon: Target,
    title: "Habit Streak",
    description: "7-day streak on Morning Meditation",
    time: "1 hour ago",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  {
    id: 4,
    icon: AlertCircle,
    title: "Reminder",
    description: "Team meeting in 30 minutes",
    time: "Just now",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
  },
];

const ActivityFeed = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-4"
    >
      <h3 className="font-display text-sm font-semibold text-primary mb-4 text-glow-sm">
        Recent Activity
      </h3>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer group"
          >
            <div className={`w-8 h-8 rounded-lg ${activity.bgColor} flex items-center justify-center flex-shrink-0`}>
              <activity.icon className={`w-4 h-4 ${activity.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {activity.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {activity.description}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {activity.time}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ActivityFeed;
