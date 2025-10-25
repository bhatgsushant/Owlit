import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Receipt, PoundSterling, Calendar, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Animated Counter Component
const AnimatedCounter = ({ value, prefix = "", suffix = "", duration = 1.5 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{prefix}{count}{suffix}</span>;
};

// Currency Counter Component
const AnimatedCurrencyCounter = ({ value, duration = 1.5 }) => {
  const [count, setCount] = useState(0);
  const [formatter, setFormatter] = useState(new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }));

  useEffect(() => {
    setFormatter(new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }));
  }, []);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(easeOutQuart * value);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{formatter.format(count)}</span>;
};

export default function StatsGrid({ 
  totalReceipts, 
  totalSpent, 
  thisMonthSpent, 
  thisMonthCount, 
  isLoading 
}) {
  const stats = [
    {
      title: "Total Receipts",
      value: totalReceipts,
      type: "number",
      icon: Receipt,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Total Spent",
      value: totalSpent,
      type: "currency",
      icon: PoundSterling,
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "This Month",
      value: thisMonthSpent,
      type: "currency",
      icon: Calendar,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: "Monthly Count",
      value: thisMonthCount,
      type: "number",
      icon: TrendingUp,
      gradient: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, index) => (
        <Card key={stat.title} className="p-4 md:p-6 theme-background-glass theme-border-glass theme-shadow-card hover:theme-shadow-elevated transition-all duration-200 hover:transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs md:text-sm font-medium theme-text-tertiary mb-1">
                {stat.title}
              </p>
              {isLoading ? (
                <Skeleton className="h-6 md:h-8 w-16 md:w-20" />
              ) : (
                <p className="text-xl md:text-2xl lg:text-3xl font-bold theme-text-primary">
                  {stat.type === "currency" ? (
                    <AnimatedCurrencyCounter value={stat.value} duration={1.5 + index * 0.2} />
                  ) : (
                    <AnimatedCounter value={stat.value} duration={1.5 + index * 0.2} />
                  )}
                </p>
              )}
            </div>
            <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.gradient} theme-shadow-glow`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
