import React, { createContext, useContext, useState } from "react";
import clsx from "clsx";

/* Sidebar context for mobile toggle */
const SideContext = createContext();

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  return <SideContext.Provider value={{ open, setOpen }}>{children}</SideContext.Provider>;
}

export function Sidebar({ children, className = "" }) {
  return (
    <aside className={clsx("w-64 min-h-screen", className)}>{children}</aside>
  );
}
export function SidebarHeader({ children, className = "" }) {
  return <div className={clsx("flex items-center gap-2", className)}>{children}</div>;
}
export function SidebarContent({ children, className = "" }) {
  return <div className={clsx("flex-1", className)}>{children}</div>;
}
export function SidebarGroup({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}
export function SidebarGroupContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}
export function SidebarMenu({ children, className = "" }) {
  return <nav className={clsx("flex flex-col", className)}>{children}</nav>;
}
export function SidebarMenuItem({ children, className = "" }) {
  return <div className={clsx("my-0.5", className)}>{children}</div>;
}
export function SidebarMenuButton({ children, asChild, className = "", ...props }) {
  if (asChild) {
    return React.cloneElement(children, { className: clsx(children.props.className, className), ...props });
  }
  return <button className={clsx(className)} {...props}>{children}</button>;
}
export function SidebarTrigger({ className = "" }) {
  const { open, setOpen } = useContext(SideContext);
  return (
    <button className={clsx("p-2 rounded-md", className)} onClick={() => setOpen(!open)}>
      {/* Hamburger */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
export function SidebarFooter({ children, className = "" }) {
  return <div className={clsx("mt-auto", className)}>{children}</div>;
}
