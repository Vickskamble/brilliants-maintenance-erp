"use client";

import * as React from "react";
import { createContext, useContext, useId, useMemo, cloneElement, isValidElement } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function Slot({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
  if (isValidElement(children)) {
    return cloneElement(
      children as React.ReactElement,
      props as Record<string, unknown>
    );
  }
  return null;
}

type FormFieldContextValue = { name: string };
type FormItemContextValue = { id: string };

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);
const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue);

function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }
  const { id } = itemContext;
  return {
    id,
    name: fieldContext.name,
    formItemId: id + "-form-item",
    formDescriptionId: id + "-form-item-description",
    formMessageId: id + "-form-item-message",
    ...fieldState,
  };
}

function Form({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function FormFieldContextProvider({ name, children }: FormFieldContextValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({ name }), [name]);
  return <FormFieldContext.Provider value={value}>{children}</FormFieldContext.Provider>;
}

function FormField({ name, render }: { name: string; render: (field: { field: unknown }) => React.ReactNode }) {
  return (
    <FormFieldContextProvider name={name}>
      <Controller
        name={name}
        render={({ field }) => <>{render({ field })}</>}
      />
    </FormFieldContextProvider>
  );
}

function FormItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const id = useId();
  const value = useMemo(() => ({ id }), [id]);
  return (
    <FormItemContext.Provider value={value}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </FormItemContext.Provider>
  );
}

function FormLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      htmlFor={formItemId}
      className={cn(error && "text-red-600", className)}
    >
      {children}
    </Label>
  );
}

function FormControl({ children }: { children: React.ReactNode }) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return <Slot id={formItemId} aria-describedby={error ? formMessageId : formDescriptionId} aria-invalid={!!error}>{children}</Slot>;
}

function FormDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  const { formDescriptionId } = useFormField();
  return <p id={formDescriptionId} className={cn("text-xs text-gray-500", className)}>{children}</p>;
}

function FormMessage({ children, className }: { children: React.ReactNode; className?: string }) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message) : children;
  if (!body) return null;
  return <p id={formMessageId} className={cn("text-xs text-red-600", className)}>{body}</p>;
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
};
