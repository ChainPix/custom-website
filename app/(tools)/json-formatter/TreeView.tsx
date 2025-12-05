"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { TreeNode, formatValue, getJSONPath } from "@/lib/json-utils";

interface TreeViewProps {
  nodes: TreeNode[];
  onNodeClick?: (path: string[], value: unknown) => void;
}

export function TreeView({ nodes, onNodeClick }: TreeViewProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node, index) => (
        <TreeNodeComponent
          key={`${node.path.join('.')}-${index}`}
          node={node}
          onNodeClick={onNodeClick}
        />
      ))}
    </div>
  );
}

interface TreeNodeComponentProps {
  node: TreeNode;
  level?: number;
  onNodeClick?: (path: string[], value: unknown) => void;
}

function TreeNodeComponent({ node, level = 0, onNodeClick }: TreeNodeComponentProps) {
  const [collapsed, setCollapsed] = useState(node.collapsed ?? true);
  const hasChildren = node.children && node.children.length > 0;
  const isComplex = node.type === 'object' || node.type === 'array';

  const handleClick = () => {
    if (hasChildren) {
      setCollapsed(!collapsed);
    }
    if (onNodeClick) {
      onNodeClick(node.path, node.value);
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
        className="group flex w-full items-start gap-1 rounded px-2 py-1 text-left text-sm transition hover:bg-white/5"
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
          {node.children?.map((child, index) => (
            <TreeNodeComponent
              key={`${child.path.join('.')}-${index}`}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
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
