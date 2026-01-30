"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TreeNode, formatValue } from "@/lib/json-utils";

interface TreeViewProps {
  nodes: TreeNode[];
  searchTerm?: string;
  highlightPointer?: string;
  onNodeClick?: (node: TreeNode) => void;
}

export function TreeView({ nodes, searchTerm = "", highlightPointer = "", onNodeClick }: TreeViewProps) {
  const normalizedTerm = searchTerm.trim().toLowerCase();

  const searchState = useMemo(() => {
    if (!normalizedTerm) return { expandedIds: new Set<string>(), matchedIds: new Set<string>() };
    const expanded = new Set<string>();
    const matched = new Set<string>();

    const matchesNode = (node: TreeNode) => {
      const valueText = formatValue(node.value).toLowerCase();
      const pathText = node.path.join(".").toLowerCase();
      return (
        node.key.toLowerCase().includes(normalizedTerm) ||
        valueText.includes(normalizedTerm) ||
        pathText.includes(normalizedTerm)
      );
    };

    const walk = (node: TreeNode): boolean => {
      const selfMatch = matchesNode(node);
      let childMatch = false;
      if (node.children?.length) {
        for (const child of node.children) {
          if (walk(child)) childMatch = true;
        }
      }
      if (selfMatch) matched.add(node.id);
      if (selfMatch || childMatch) expanded.add(node.id);
      return selfMatch || childMatch;
    };

    nodes.forEach(walk);
    return { expandedIds: expanded, matchedIds: matched };
  }, [normalizedTerm, nodes]);

  const { expandedIds, matchedIds } = useMemo(() => {
    const expanded = new Set(searchState.expandedIds);
    const matched = new Set(searchState.matchedIds);
    if (highlightPointer) {
      const normalized = highlightPointer === "root" ? "" : highlightPointer;
      const segments = normalized.split("/").filter(Boolean);
      let current = "";
      expanded.add(current);
      for (const segment of segments) {
        current += `/${segment}`;
        expanded.add(current);
      }
      if (normalized) matched.add(normalized);
    }
    return { expandedIds: expanded, matchedIds: matched };
  }, [highlightPointer, searchState.expandedIds, searchState.matchedIds]);

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          onNodeClick={onNodeClick}
          expandedIds={expandedIds}
          matchedIds={matchedIds}
          searchActive={Boolean(normalizedTerm)}
          highlightPointer={highlightPointer}
        />
      ))}
    </div>
  );
}

interface TreeNodeComponentProps {
  node: TreeNode;
  level?: number;
  onNodeClick?: (node: TreeNode) => void;
  expandedIds: Set<string>;
  matchedIds: Set<string>;
  searchActive: boolean;
  highlightPointer: string;
}

function TreeNodeComponent({
  node,
  level = 0,
  onNodeClick,
  expandedIds,
  matchedIds,
  searchActive,
  highlightPointer,
}: TreeNodeComponentProps) {
  const [collapsed, setCollapsed] = useState(node.collapsed ?? true);
  const hasChildren = node.children && node.children.length > 0;
  const isComplex = node.type === 'object' || node.type === 'array';
  const isMatch = matchedIds.has(node.id);
  const isHighlight = highlightPointer && node.id === highlightPointer;

  useEffect(() => {
    if (!searchActive && !highlightPointer) return;
    if (expandedIds.has(node.id)) {
      setCollapsed(false);
    }
  }, [expandedIds, highlightPointer, node.id, searchActive]);

  const handleClick = () => {
    if (hasChildren) {
      setCollapsed(!collapsed);
    }
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  const getTypeColor = (type: TreeNode['type']) => {
    switch (type) {
      case 'string': return 'text-green-400';
      case 'number': return 'text-blue-400';
      case 'boolean': return 'text-purple-400';
      case 'null': return 'text-gray-500';
      case 'array': return 'text-yellow-400';
      case 'object': return 'text-cyan-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`group flex w-full items-start gap-1 rounded px-2 py-1 text-left text-sm transition hover:bg-white/5 ${
          isHighlight ? "bg-amber-500/20" : isMatch ? "bg-white/10" : ""
        }`}
        style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
      >
        {hasChildren ? (
          collapsed ? (
            <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
          ) : (
            <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
          )
        ) : (
          <span className="mt-0.5 h-4 w-4 flex-shrink-0" />
        )}

        <span className="font-medium text-slate-300">{node.key}</span>
        <span className="text-slate-600">:</span>

        <span className={getTypeColor(node.type)}>
          {isComplex ? (
            <>
              {node.type === 'array' ? '[' : '{'}
              {hasChildren && collapsed && (
                <span className="text-slate-600">
                  ...{node.children?.length} {node.children?.length === 1 ? 'item' : 'items'}
                </span>
              )}
              {hasChildren && collapsed && (node.type === 'array' ? ']' : '}')}
            </>
          ) : (
            formatValue(node.value)
          )}
        </span>
      </button>

      {hasChildren && !collapsed && (
        <div>
          {node.children?.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              expandedIds={expandedIds}
              matchedIds={matchedIds}
              searchActive={searchActive}
              highlightPointer={highlightPointer}
            />
          ))}
          {isComplex && (
            <div
              className="text-sm text-slate-600"
              style={{ paddingLeft: `${level * 1.25 + 2}rem` }}
            >
              {node.type === 'array' ? ']' : '}'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
