import type { FieldError } from "react-hook-form";

interface FormErrorProps {
  message?: string;
  error?: FieldError;
  className?: string;
}

export function FormError({ message, error, className }: FormErrorProps) {
  const text = error?.message ?? message;
  if (!text) return null;
  return (
    <p className={className ? `text-sm text-red-600 ${className}` : "text-sm text-red-600"}>
      {text}
    </p>
  );
}