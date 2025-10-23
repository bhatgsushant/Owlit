// src/components/ui/dropdown-menu.jsx
export function DropdownMenu({ children }) {
  return <div className="dropdown-menu">{children}</div>;
}

export function DropdownMenuTrigger({ children }) {
  return <button>{children}</button>;
}

export function DropdownMenuContent({ children }) {
  return <div className="dropdown-content">{children}</div>;
}

export function DropdownMenuItem({ children, ...props }) {
  return <div {...props}>{children}</div>;
}

export function DropdownMenuSeparator() {
  return <hr className="border-t border-gray-200 my-1" />;
}
