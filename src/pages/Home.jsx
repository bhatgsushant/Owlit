import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, MessageCircle, FolderOpen, Menu, ArrowRight, Star, Award, Sparkles, FileText, Brain, Shield, Zap, TrendingUp, Users, Clock, CheckCircle, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

// Animated Section Component with Scroll Trigger
const AnimatedSection = ({ children, className = "", delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Parallax Component
const ParallaxElement = ({ children, speed = 0.5 }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, speed * 300]);
  const springY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <motion.div ref={ref} style={{ y: springY }}>
      {children}
    </motion.div>
  );
};

// Stat Counter Animation
const AnimatedStat = ({ value, suffix = "", duration = 2000 }) => {
  const [count, setCount] = React.useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, value, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

export default function Home() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { user } = useAuth();
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const wasDark = root.classList.contains('dark');
    const previousTheme = root.getAttribute('data-theme');

    if (wasDark) {
      root.classList.remove('dark');
      body?.classList.remove('dark');
    }
    root.setAttribute('data-theme', 'light');

    return () => {
      if (wasDark) {
        root.classList.add('dark');
        body?.classList.add('dark');
      }
      if (previousTheme) {
        root.setAttribute('data-theme', previousTheme);
      } else {
        root.removeAttribute('data-theme');
      }
    };
  }, []);

  // Background color transition
  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.2, 0.5, 0.8, 1],
    [
      "rgb(240, 244, 248)",
      "rgb(255, 255, 255)",
      "rgb(249, 250, 251)",
      "rgb(243, 244, 246)",
      "rgb(240, 244, 248)"
    ]
  );

  const springBg = useSpring(backgroundColor, { stiffness: 100, damping: 30 });

  return (
    <motion.div 
      ref={containerRef}
      style={{ backgroundColor: springBg }}
      className="dark:bg-black text-[#0f172a] dark:text-white antialiased min-h-screen font-playfair"
    >
      {/* Floating Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-black/70 border-b border-gray-200/50 dark:border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={createPageUrl("Home")} className="flex items-center gap-3">
           <motion.div
  whileHover={{ scale: 1.1, rotate: 5 }}
  className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg"
>
 <motion.div
  whileHover={{ scale: 1.1, rotate: 5 }}
  className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg"
>
  <svg viewBox="0 0 128 128" width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <path fill="white" d="
    M28 34 64 16 100 34 100 92
    C100 108 84 116 64 116
    C44 116 28 108 28 92
    Z"/>
  <circle cx="48" cy="60" r="9" fill="black"/>
  <circle cx="80" cy="60" r="9" fill="black"/>
  <polygon points="64,72 56,86 72,86" fill="black"/>
</svg>

</motion.div>
</motion.div>
            <span className="text-xl font-bold text-black">
  Owlit
</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {user && (
              <Link to={createPageUrl("Insights")}>
                <Button variant="ghost" className="text-sm">Insights</Button>
              </Link>
            )}
            <Link to={createPageUrl("ScanReceipt")}>
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl transition-all duration-300 text-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section with Parallax */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-20">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <ParallaxElement speed={0.3}>
            <div className="absolute top-20 left-10 w-72 h-72 bg-green-200/30 dark:bg-green-500/10 rounded-full blur-3xl" />
          </ParallaxElement>
          <ParallaxElement speed={0.5}>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-3xl" />
          </ParallaxElement>
          <ParallaxElement speed={0.4}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-200/20 dark:bg-purple-500/5 rounded-full blur-3xl" />
          </ParallaxElement>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
              className="inline-flex items-center bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-green-100 dark:border-green-800/50"
            >
              <div className="flex -space-x-2 mr-3">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80" className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 object-cover shadow-sm" alt="User" />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80" className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 object-cover shadow-sm" alt="User" />
                <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80" className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 object-cover shadow-sm" alt="User" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Join <span className="font-bold text-green-600 dark:text-green-400">10k+</span> users
              </span>
            </motion.div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight"
          >
            Your Intelligent
            <br />
            <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Spending Analyst
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
            className="text-lg max-w-2xl mx-auto text-gray-600 dark:text-gray-400 leading-relaxed mb-10"
          >
           Turn Receipts into Insights. Smart insights, spending patterns, and full expense history — instantly.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to={createPageUrl("ScanReceipt")}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 text-base rounded-full shadow-[0_4px_20px_0_rgba(16,185,129,0.4)] hover:shadow-[0_8px_30px_0_rgba(16,185,129,0.5)] transition-all duration-300">
                  <Camera className="w-5 h-5 mr-2" />
                  Start Scanning
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </Link>
            {user && (
              <Link to={createPageUrl("Insights")}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="px-11 py-4 text-base rounded-[25px] border-2 border-gray-200 hover:border-green-500 transition-all duration-300">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    AI Insights
                  </Button>
                </motion.div>
              </Link>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-12 flex items-center justify-center gap-8 flex-wrap"
          >
            <div className="flex items-center gap-2">
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Secure & Private</span>
            </div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <ParallaxElement speed={0.6}>
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-40 right-20 hidden lg:block"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl rotate-12 shadow-2xl opacity-70" />
          </motion.div>
        </ParallaxElement>

        <ParallaxElement speed={0.4}>
          <motion.div
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-40 left-20 hidden lg:block"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl -rotate-12 shadow-2xl opacity-70" />
          </motion.div>
        </ParallaxElement>
      </section>

      {/* Stats Section with Scroll Animation */}
      <AnimatedSection className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 10000, suffix: "+", label: "Receipts Scanned", icon: FileText },
              { value: 5000, suffix: "+", label: "Active Users", icon: Users },
              { value: 99, suffix: "%", label: "Accuracy Rate", icon: CheckCircle },
              { value: 24, suffix: "/7", label: "AI Support", icon: Clock }
            ].map((stat, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <div className="text-center p-6 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300">
                  <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-lg">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    <AnimatedStat value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Features Section with Stagger Animation */}
      <section className="py-32 px-6 relative overflow-hidden">
        <ParallaxElement speed={0.2}>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-green-200/30 to-emerald-200/30 dark:from-green-500/10 dark:to-emerald-500/10 rounded-full blur-3xl" />
        </ParallaxElement>

        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to make your life easier and more organized
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Camera,
                title: "AI Scanning",
                description: "Instant document digitization with advanced AI recognition",
                gradient: "from-blue-500 to-cyan-500",
                link: "ScanReceipt"
              },
              {
                icon: MessageCircle,
                title: "AI Assistant",
                description: "Ask anything about your receipts and get instant answers",
                gradient: "from-purple-500 to-pink-500",
                link: null  // <— disable
              },
              {
                icon: FolderOpen,
                title: "Smart Storage",
                description: "Organized document library with powerful search",
                gradient: "from-orange-500 to-red-500",
                link: "Documents"
              },
              {
                icon: BarChart2,
                title: "Analytics",
                description: "Track spending patterns and gain financial insights",
                gradient: "from-green-500 to-emerald-500",
                link: "Insights"
              },
              {
                icon: TrendingUp,
                title: "Investment Tracking",
                description: "See what your spending could have earned if invested",
                gradient: "from-indigo-500 to-purple-500",
                link: null  // <— disable
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "Bank-level encryption keeps your data safe",
                gradient: "from-teal-500 to-green-500",
                link: null  // <— disable
              }
            ].map((feature, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <Link to={createPageUrl(feature.link)}>
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="h-full p-8 rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                  >
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300`}
                    >
                      <feature.icon className="w-7 h-7 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                    <motion.div
                      initial={{ x: 0 }}
                      whileHover={{ x: 5 }}
                      className="mt-4 inline-flex items-center text-sm font-semibold text-green-600 dark:text-green-400"
                    >
                      Learn more <ArrowRight className="w-4 h-4 ml-1" />
                    </motion.div>
                  </motion.div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* AI Chat Preview Section - Sticky/Pinned */}
      <section className="py-32 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI That Understands You
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                  Our intelligent assistant learns from your documents and spending patterns to provide personalized insights and answers.
                </p>
                <ul className="space-y-4">
                  {[
                    "Instant answers about your receipts",
                    "Smart spending recommendations",
                    "Document search and retrieval",
                    "Financial insights and trends"
                  ].map((item, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </motion.li>
                  ))}
                </ul>
                <Link to={createPageUrl("QnA")} className="mt-8 inline-block">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-6 text-base rounded-2xl shadow-[0_4px_20px_0_rgba(168,85,247,0.4)]">
                      Try AI Assistant
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </Link>
              </div>

              <ParallaxElement speed={0.3}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-xl p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">AI Assistant</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Always ready to help</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        viewport={{ once: true }}
                        className="flex justify-end"
                      >
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-2xl rounded-tr-md max-w-[80%] shadow-lg">
                          <p className="text-sm">How much did I spend on groceries this month?</p>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        viewport={{ once: true }}
                        className="flex justify-start"
                      >
                        <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-tl-md max-w-[85%] shadow-lg border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-900 dark:text-gray-200 leading-relaxed">
                                Based on your receipts, you spent <span className="font-bold text-purple-600 dark:text-purple-400">£342.50</span> on groceries this month. Most went to fruits (£85) and vegetables (£72).
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </ParallaxElement>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section with Background Transition */}
      <section className="py-32 px-6 relative overflow-hidden">
        <ParallaxElement speed={0.4}>
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-blue-500/20 dark:from-green-500/10 dark:via-emerald-500/10 dark:to-blue-500/10" />
        </ParallaxElement>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <AnimatedSection>
            <motion.div
              whileInView={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-flex p-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl mb-8"
            >
              <Sparkles className="w-12 h-12 text-white" />
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
              Join thousands of users who are already organizing their life with Owlit. 
              Start your journey to better financial management today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl("ScanReceipt")}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-16 py-7 text-lg rounded-[25px] shadow-[0_8px_30px_0_rgba(16,185,129,0.4)] hover:shadow-[0_12px_40px_0_rgba(16,185,129,0.5)]">
                    Start Free Today
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </Link>
            </div>

            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              No credit card required • Free forever • Cancel anytime
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="py-12 px-6 border-t border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-600"
      >
        <p className="text-sm">© 2025 Owlit. Your receipts and expenses, intelligently organized.</p>
      </motion.footer>
    </motion.div>
  );
}
