"use client";

import { useState } from "react";
import {
  Factory,
  Building2,
  Cog,
  Puzzle,
  MapPin,
  ChevronRight,
  UnfoldVertical,
  FoldVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErpTreeNode {
  id: string;
  label: string;
  kind: string;
  count?: number;
  description?: string;
  children?: ErpTreeNode[];
  onClick?: () => void;
}

export interface ErpAssetTreeProps {
  roots: ErpTreeNode[];
  className?: string;
}

const KIND_ICONS: Record<string, typeof Factory> = {
  plant: Factory,
  department: Building2,
  area: MapPin,
  equipment: Cog,
  component: Puzzle,
};

export function ErpAssetTree({ roots, className }: ErpAssetTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(roots.map((node) => node.id))
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const collectIds = (nodes: ErpTreeNode[]): string[] =>
    nodes.flatMap((node) => [
      ...(node.children ? [node.id] : []),
      ...(node.children ? collectIds(node.children) : []),
    ]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-200 bg-white",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <p className="text-sm font-semibold text-gray-800">Asset Hierarchy</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded(new Set(collectIds(roots)))}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            <UnfoldVertical className="h-3.5 w-3.5" />
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setExpanded(new Set())}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            <FoldVertical className="h-3.5 w-3.5" />
            Collapse all
          </button>
        </div>
      </div>
      <div className="max-h-[calc(100vh-280px)] overflow-auto p-2">
        {roots.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-gray-400">
            No assets found
          </p>
        ) : (
          roots.map((root) => (
            <TreeRow
              key={root.id}
              node={root}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: ErpTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = !!node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const Icon = KIND_ICONS[node.kind] ?? Cog;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5",
          node.onClick ? "cursor-pointer hover:bg-blue-50" : "cursor-default"
        )}
        style={{ paddingLeft: depth * 18 + 8 }}
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          node.onClick?.();
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100",
            !hasChildren && "invisible"
          )}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <ChevronRight
            className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")}
          />
        </button>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            node.kind === "plant" && "text-blue-600",
            node.kind === "department" && "text-purple-600",
            node.kind === "area" && "text-orange-600",
            node.kind === "equipment" && "text-gray-600",
            node.kind === "component" && "text-teal-600"
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm text-gray-800" title={node.label}>
          {node.label}
        </span>
        {node.description && (
          <span className="hidden truncate text-xs text-gray-400 lg:inline">
            {node.description}
          </span>
        )}
        {typeof node.count === "number" && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-500">
            {node.count}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}