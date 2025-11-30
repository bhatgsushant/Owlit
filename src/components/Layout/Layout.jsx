import React, { useState, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import ModernNavbar from "@/components/ui/ModernNavbar"; // Import the new navbar

export default function Layout({ children, currentPageName }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const isLandingPage = currentPageName === 'Home';

  useLayoutEffect(() => {
    if (isLandingPage) {
      document.documentElement.classList.remove('dark');
      document.body?.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      applyTheme(false);
      return;
    }

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
  }, [isLandingPage]);

  const applyTheme = (dark) => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle('dark', dark);
    if (body) {
      body.classList.toggle('dark', dark);
    }
    root.style.colorScheme = dark ? 'dark' : 'light';
    
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
      <ModernNavbar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <main className="pt-20"> {/* Add padding to top to account for fixed navbar */}
        {children}
      </main>
    </>
  );
}
