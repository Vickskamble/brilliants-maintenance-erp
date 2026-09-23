"use client";

import * as React from "react";
import { Check, ChevronRight, Circle } from "lucide-react";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({
  open: false,
  setOpen: () => {},
});

function DropdownMenu({
  children,
}: React.PropsWithChildren) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({
  children,
  asChild,
}: React.PropsWithChildren<{ asChild?: boolean }>) {
  const { setOpen } = React.useContext(DropdownMenuContext);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => setOpen(true),
    });
  }
  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

function useClose() {
  const { setOpen } = React.useContext(DropdownMenuContext);
  return () => setOpen(false);
}

function DropdownMenuContent({
  children,
  className,
  align = "end",
}: React.PropsWithChildren<{ className?: string; align?: "start" | "end" }>) {
  const { open } = React.useContext(DropdownMenuContext);
  if (!open) return null;
  return (
    <div
      className={
        "z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-md " +
        (align === "end" ? "right-0" : "left-0") +
        " " +
        (className ?? "")
      }
      onClick={useClose()}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({
  children,
  onSelect,
  className,
}: React.PropsWithChildren<{ onSelect?: () => void; className?: string }>) {
  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.();
      }}
      className={
        "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 " +
        (className ?? "")
      }
    >
      {children}
    </button>
  );
}

function DropdownMenuCheckboxItem({
  children,
  checked,
  onCheckedChange,
}: React.PropsWithChildren<{
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}>) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange?.(!checked)}
      className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
    >
      {checked ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
      {children}
    </button>
  );
}

function DropdownMenuRadioItem({
  children,
  value,
  onSelect,
}: React.PropsWithChildren<{ value: string; onSelect?: () => void }>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
    >
      <Circle className="h-3 w-3 text-gray-300" />
      {children}
      <span className="text-xs text-gray-500">{value}</span>
    </button>
  );
}

function DropdownMenuLabel({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={
        "px-2 py-1.5 text-sm font-semibold " + (className ?? "")
      }
    >
      {children}
    </div>
  );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={("-mx-1 my-1 h-px bg-gray-200 " + (className ?? ""))} />;
}

function DropdownMenuShortcut({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <span className={"ml-auto text-xs text-gray-400 " + (className ?? "")}>
      {children}
    </span>
  );
}

function DropdownMenuSub({ children }: React.PropsWithChildren) {
  return <>{children}</>;
}

function DropdownMenuSubTrigger({ children }: React.PropsWithChildren) {
  return (
    <span className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-100">
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </span>
  );
}

function DropdownMenuSubContent({ children }: React.PropsWithChildren) {
  return <>{children}</>;
}

function DropdownMenuGroup({ children }: React.PropsWithChildren) {
  return <>{children}</>;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
