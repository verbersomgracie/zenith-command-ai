import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  CheckSquare, 
  Wallet, 
  Target, 
  BarChart3, 
  Settings,
  Zap,
  Shield
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "chat", icon: MessageSquare, label: "JARVIS" },
  { id: "tasks", icon: CheckSquare, label: "Tasks" },
  { id: "finance", icon: Wallet, label: "Finance" },
  { id: "habits", icon: Target, label: "Habits" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed left-0 top-0 h-screen w-20 lg:w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50"
    >
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-sidebar-border">
        <motion.div 
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/50 pulse-glow">
              <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
            </div>
            <div className="absolute -inset-1 bg-primary/20 rounded-xl blur-md -z-10" />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-display text-lg font-bold text-primary glow-text">
              JARVIS
            </h1>
            <p className="text-xs text-muted-foreground">AI Assistant</p>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-2 lg:px-4">
        <ul className="space-y-2">
          {navItems.map((item, index) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 group relative ${
                  activeTab === item.id
                    ? "bg-primary/20 text-primary border-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-primary" : ""}`} />
                <span className="hidden lg:block font-medium text-sm">
                  {item.label}
                </span>
                {activeTab === item.id && (
                  <div className="absolute right-2 hidden lg:block">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
              </button>
            </motion.li>
          ))}
        </ul>
      </nav>

      {/* Admin Button - Only visible for admins */}
      {isAdmin && (
        <div className="px-2 lg:px-4 pb-4">
          <motion.button
            onClick={() => navigate("/admin")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all duration-300"
          >
            <Shield className="w-5 h-5" />
            <span className="hidden lg:block font-medium text-sm">
              Admin
            </span>
          </motion.button>
        </div>
      )}

      {/* Status indicator */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping" />
          </div>
          <span className="hidden lg:block text-xs text-muted-foreground">
            System Online
          </span>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
