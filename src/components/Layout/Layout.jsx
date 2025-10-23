// src/components/layout/Layout.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Receipt, Camera, LayoutDashboard, Scan, BarChart2, Moon, Sun, Settings, TrendingUp, FolderOpen, MessageCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const navigationItems = [
   {
    title: "Dashboard", 
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Scan Receipt",
    url: createPageUrl("ScanReceipt"),
    icon: Scan,
  },
   {
    title: "Documents",
    url: createPageUrl("Documents"),
    icon: FolderOpen,
  },
  {
    title: "Insights",
    url: createPageUrl("Insights"),
    icon: BarChart2,
  },
  {
    title: "Investment",
    url: createPageUrl("Investment"),
    icon: TrendingUp,
  },
  {
    title: "AI Assistant",
    url: createPageUrl("QnA"),
    icon: MessageCircle,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const isLandingPage = currentPageName === 'Home';

  useEffect(() => {
    // Add Inter font (modern, clean font)
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // Check if user has a saved theme preference
    const savedTheme = localStorage.getItem('receiptwise-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(shouldUseDark);
    applyTheme(shouldUseDark);
  }, []);

  const applyTheme = (dark) => {
    const root = document.documentElement;
    
    if (dark) {
      // Dark theme colors
      root.style.setProperty('--background-primary', '#0D0D0D');
      root.style.setProperty('--background-secondary', '#1A1A1A');
      root.style.setProperty('--background-tertiary', '#2A2A2A');
      root.style.setProperty('--background-elevated', 'rgba(42, 42, 42, 0.8)');
      root.style.setProperty('--background-glass', 'rgba(26, 26, 26, 0.7)');
      root.style.setProperty('--background-overlay', 'rgba(13, 13, 13, 0.9)');
      
      root.style.setProperty('--text-primary', '#FFFFFF');
      root.style.setProperty('--text-secondary', '#A1A1AA');
      root.style.setProperty('--text-tertiary', '#71717A');
      root.style.setProperty('--text-muted', '#52525B');
      
      root.style.setProperty('--border-primary', '#3F3F46');
      root.style.setProperty('--border-secondary', '#27272A');
      root.style.setProperty('--border-glass', 'rgba(255, 255, 255, 0.1)');
      
      root.style.setProperty('--accent-primary', '#10B981');
      root.style.setProperty('--accent-primary-hover', '#059669');
      root.style.setProperty('--accent-gradient-start', '#10B981');
      root.style.setProperty('--accent-gradient-end', '#059669');
      root.style.setProperty('--accent-glow', 'rgba(16, 185, 129, 0.2)');
      
      root.style.setProperty('--shadow-small', '0 2px 8px rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--shadow-medium', '0 8px 32px rgba(0, 0, 0, 0.4)');
      root.style.setProperty('--shadow-large', '0 16px 64px rgba(0, 0, 0, 0.5)');
      root.style.setProperty('--shadow-glow', '0 0 32px rgba(16, 185, 129, 0.15)');
      
      root.style.setProperty('--blur-glass', 'blur(20px)');
      root.style.setProperty('--blur-overlay', 'blur(10px)');
      
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      // Light theme colors
      root.style.setProperty('--background-primary', '#FFFFFF');
      root.style.setProperty('--background-secondary', '#F8FAFC');
      root.style.setProperty('--background-tertiary', '#F1F5F9');
      root.style.setProperty('--background-elevated', 'rgba(255, 255, 255, 0.9)');
      root.style.setProperty('--background-glass', 'rgba(255, 255, 255, 0.8)');
      root.style.setProperty('--background-overlay', 'rgba(255, 255, 255, 0.95)');
      
      root.style.setProperty('--text-primary', '#333333');
      root.style.setProperty('--text-secondary', '#666666');
      root.style.setProperty('--text-tertiary', '#94A3B8');
      root.style.setProperty('--text-muted', '#CBD5E1');
      
      root.style.setProperty('--border-primary', '#E2E8F0');
      root.style.setProperty('--border-secondary', '#F1F5F9');
      root.style.setProperty('--border-glass', 'rgba(0, 0, 0, 0.1)');
      
      root.style.setProperty('--accent-primary', '#10B981');
      root.style.setProperty('--accent-primary-hover', '#059669');
      root.style.setProperty('--accent-gradient-start', '#10B981');
      root.style.setProperty('--accent-gradient-end', '#059669');
      root.style.setProperty('--accent-glow', 'rgba(16, 185, 129, 0.1)');
      
      root.style.setProperty('--shadow-small', '0 2px 8px rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--shadow-medium', '0 8px 32px rgba(0, 0, 0, 0.12)');
      root.style.setProperty('--shadow-large', '0 16px 64px rgba(0, 0, 0, 0.15)');
      root.style.setProperty('--shadow-glow', '0 0 32px rgba(16, 185, 129, 0.08)');
      
      root.style.setProperty('--blur-glass', 'blur(20px)');
      root.style.setProperty('--blur-overlay', 'blur(10px)');
      
      document.documentElement.setAttribute('data-theme', 'light');
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('receiptwise-theme', newTheme ? 'dark' : 'light');
  };
  
  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <>
      <style>{`
        * {
          transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease !important;
        }
        
        body {
          background: var(--background-primary);
          color: var(--text-primary);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        h1, h2, h3, h4, h5, h6, .heading-font {
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          line-height: 1.3;
        }
        
        h1 { font-size: 20px; }
        h2 { font-size: 18px; }
        h3 { font-size: 16px; }
        
        button, .button-text {
          font-size: 14px;
          font-weight: 500;
        }
        
        label, .label-text {
          font-size: 14px;
          color: var(--text-secondary);
        }
        
        .theme-background-primary { background: var(--background-primary); }
        .theme-background-secondary { background: var(--background-secondary); }
        .theme-background-tertiary { background: var(--background-tertiary); }
        .theme-background-glass { 
          background: var(--background-glass);
          backdrop-filter: var(--blur-glass);
        }
        .theme-background-elevated { 
          background: var(--background-elevated);
          backdrop-filter: var(--blur-glass);
        }
        .theme-background-overlay {
          background: var(--background-overlay);
          backdrop-filter: var(--blur-overlay);
        }
        
        .theme-text-primary { color: var(--text-primary); }
        .theme-text-secondary { color: var(--text-secondary); }
        .theme-text-tertiary { color: var(--text-tertiary); }
        .theme-text-muted { color: var(--text-muted); }
        
        .theme-border { border-color: var(--border-primary); }
        .theme-border-glass { border-color: var(--border-glass); }
        
        .theme-shadow-card { box-shadow: var(--shadow-medium); }
        .theme-shadow-elevated { box-shadow: var(--shadow-large); }
        .theme-shadow-large { box-shadow: var(--shadow-large); }
        .theme-shadow-glow { box-shadow: var(--shadow-glow); }
        
        .theme-accent-bg {
          background: linear-gradient(135deg, var(--accent-gradient-start), var(--accent-gradient-end));
          box-shadow: var(--shadow-glow);
          color: white;
          transition: all 0.3s ease;
        }
        .theme-accent-bg:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        }
        
        .page-title-gradient {
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .sidebar-item {
          color: var(--text-secondary);
          transition: all 0.2s ease;
          border-radius: 0.5rem;
          font-size: 14px;
        }
        .sidebar-item:hover {
          background: var(--background-tertiary);
          color: var(--text-primary);
        }
        .sidebar-item.active {
          background: var(--accent-glow);
          color: var(--accent-primary);
          font-weight: 600;
        }
        
        /* Mobile Optimizations */
        @media (max-width: 768px) {
          body { font-size: 13px; }
          h1 { font-size: 18px; }
          h2 { font-size: 16px; }
          h3 { font-size: 15px; }
          button, .button-text { font-size: 13px; }
          
          .sidebar-item {
            font-size: 13px;
            padding: 0.5rem;
          }
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Better touch targets on mobile */
        @media (max-width: 768px) {
          button, a, input, select {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
      
      <SidebarProvider>
        <div className="min-h-screen flex w-full theme-background-primary">
          <Sidebar className="theme-border theme-background-glass hidden md:flex">
            <SidebarHeader className="theme-border p-4">
              <Link to={createPageUrl("Home")} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden">
                  {/* Chameleon Logo */}
                  <div className="w-6 h-6 relative">
                    <div className="absolute top-0 left-1 w-2 h-2 bg-white rounded-full"></div>
                    <div className="absolute top-0.5 left-1.5 w-1 h-1 bg-gray-800 rounded-full"></div>
                    <div className="absolute top-1 left-0 w-5 h-3 border-2 border-white rounded-full border-b-0"></div>
                    <div className="absolute top-2 right-1 w-2 h-2 border-2 border-white rounded-full border-l-0 border-t-0"></div>
                  </div>
                </div>
                <div>
                  <h2 className="font-bold theme-text-primary text-sm">ReceiptWise</h2>
                  <p className="text-xs text-green-500">Smart Receipt Manager</p>
                </div>
              </Link>
            </SidebarHeader>
            
            <SidebarContent className="p-3">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {navigationItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`sidebar-item transition-all duration-200 ${
                            location.pathname === item.url || (item.title === "Scan Receipt" && (location.pathname === createPageUrl("ScanReceipt")))
                              ? 'active' 
                              : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-3 theme-border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2 sidebar-item text-sm">
                    <Settings className="w-4 h-4" />
                    <span className="font-medium">Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 theme-background-glass theme-border-glass">
                  <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-2 theme-text-primary">
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span className="text-sm">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="theme-border" />
                  <DropdownMenuItem className="theme-text-tertiary">
                    <span className="text-xs">Version 1.0.0</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col overflow-hidden w-full">
            <header className="theme-background-glass theme-border px-4 py-3 md:hidden sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="sidebar-item p-2 rounded-lg transition-colors duration-200" />
                  <Link to={createPageUrl("Home")} className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-md flex items-center justify-center relative overflow-hidden">
                      <div className="w-4 h-4 relative">
                        <div className="absolute top-0 left-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                        <div className="absolute top-0.5 left-1 w-0.5 h-0.5 bg-gray-800 rounded-full"></div>
                        <div className="absolute top-1 left-0 w-3 h-2 border border-white rounded-full border-b-0"></div>
                        <div className="absolute top-1.5 right-0.5 w-1 h-1 border border-white rounded-full border-l-0 border-t-0"></div>
                      </div>
                    </div>
                    <h1 className="text-sm font-bold theme-text-primary">ReceiptWise</h1>
                  </Link>
                </div>
                
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="sidebar-item">
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-auto theme-background-primary">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </>
  );
}
