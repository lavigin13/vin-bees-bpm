import React, { useMemo, useState, useEffect } from 'react';
import { X, Network, ChevronDown, ChevronRight, Search } from 'lucide-react';
import './CraftingModal.css';
import './OrgChartModal.css';

const OrgTreeNode = ({ node, depth = 0, visibleNodeIds, forceExpand }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    // Filter visibility
    const isVisible = !visibleNodeIds || visibleNodeIds.has(node.id);
    
    // Auto-expand when searching
    useEffect(() => {
        if (forceExpand) {
            setIsExpanded(true);
        }
    }, [forceExpand]);

    if (!isVisible) return null;

    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="org-node-wrapper">
            <div className={`org-card depth-${depth} ${hasChildren ? 'has-children' : ''}`}>
                <div className="org-avatar">{node.avatar}</div>
                <div className="org-info">
                    <div className="org-name">{node.name}</div>
                    <div className="org-role">{node.role}</div>
                </div>
                {hasChildren && (
                    <button 
                        className="toggle-btn"
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                )}
            </div>
            
            {hasChildren && isExpanded && (
                <div className="org-children">
                    {node.children.map(child => (
                        <OrgTreeNode 
                            key={child.id} 
                            node={child} 
                            depth={depth + 1} 
                            visibleNodeIds={visibleNodeIds}
                            forceExpand={forceExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const OrgChartModal = ({ isOpen, onClose, colleagues = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Build Tree from Flat List (Memoized to avoid rebuilding on every render)
    const tree = useMemo(() => {
        const nodes = JSON.parse(JSON.stringify(colleagues)); // Deep clone
        const map = {};
        const roots = [];

        nodes.forEach(node => {
            node.children = [];
            map[node.id] = node;
        });

        nodes.forEach(node => {
            if (node.managerId && map[node.managerId]) {
                map[node.managerId].children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }, [colleagues]);

    // Calculate Visible Nodes based on Search
    const visibleNodeIds = useMemo(() => {
        if (!searchQuery.trim()) return null; // null means show all

        const ids = new Set();
        const lowerQuery = searchQuery.toLowerCase();
        const nodeMap = {};
        colleagues.forEach(c => nodeMap[c.id] = c);

        // Helper to mark node and all ancestors as visible
        const markVisible = (id) => {
            let currentId = id;
            while (currentId) {
                if (ids.has(currentId)) break; // Optimization: already processed path
                ids.add(currentId);
                const node = nodeMap[currentId];
                currentId = node ? node.managerId : null;
            }
        };

        colleagues.forEach(node => {
            if (node.name.toLowerCase().includes(lowerQuery) || 
                node.role.toLowerCase().includes(lowerQuery)) {
                markVisible(node.id);
            }
        });

        return ids;
    }, [searchQuery, colleagues]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1400 }}>
            <div className="modal-content org-content">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <Network size={20} /> Organization Structure
                </h2>

                <div className="org-search-container">
                    <Search size={16} className="org-search-icon" />
                    <input 
                        type="text" 
                        className="org-search-input"
                        placeholder="Search colleague or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="org-chart-container">
                    {tree.map(root => (
                        <OrgTreeNode 
                            key={root.id} 
                            node={root} 
                            visibleNodeIds={visibleNodeIds}
                            forceExpand={!!searchQuery}
                        />
                    ))}
                    {visibleNodeIds && visibleNodeIds.size === 0 && (
                        <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>
                            No colleagues found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrgChartModal;
