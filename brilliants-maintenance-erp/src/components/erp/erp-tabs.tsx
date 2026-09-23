"use client";

import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";

export interface ERPTabItem {
  key: string;
  label: string;
  icon?: ElementType;
}

export interface ERPTabsProps {
  tabs: ERPTabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function ERPTabs({ tabs, active, onChange, className }: ERPTabsProps) {
  return <Tabs tabs={tabs} active={active} onChange={onChange} className={className} />;
}