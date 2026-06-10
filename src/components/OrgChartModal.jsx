import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Network, Search, Users, X } from 'lucide-react';
import './CraftingModal.css';
import './OrgChartModal.css';

const SEARCH_LIMIT = 150;
const ROW_HEIGHT = 68;
const OVERSCAN = 6;
const MAX_LIST_HEIGHT = 420;

const sortByName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });

const VirtualizedList = ({ items, onNodeClick, childrenCountById, emptyText }) => {
    const [scrollTop, setScrollTop] = useState(0);
    const viewportRef = useRef(null);

    // Reset the virtual window when the list changes (state adjusted during
    // render per React docs; the DOM scroll position is synced in the effect).
    const [prevItems, setPrevItems] = useState(items);
    if (prevItems !== items) {
        setPrevItems(items);
        setScrollTop(0);
    }

    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTop = 0;
        }
    }, [items]);

    if (!items.length) {
        return <div className="org-empty">{emptyText}</div>;
    }

    const viewportHeight = Math.min(MAX_LIST_HEIGHT, Math.max(ROW_HEIGHT * 2, items.length * ROW_HEIGHT));
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    const offsetY = startIndex * ROW_HEIGHT;
    const visibleItems = items.slice(startIndex, endIndex);

    return (
        <div
            ref={viewportRef}
            className="org-list-viewport"
            style={{ height: viewportHeight }}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
            <div className="org-list-inner" style={{ height: items.length * ROW_HEIGHT }}>
                <div className="org-list-offset" style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((node) => {
                        const reportsCount = childrenCountById.get(node.id) || 0;
                        return (
                            <button
                                key={node.id}
                                className="org-card"
                                onClick={() => onNodeClick(node.id)}
                                type="button"
                            >
                                <span className="card-avatar">{node.avatar || '👤'}</span>
                                <span className="card-info">
                                    <span className="card-name">{node.name}</span>
                                    <span className="card-role">{node.role || 'Без посади'}</span>
                                </span>
                                {reportsCount > 0 && (
                                    <span className="card-reports-count">
                                        <Users size={12} />
                                        {reportsCount}
                                    </span>
                                )}
                                <ChevronRight size={16} className="card-arrow" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const OrgChartModal = ({ isOpen, onClose, colleagues = [] }) => {
    const [searchInput, setSearchInput] = useState('');
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const deferredQuery = useDeferredValue(searchInput.trim().toLowerCase());

    const graph = useMemo(() => {
        const nodesById = new Map();
        const childrenById = new Map();
        const rootNodes = [];

        for (const raw of colleagues) {
            const node = {
                ...raw,
                id: raw?.id,
                managerId: raw?.managerId ?? null,
                searchKey: `${raw?.name || ''} ${raw?.role || ''}`.toLowerCase()
            };
            nodesById.set(node.id, node);
            childrenById.set(node.id, []);
        }

        for (const node of nodesById.values()) {
            if (node.managerId && node.managerId !== node.id && nodesById.has(node.managerId)) {
                childrenById.get(node.managerId).push(node);
            } else {
                rootNodes.push(node);
            }
        }

        for (const list of childrenById.values()) {
            list.sort(sortByName);
        }
        rootNodes.sort(sortByName);

        return {
            nodesById,
            childrenById,
            rootNodes,
            allNodes: Array.from(nodesById.values())
        };
    }, [colleagues]);

    const defaultRoot = graph.rootNodes[0] || graph.allNodes[0] || null;

    // Reset navigation on close; while currentNodeId is null the view falls
    // back to defaultRoot, so the next open always starts from the top.
    const handleClose = () => {
        setSearchInput('');
        setCurrentNodeId(null);
        onClose();
    };

    const currentNode = graph.nodesById.get(currentNodeId) || defaultRoot;
    const directReports = currentNode ? graph.childrenById.get(currentNode.id) || [] : [];
    const currentManager = currentNode?.managerId ? graph.nodesById.get(currentNode.managerId) : null;

    const breadcrumb = useMemo(() => {
        if (!currentNode) return [];
        const chain = [];
        const visited = new Set();
        let node = currentNode;
        while (node && !visited.has(node.id)) {
            chain.unshift(node);
            visited.add(node.id);
            node = node.managerId ? graph.nodesById.get(node.managerId) : null;
        }
        return chain;
    }, [currentNode, graph.nodesById]);
    const currentTopRoot = breadcrumb[0] || defaultRoot;

    const searchState = useMemo(() => {
        if (!deferredQuery) {
            return { results: [], total: 0, isLimited: false };
        }

        let total = 0;
        const results = [];
        for (const node of graph.allNodes) {
            if (node.searchKey.includes(deferredQuery)) {
                total += 1;
                if (results.length < SEARCH_LIMIT) {
                    results.push(node);
                }
            }
        }
        return { results, total, isLimited: total > SEARCH_LIMIT };
    }, [deferredQuery, graph.allNodes]);

    const onNodeClick = (nodeId) => {
        if (!graph.nodesById.has(nodeId)) return;
        setCurrentNodeId(nodeId);
        setSearchInput('');
    };

    if (!isOpen || !currentNode) return null;

    const showingSearch = deferredQuery.length > 0;
    const childrenCountById = graph.childrenById;
    const topLeaders = graph.rootNodes;
    const hasMultipleTopLeaders = topLeaders.length > 1;

    return (
        <div className="modal-overlay" style={{ zIndex: 1400 }} onClick={handleClose}>
            <div className="modal-content org-content" onClick={(event) => event.stopPropagation()}>
                <div className="org-header">
                    <h2 className="modal-title">
                        <Network size={18} className="text-gold" />
                        <span>Структура організації</span>
                    </h2>
                    <button className="close-btn" onClick={handleClose} type="button">
                        <X size={24} />
                    </button>
                </div>

                <div className="org-search-container">
                    <Search size={16} className="org-search-icon" />
                    <input
                        type="text"
                        className="org-search-input"
                        placeholder="Пошук за ім'ям або посадою..."
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                    />
                </div>

                {!showingSearch && (
                    <>
                        {hasMultipleTopLeaders && (
                            <div className="org-top-leaders">
                                <div className="section-label">Керівництво</div>
                                <div className="org-top-leaders-list">
                                    {topLeaders.map((leader) => {
                                        const isActive = currentTopRoot?.id === leader.id;
                                        return (
                                            <button
                                                key={leader.id}
                                                className={`top-leader-chip ${isActive ? 'active' : ''}`}
                                                onClick={() => onNodeClick(leader.id)}
                                                type="button"
                                            >
                                                <span className="top-leader-avatar">{leader.avatar || '👤'}</span>
                                                <span className="top-leader-name">{leader.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="org-breadcrumbs">
                            {breadcrumb.map((node, index) => {
                                const isCurrent = index === breadcrumb.length - 1;
                                return (
                                    <button
                                        key={node.id}
                                        className={`breadcrumb-item ${isCurrent ? 'breadcrumb-current' : ''}`}
                                        onClick={() => !isCurrent && onNodeClick(node.id)}
                                        type="button"
                                    >
                                        {node.name}
                                        {!isCurrent && <span className="breadcrumb-separator">/</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="org-current-node-hero">
                            <div className="hero-avatar">{currentNode.avatar || '👤'}</div>
                            <div className="hero-info">
                                <h3>{currentNode.name}</h3>
                                <div className="hero-role">{currentNode.role || 'Без посади'}</div>
                                <div className="hero-stats">
                                    <Users size={14} />
                                    <span>{directReports.length} у прямому підпорядкуванні</span>
                                </div>
                            </div>
                        </div>

                        <div className="org-toolbar">
                            <button
                                className="org-nav-btn"
                                type="button"
                                onClick={() => currentManager && onNodeClick(currentManager.id)}
                                disabled={!currentManager}
                            >
                                <ChevronLeft size={14} />
                                Керівник
                            </button>
                            <button
                                className="org-nav-btn"
                                type="button"
                                onClick={() => currentTopRoot && onNodeClick(currentTopRoot.id)}
                                disabled={!currentTopRoot || currentNode.id === currentTopRoot.id}
                            >
                                Вгору
                            </button>
                        </div>

                        <div className="section-label">Прямі підлеглі</div>
                        <VirtualizedList
                            items={directReports}
                            onNodeClick={onNodeClick}
                            childrenCountById={childrenCountById}
                            emptyText="Немає прямих підлеглих"
                        />
                    </>
                )}

                {showingSearch && (
                    <>
                        <div className="section-label">
                            {searchState.total} результатів
                            {searchState.isLimited ? ` (показано перші ${SEARCH_LIMIT})` : ''}
                        </div>
                        <VirtualizedList
                            items={searchState.results}
                            onNodeClick={onNodeClick}
                            childrenCountById={childrenCountById}
                            emptyText={`Нічого не знайдено за запитом "${searchInput.trim()}"`}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default OrgChartModal;
