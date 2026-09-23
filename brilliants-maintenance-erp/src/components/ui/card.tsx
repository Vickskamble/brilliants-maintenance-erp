import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("border-b border-gray-200 px-6 py-4", className)}>
      {children}
    </div>
  );
}

function CardTitle({ children, className }: CardProps) {
  return (
    <h3
      className={cn("text-lg font-semibold text-gray-900", className)}
    >
      {children}
    </h3>
  );
}

function CardDescription({ children, className }: CardProps) {
  return (
    <p className={cn("mt-1 text-sm text-gray-500", className)}>
      {children}
    </p>
  );
}

function CardContent({ children, className }: CardProps) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}

function CardFooter({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "border-t border-gray-200 px-6 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
