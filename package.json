import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================================================
// HELPERS & CONSTANTS
// ============================================================================

const getContrastTextColor = (hexColor) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1A1A1A' : '#FFFFFF';
};

const THEME_TAGS = [
  { name: 'Tech Debt', color: '#C97D60' },
  { name: 'Research', color: '#2C3E50' },
  { name: 'Customer', color: '#27AE60' },
  { name: 'Infrastructure', color: '#F39C12' },
  { name: 'Design', color: '#8E44AD' },
  { name: 'Platform', color: '#5D6D7E' },
  { name: 'Marketing', color: '#E74C3C' },
  { name: 'Data', color: '#16A085' },
];

const ROCK_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

// ============================================================================
// LEFT-EDGE DONE ZONE — proper dnd-kit droppable
// ============================================================================

function DoneZoneStrip({ isActive }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'done-zone-strip' });
  const highlighted = isOver || isActive;
  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: '80px', zIndex: 1000,
        background: highlighted
          ? 'linear-gradient(to right, rgba(231,76,60,0.55), rgba(231,76,60,0.12))'
          : 'linear-gradient(to right, rgba(231,76,60,0.28), rgba(231,76,60,0.04))',
        borderRight: highlighted ? '4px solid #E74C3C' : '4px solid rgba(231,76,60,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        fontSize: '11px', fontWeight: '900', letterSpacing: '2px',
        color: highlighted ? '#E74C3C' : 'rgba(231,76,60,0.8)',
        textTransform: 'uppercase', userSelect: 'none',
      }}>
        {highlighted ? '✓ DROP TO DONE' : 'DROP → DONE'}
      </div>
    </div>
  );
}

// ============================================================================
// DROPPABLE COLUMN WRAPPER
// ============================================================================

function DroppableColumn({ id, children }) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} style={{ minHeight: '120px' }}>{children}</div>;
}

// ============================================================================
// SORTABLE ROCK WRAPPER
// ============================================================================

function SortableRock({ rock, columnId, allTags, isViewOnly, editingRockTitle, onEdit, onDelete, onUpdateSize, onStartEditTitle, onSaveTitle, onCancelEditTitle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rock.id,
    disabled: isViewOnly,
    data: { columnId, rock },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Rock
        rock={rock}
        columnId={columnId}
        allTags={allTags}
        isViewOnly={isViewOnly}
        editingRockTitle={editingRockTitle}
        isDragOverlay={false}
        dragHandleProps={{ ...attributes, ...listeners }}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdateSize={onUpdateSize}
        onStartEditTitle={onStartEditTitle}
        onSaveTitle={onSaveTitle}
        onCancelEditTitle={onCancelEditTitle}
      />
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [columns, setColumns] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      if (sharedData) {
        try {
          const decoded = JSON.parse(atob(sharedData));
          if (!decoded.columns.done) decoded.columns.done = { title: 'DONE', rocks: [] };
          return decoded.columns;
        } catch (e) { console.error('Failed to load shared data'); }
      }
      const saved = localStorage.getItem('bigRocksData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.done) parsed.done = { title: 'DONE', rocks: [] };
        return parsed;
      }
    }
    return {
      now: { title: 'NOW', rocks: [] },
      next: { title: 'NEXT', rocks: [] },
      later: { title: 'LATER', rocks: [] },
      done: { title: 'DONE', rocks: [] },
    };
  });

  const [productName, setProductName] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      if (sharedData) {
        try { const decoded = JSON.parse(atob(sharedData)); return decoded.productName || 'Roadmap'; } catch (e) {}
      }
      return localStorage.getItem('bigRocksProductName') || 'Roadmap';
    }
    return 'Roadmap';
  });

  const [customTags, setCustomTags] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      if (sharedData) {
        try { const decoded = JSON.parse(atob(sharedData)); return decoded.customTags || []; } catch (e) {}
      }
      const saved = localStorage.getItem('bigRocksCustomTags');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [isViewOnly] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      if (sharedData) {
        try { const decoded = JSON.parse(atob(sharedData)); return decoded.editable === false; } catch (e) {}
      }
    }
    return false;
  });

  const [editingRock, setEditingRock] = useState(null);
  const [editingProductName, setEditingProductName] = useState(false);
  const [editingColumnTitle, setEditingColumnTitle] = useState(null);
  const [editingRockTitle, setEditingRockTitle] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [doneContainerCelebrating, setDoneContainerCelebrating] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [activeDragRock, setActiveDragRock] = useState(null);
  const [overId, setOverId] = useState(null);

  const shareMenuRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (!isViewOnly) localStorage.setItem('bigRocksData', JSON.stringify(columns));
  }, [columns, isViewOnly]);

  useEffect(() => {
    if (!isViewOnly) localStorage.setItem('bigRocksProductName', productName);
  }, [productName, isViewOnly]);

  useEffect(() => {
    if (!isViewOnly) localStorage.setItem('bigRocksCustomTags', JSON.stringify(customTags));
  }, [customTags, isViewOnly]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showShareMenu && shareMenuRef.current && !shareMenuRef.current.contains(e.target)) setShowShareMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);

  const findColumnOfRock = (rockId) =>
    Object.keys(columns).find(colId => columns[colId].rocks.some(r => r.id === rockId));

  const completeRock = (rock, sourceColumnId) => {
    const updatedRock = {
      ...rock,
      completedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      justCompleted: true,
      size: ROCK_SIZES.SMALL,
    };
    delete updatedRock.newlyCreated;
    delete updatedRock.deleting;
    setColumns(prev => ({
      ...prev,
      [sourceColumnId]: { ...prev[sourceColumnId], rocks: prev[sourceColumnId].rocks.filter(r => r.id !== rock.id) },
      done: { ...prev.done, rocks: [...prev.done.rocks, updatedRock] },
    }));
    setShowDone(true);
    setDoneContainerCelebrating(true);
    setTimeout(() => setDoneContainerCelebrating(false), 600);
    setTimeout(() => {
      setColumns(prev => ({
        ...prev,
        done: { ...prev.done, rocks: prev.done.rocks.map(r => r.id === rock.id ? { ...r, justCompleted: false } : r) },
      }));
    }, 600);
  };

  const handleDragStart = ({ active }) => {
    const colId = findColumnOfRock(active.id);
    if (!colId) return;
    const rock = columns[colId].rocks.find(r => r.id === active.id);
    setActiveDragRock({ rock, columnId: colId });
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    setOverId(over.id);

    const activeColId = findColumnOfRock(active.id);
    const overColId = findColumnOfRock(over.id) || (columns[over.id] ? over.id : null);

    if (!activeColId || !overColId || activeColId === overColId) return;
    // Don't do live cross-column move into done-zone-strip
    if (over.id === 'done-zone-strip') return;

    setColumns(prev => {
      const activeRocks = [...prev[activeColId].rocks];
      const overRocks = [...prev[overColId].rocks];
      const activeIndex = activeRocks.findIndex(r => r.id === active.id);
      const overIndex = overRocks.findIndex(r => r.id === over.id);
      const [movedRock] = activeRocks.splice(activeIndex, 1);
      const insertAt = overIndex >= 0 ? overIndex : overRocks.length;
      overRocks.splice(insertAt, 0, movedRock);
      return {
        ...prev,
        [activeColId]: { ...prev[activeColId], rocks: activeRocks },
        [overColId]: { ...prev[overColId], rocks: overRocks },
      };
    });
  };

  const handleDragEnd = ({ active, over }) => {
    const draggedRockInfo = activeDragRock;
    setActiveDragRock(null);
    setOverId(null);
    if (!over) return;

    // Dropped on the left-edge done zone strip
    if (over.id === 'done-zone-strip') {
      const sourceColId = findColumnOfRock(active.id);
      if (sourceColId && sourceColId !== 'done') {
        const rock = columns[sourceColId].rocks.find(r => r.id === active.id);
        if (rock) completeRock(rock, sourceColId);
      }
      return;
    }

    const activeColId = findColumnOfRock(active.id);
    const overColId = findColumnOfRock(over.id) || (columns[over.id] ? over.id : null);
    if (!activeColId || !overColId) return;

    // Reorder within same column
    if (activeColId === overColId) {
      const rocks = columns[activeColId].rocks;
      const oldIndex = rocks.findIndex(r => r.id === active.id);
      const newIndex = rocks.findIndex(r => r.id === over.id);
      if (oldIndex !== newIndex) {
        setColumns(prev => ({
          ...prev,
          [activeColId]: { ...prev[activeColId], rocks: arrayMove(prev[activeColId].rocks, oldIndex, newIndex) },
        }));
      }
      return;
    }

    // Completing a rock dropped into done
    if (overColId === 'done' && activeColId !== 'done') {
      setColumns(prev => ({
        ...prev,
        done: {
          ...prev.done,
          rocks: prev.done.rocks.map(r =>
            r.id === active.id && !r.completedDate
              ? { ...r, completedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), justCompleted: true, size: ROCK_SIZES.SMALL }
              : r
          ),
        },
      }));
      setShowDone(true);
      setDoneContainerCelebrating(true);
      setTimeout(() => setDoneContainerCelebrating(false), 600);
      setTimeout(() => {
        setColumns(prev => ({
          ...prev,
          done: { ...prev.done, rocks: prev.done.rocks.map(r => r.id === active.id ? { ...r, justCompleted: false } : r) },
        }));
      }, 600);
      return;
    }

    // Restoring a rock from done back to a live column
    if (activeColId === 'done' && overColId !== 'done') {
      setColumns(prev => {
        const doneRocks = prev.done.rocks.filter(r => r.id !== active.id);
        const restoredRock = { ...prev.done.rocks.find(r => r.id === active.id) };
        delete restoredRock.completedDate;
        restoredRock.justUncompleted = true;
        restoredRock.size = restoredRock.size || ROCK_SIZES.MEDIUM;
        const targetRocks = [...prev[overColId].rocks];
        const overIndex = targetRocks.findIndex(r => r.id === over.id);
        const insertAt = overIndex >= 0 ? overIndex : targetRocks.length;
        targetRocks.splice(insertAt, 0, restoredRock);
        return {
          ...prev,
          done: { ...prev.done, rocks: doneRocks },
          [overColId]: { ...prev[overColId], rocks: targetRocks },
        };
      });
      setTimeout(() => {
        setColumns(prev => ({
          ...prev,
          [overColId]: { ...prev[overColId], rocks: prev[overColId].rocks.map(r => r.id === active.id ? { ...r, justUncompleted: false } : r) },
        }));
      }, 600);
      return;
    }
  };

  const addCustomTag = (tagName, color) => setCustomTags(prev => [...prev, { name: tagName, color }]);

  const deleteCustomTag = (tagName) => {
    setCustomTags(prev => prev.filter(t => t.name !== tagName));
    setColumns(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], rocks: next[k].rocks.map(r => ({ ...r, tags: r.tags ? r.tags.filter(t => t !== tagName) : [] })) };
      });
      return next;
    });
  };

  const generateShareLink = (editable) => {
    const encoded = btoa(JSON.stringify({ columns, productName, customTags, editable }));
    return `${window.location.origin}${window.location.pathname}?data=${encoded}`;
  };

  const copyShareLink = (editable) => {
    navigator.clipboard.writeText(generateShareLink(editable));
    alert(editable ? 'Editable link copied!' : 'View-only link copied!');
  };

  const addRock = (columnId) => {
    if (isViewOnly) return;
    const newRock = { id: `rock-${Date.now()}`, title: 'New Initiative', description: '', size: ROCK_SIZES.MEDIUM, tags: [], date: '', newlyCreated: true };
    setColumns(prev => ({ ...prev, [columnId]: { ...prev[columnId], rocks: [...prev[columnId].rocks, newRock] } }));
    setTimeout(() => {
      setColumns(prev => ({ ...prev, [columnId]: { ...prev[columnId], rocks: prev[columnId].rocks.map(r => r.id === newRock.id ? { ...r, newlyCreated: false } : r) } }));
    }, 600);
    setEditingRock({ ...newRock, columnId });
  };

  const updateRock = (columnId, rockId, updates) =>
    setColumns(prev => ({ ...prev, [columnId]: { ...prev[columnId], rocks: prev[columnId].rocks.map(r => r.id === rockId ? { ...r, ...updates } : r) } }));

  const updateColumnTitle = (columnId, newTitle) =>
    setColumns(prev => ({ ...prev, [columnId]: { ...prev[columnId], title: newTitle } }));

  const deleteRock = (columnId, rockId) => {
    setColumns(prev => ({ ...prev, [columnId]: { ...prev[columnId], rocks: prev[columnId].rocks.map(r => r.id === rockId ? { ...r, deleting: true } : r) } }));
    setTimeout(() => {
      setColumns(prev => ({ ...prev, [columnId]: { ...prev[columnId], rocks: prev[columnId].rocks.filter(r => r.id !== rockId) } }));
    }, 300);
  };

  const duplicateRock = (columnId, rockId) => {
    const src = columns[columnId].rocks.find(r => r.id === rockId);
    if (!src) return;
    const dup = { ...src, id: `rock-${Date.now()}`, newlyCreated: true };
    setColumns(prev => ({ ...prev, [columnId]: { ...prev[columnId], rocks: [...prev[columnId].rocks, dup] } }));
    setTimeout(() => {
      setColumns(prev => ({ ...prev, [columnId]: { ...prev[columnId], rocks: prev[columnId].rocks.map(r => r.id === dup.id ? { ...r, newlyCreated: false } : r) } }));
    }, 600);
  };

  const exportToPNG = async () => {
    try {
      const element = document.getElementById('export-container');
      const canvas = await html2canvas(element, { backgroundColor: '#F0F0F0', scale: 2, logging: false, useCORS: true, width: element.offsetWidth, height: element.offsetHeight, windowWidth: element.scrollWidth, windowHeight: element.scrollHeight });
      const cropped = document.createElement('canvas');
      const ctx = cropped.getContext('2d');
      cropped.width = canvas.width - 120;
      cropped.height = canvas.height;
      ctx.drawImage(canvas, 0, 0);
      const link = document.createElement('a');
      link.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-roadmap.png`;
      link.href = cropped.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const allTags = [...THEME_TAGS, ...customTags];
  const nonDoneEntries = Object.entries(columns).filter(([id]) => id !== 'done');
  const isDraggingFromLive = activeDragRock && activeDragRock.columnId !== 'done';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;700;900&family=Inter:wght@900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes rockAppear { 0% { opacity:0; transform:scale(0.9) translateY(10px) } 60% { transform:scale(1.02) } 100% { opacity:1; transform:scale(1) } }
        @keyframes rockDelete { from { opacity:1; transform:scale(1) } to { opacity:0; transform:scale(0.9) translateX(-20px) } }
        @keyframes rockComplete { 0% { transform:scale(1) } 30% { transform:scale(1.08) } 100% { transform:scale(1) } }
        @keyframes rockUncomplete { 0% { transform:scale(1); opacity:0.7 } 50% { transform:scale(0.95) } 100% { transform:scale(1); opacity:1 } }
        @keyframes doneContainerPulse { 0%,100% { border-color:#D0D0D0 } 50% { border-color:#27AE60 } }
        @keyframes descEnter { 0% { opacity: 0; transform: translateY(5px); } 100% { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CCC; border-radius: 3px; }
      `}</style>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>

        {/* Left-edge DONE zone — only shown when dragging a live rock */}
        {isDraggingFromLive && !isViewOnly && <DoneZoneStrip isActive={overId === 'done-zone-strip'} />}

        <div style={{ height: '100vh', width: '100vw', overflowY: 'auto', overflowX: 'hidden', margin: 0, padding: 0, backgroundColor: '#F0F0F0', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.3'/%3E%3C/svg%3E")`, fontFamily: '"Work Sans", sans-serif' }}>

          <div style={{ minHeight: '100%', padding: '24px 24px 80px', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

              {isViewOnly && (
                <div style={{ backgroundColor: '#F39C12', color: '#1A1A1A', padding: '12px 24px', marginBottom: '24px', fontSize: '14px', fontWeight: '700', textAlign: 'center' }}>
                  👁️ View-Only Mode - You're viewing a shared roadmap
                </div>
              )}

              {/* Header */}
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/big-rocks-image.png" alt="Boulder" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  <h1 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#1A1A1A', letterSpacing: '-1px', textTransform: 'uppercase', lineHeight: '0.9' }}>BIG<br/>ROCKS</h1>
                </div>
                {!isViewOnly && (
                  <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                    <button onClick={(e) => { e.stopPropagation(); setShowShareMenu(p => !p); }} style={{ padding: '12px 24px', backgroundColor: '#1A1A1A', color: '#FFFFFF', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: '"Work Sans", sans-serif' }} onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }} onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}>Share</button>
                    {showShareMenu && (
                      <div ref={shareMenuRef} style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: 'white', border: '2px solid #1A1A1A', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, borderRadius: '4px', overflow: 'hidden', minWidth: '220px' }}>
                        <button onClick={() => { copyShareLink(false); setShowShareMenu(false); }} style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px', fontFamily: '"Work Sans", sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => (e.target.style.background = '#f5f5f5')} onMouseLeave={(e) => (e.target.style.background = 'transparent')}>📋 View Only</button>
                        <button disabled style={{ width: '100%', padding: '12px 16px', background: '#f9f9f9', border: 'none', textAlign: 'left', cursor: 'not-allowed', fontSize: '14px', fontFamily: '"Work Sans", sans-serif', color: '#999', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>✏️ Share Editable Copy <span style={{ fontSize: '11px', fontStyle: 'italic' }}>(coming soon)</span></button>
                      </div>
                    )}
                    <button onClick={exportToPNG} style={{ padding: '12px 24px', backgroundColor: '#1A1A1A', color: '#FFFFFF', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: '"Work Sans", sans-serif' }} onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }} onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}>Export PNG</button>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '2px solid #1A1A1A', marginBottom: '40px' }} />

              {/* Export Container */}
              <div id="export-container" style={{ padding: '48px', maxWidth: '1400px', margin: '0 auto' }}>

                {/* Product Name */}
                <div style={{ marginBottom: '40px' }}>
                  {editingProductName ? (
                    <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} onBlur={() => setEditingProductName(false)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingProductName(false); }} autoFocus style={{ fontSize: '72px', fontWeight: '900', fontFamily: 'Inter, sans-serif', border: '2px solid #1A1A1A', backgroundColor: 'white', padding: '8px 12px', width: '100%', lineHeight: '1', letterSpacing: '-3px' }} />
                  ) : (
                    <h2 onClick={() => !isViewOnly && setEditingProductName(true)} style={{ fontSize: '72px', fontWeight: '900', fontFamily: 'Inter, sans-serif', margin: 0, color: '#1A1A1A', cursor: isViewOnly ? 'default' : 'pointer', display: 'inline-block', padding: '8px 0', lineHeight: '1', letterSpacing: '-3px' }} onMouseEnter={(e) => !isViewOnly && (e.target.style.opacity = '0.7')} onMouseLeave={(e) => (e.target.style.opacity = '1')}>{productName}</h2>
                  )}
                </div>

                {/* Filter */}
                <div style={{ marginBottom: '32px', paddingBottom: activeFilter || showFilter ? '24px' : '0', borderBottom: activeFilter || showFilter ? '1px solid #D0D0D0' : 'none', transition: 'all 0.3s ease' }}>
                  {!showFilter && !activeFilter ? (
                    <button onClick={() => setShowFilter(true)} style={{ padding: '8px 12px', backgroundColor: 'transparent', border: '2px solid #1A1A1A', cursor: 'pointer', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: '"Work Sans", sans-serif' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F0F0F0'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>+ Filter by Tag</button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Filter by Tag</div>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        {activeFilter && <div style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', backgroundColor: allTags.find(t => t.name === activeFilter)?.color || '#1A1A1A', pointerEvents: 'none', zIndex: 1 }} />}
                        <select value={activeFilter || ''} onChange={(e) => setActiveFilter(e.target.value || null)} style={{ padding: '8px 12px', paddingLeft: activeFilter ? '24px' : '12px', backgroundColor: 'white', border: '2px solid #1A1A1A', fontSize: '12px', fontWeight: '700', fontFamily: '"Work Sans", sans-serif', cursor: 'pointer', minWidth: '200px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <option value="">All Tags</option>
                          {allTags.map(tag => <option key={tag.name} value={tag.name}>{tag.name}</option>)}
                        </select>
                      </div>
                      <button onClick={() => { setActiveFilter(null); setShowFilter(false); }} style={{ padding: '8px 12px', backgroundColor: 'transparent', border: '2px solid #1A1A1A', cursor: 'pointer', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: '"Work Sans", sans-serif' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F0F0F0'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>{activeFilter ? 'Clear' : '×'}</button>
                    </div>
                  )}
                </div>

                {/* Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${nonDoneEntries.length}, 1fr)`, gap: '32px' }}>
                  {nonDoneEntries.map(([columnId, column]) => {
                    const filteredRocks = column.rocks.filter(r => !activeFilter || (r.tags && r.tags.includes(activeFilter)));
                    return (
                      <div key={columnId}>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {editingColumnTitle?.columnId === columnId ? (
                            <input type="text" value={column.title} autoFocus onChange={(e) => updateColumnTitle(columnId, e.target.value)} onBlur={() => setEditingColumnTitle(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumnTitle(null); }} style={{ fontSize: '24px', fontWeight: '900', fontFamily: '"Work Sans", sans-serif', border: '2px solid #1A1A1A', backgroundColor: 'white', padding: '4px 8px', color: '#1A1A1A', letterSpacing: '-1px', flex: 1, minWidth: 0 }} />
                          ) : (
                            <h2 onClick={() => !isViewOnly && setEditingColumnTitle({ columnId })} style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#1A1A1A', letterSpacing: '-1px', cursor: isViewOnly ? 'default' : 'pointer', padding: '4px 0' }} onMouseEnter={(e) => !isViewOnly && (e.target.style.opacity = '0.7')} onMouseLeave={(e) => (e.target.style.opacity = '1')}>{column.title}</h2>
                          )}
                          <button onClick={() => addRock(columnId)} disabled={isViewOnly} style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: isViewOnly ? '#999' : '#1A1A1A', color: '#FFFFFF', border: 'none', fontSize: '20px', cursor: isViewOnly ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isViewOnly ? 0.5 : 1 }} onMouseEnter={(e) => { if (!isViewOnly) { e.target.style.transform = 'scale(1.1)'; e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; } }} onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none'; }}>+</button>
                        </div>

                        <SortableContext items={filteredRocks.map(r => r.id)} strategy={verticalListSortingStrategy}>
                          <DroppableColumn id={columnId}>
                            {filteredRocks.length === 0 ? (
                              <div style={{ border: '2px dashed #D0D0D0', padding: '48px 24px', textAlign: 'center', color: '#999', fontSize: '14px', borderRadius: '4px', fontFamily: '"Work Sans", sans-serif', lineHeight: '1.8', backgroundColor: overId === columnId && activeDragRock ? 'rgba(231,76,60,0.04)' : 'transparent', transition: 'background-color 0.2s' }}>
                                🪨<br/>Drag rocks here or click + to add
                              </div>
                            ) : (
                              filteredRocks.map((rock) => (
                                <SortableRock
                                  key={rock.id}
                                  rock={rock}
                                  columnId={columnId}
                                  allTags={allTags}
                                  isViewOnly={isViewOnly}
                                  editingRockTitle={editingRockTitle}
                                  onEdit={() => setEditingRock({ ...rock, columnId })}
                                  onDelete={() => deleteRock(columnId, rock.id)}
                                  onUpdateSize={(s) => updateRock(columnId, rock.id, { size: s })}
                                  onStartEditTitle={() => setEditingRockTitle({ columnId, rockId: rock.id })}
                                  onSaveTitle={(t) => { updateRock(columnId, rock.id, { title: t }); setEditingRockTitle(null); }}
                                  onCancelEditTitle={() => setEditingRockTitle(null)}
                                />
                              ))
                            )}
                          </DroppableColumn>
                        </SortableContext>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* DONE Section */}
              {columns.done && (
                <div style={{ marginTop: '56px' }}>
                  <div style={{ borderTop: '2px solid #1A1A1A', paddingTop: '24px', marginBottom: '16px' }}>
                    <button onClick={() => setShowDone(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: '700', color: '#666', fontFamily: '"Work Sans", sans-serif', padding: '8px 12px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F5F5'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                      <span style={{ fontSize: '14px', transition: 'transform 0.2s', transform: showDone ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                      DONE ({columns.done.rocks.length})
                    </button>
                  </div>
                  {showDone && (
                    <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                      <SortableContext items={columns.done.rocks.map(r => r.id)} strategy={verticalListSortingStrategy}>
                        <DroppableColumn id="done">
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', columnGap: '16px', rowGap: '0', padding: '24px', border: '2px dashed #D0D0D0', minHeight: '80px', animation: doneContainerCelebrating ? 'doneContainerPulse 0.6s ease-in-out' : 'none' }}>
                            {columns.done.rocks.length === 0 ? (
                              <div style={{ gridColumn: '1/-1', padding: '32px', textAlign: 'center', color: '#999', fontSize: '14px' }}>Drag completed items here</div>
                            ) : (
                              columns.done.rocks
                                .filter(r => !activeFilter || (r.tags && r.tags.includes(activeFilter)))
                                .map((rock) => (
                                  <SortableRock
                                    key={rock.id}
                                    rock={rock}
                                    columnId="done"
                                    allTags={allTags}
                                    isViewOnly={isViewOnly}
                                    editingRockTitle={editingRockTitle}
                                    onEdit={() => setEditingRock({ ...rock, columnId: 'done' })}
                                    onDelete={() => deleteRock('done', rock.id)}
                                    onUpdateSize={(s) => updateRock('done', rock.id, { size: s })}
                                    onStartEditTitle={() => {}}
                                    onSaveTitle={() => {}}
                                    onCancelEditTitle={() => setEditingRockTitle(null)}
                                  />
                                ))
                            )}
                          </div>
                        </DroppableColumn>
                      </SortableContext>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div style={{ borderTop: '2px solid #1A1A1A', margin: '96px auto 0', paddingTop: '48px', maxWidth: '1400px' }}>
                <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <span>🔒 Your data, your browser. <strong>BIG ROCKS</strong> stores your roadmap locally. We never see it.</span>
                  <span style={{ fontSize: '12px', color: '#999' }}>© {new Date().getFullYear()}{' '}<a href="https://joehart.work/" target="_blank" rel="noopener noreferrer" style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '700' }} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>Joe Hart</a></span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Drag Overlay — floating ghost while dragging, preserves full styling */}
        <DragOverlay>
          {activeDragRock ? (
            <Rock
              rock={activeDragRock.rock}
              columnId={activeDragRock.columnId}
              allTags={allTags}
              isViewOnly={true}
              editingRockTitle={null}
              isDragOverlay={true}
              dragHandleProps={{}}
              onEdit={() => {}} onDelete={() => {}} onUpdateSize={() => {}}
              onStartEditTitle={() => {}} onSaveTitle={() => {}} onCancelEditTitle={() => {}}
            />
          ) : null}
        </DragOverlay>

        {/* Edit Modal */}
        {editingRock && (
          <RockEditModal
            rock={editingRock}
            allTags={allTags}
            onClose={() => setEditingRock(null)}
            onSave={(updates) => { updateRock(editingRock.columnId, editingRock.id, updates); setEditingRock(null); }}
            onAddCustomTag={addCustomTag}
            onDeleteCustomTag={deleteCustomTag}
            onDuplicate={() => duplicateRock(editingRock.columnId, editingRock.id)}
          />
        )}
      </DndContext>
    </>
  );
}

// ============================================================================
// ROCK COMPONENT
// ============================================================================

function Rock({ rock, columnId, allTags, isViewOnly, editingRockTitle, isDragOverlay, dragHandleProps, onEdit, onDelete, onUpdateSize, onStartEditTitle, onSaveTitle, onCancelEditTitle }) {
  const [titleValue, setTitleValue] = useState(rock.title);
  const titleInputRef = useRef(null);

  const isDone = columnId === 'done';
  const isEditingTitle = editingRockTitle?.columnId === columnId && editingRockTitle?.rockId === rock.id;
  const isEditable = !isViewOnly && !isDone;
  const displaySize = isDone ? ROCK_SIZES.SMALL : rock.size;

  const sizeStyles = { small: { minHeight: '80px' }, medium: { minHeight: '180px' }, large: { minHeight: '280px' } };

  useEffect(() => { if (!isEditingTitle) setTitleValue(rock.title); }, [rock.title, isEditingTitle]);
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) { titleInputRef.current.focus(); titleInputRef.current.select(); }
  }, [isEditingTitle]);

  const prevDisplaySize = useRef(displaySize);
  const [descAnimKey, setDescAnimKey] = useState(0);
  useEffect(() => {
    if (prevDisplaySize.current !== displaySize) { prevDisplaySize.current = displaySize; setDescAnimKey(k => k + 1); }
  }, [displaySize]);

  return (
    <div
      style={{
        ...sizeStyles[displaySize],
        backgroundColor: '#FFFFFF',
        border: '3px solid #1A1A1A',
        padding: '20px',
        marginBottom: isDragOverlay ? '0' : '16px',
        boxShadow: isDragOverlay ? '0 16px 40px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        opacity: isDone ? 0.7 : 1,
        transform: isDragOverlay ? 'rotate(1.5deg)' : undefined,
        cursor: isDragOverlay ? 'grabbing' : isEditingTitle ? 'default' : 'grab',
        userSelect: isEditingTitle ? 'text' : 'none',
        animation: rock.deleting ? 'rockDelete 0.3s cubic-bezier(0.4,0,0.2,1) forwards' : rock.justCompleted ? 'rockComplete 0.6s cubic-bezier(0.34,1.56,0.64,1)' : rock.justUncompleted ? 'rockUncomplete 0.6s cubic-bezier(0.4,0,0.2,1)' : rock.newlyCreated ? 'rockAppear 0.6s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        width: isDragOverlay ? '100%' : undefined,
      }}
    >
      {/* Invisible drag handle covers the whole card */}
      {!isViewOnly && !isDone && !isEditingTitle && (
        <div {...dragHandleProps} style={{ position: 'absolute', inset: 0, cursor: 'grab', zIndex: 0 }} />
      )}

      {/* Action buttons */}
      {isEditable && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', zIndex: 2 }}>
          {[
            { icon: '⇅', title: 'Change size', action: (e) => { e.stopPropagation(); const s = [ROCK_SIZES.SMALL, ROCK_SIZES.MEDIUM, ROCK_SIZES.LARGE]; onUpdateSize(s[(s.indexOf(rock.size) + 1) % 3]); } },
            { icon: '✎', title: 'Edit', action: (e) => { e.stopPropagation(); onEdit(); } },
            { icon: '×', title: 'Delete', action: (e) => { e.stopPropagation(); onDelete(); }, danger: true },
          ].map(btn => (
            <button key={btn.icon} onClick={btn.action} title={btn.title}
              style={{ width: '24px', height: '24px', backgroundColor: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '12px', position: 'relative', zIndex: 2 }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = btn.danger ? 'rgba(231,76,60,0.2)' : 'rgba(0,0,0,0.2)'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'rgba(0,0,0,0.1)'; }}
            >{btn.icon}</button>
          ))}
        </div>
      )}

      {/* Title */}
      {isEditingTitle ? (
        <input ref={titleInputRef} type="text" value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={() => onSaveTitle(titleValue.trim() || rock.title)}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') onSaveTitle(titleValue.trim() || rock.title); if (e.key === 'Escape') { setTitleValue(rock.title); onCancelEditTitle(); } }}
          style={{ fontSize: '18px', fontWeight: '900', fontFamily: '"Work Sans", sans-serif', border: '2px solid #1A1A1A', borderRadius: '2px', backgroundColor: 'white', padding: '4px 8px', marginBottom: '8px', color: '#1A1A1A', width: 'calc(100% - 88px)', boxSizing: 'border-box', outline: 'none', boxShadow: '0 0 0 3px rgba(231,76,60,0.2)', position: 'relative', zIndex: 2 }}
        />
      ) : (
        <h3 onClick={(e) => { if (isEditable) { e.stopPropagation(); onStartEditTitle(); } }}
          style={{ fontSize: '18px', fontWeight: '900', margin: '0 0 8px 0', color: '#1A1A1A', wordBreak: 'break-word', paddingRight: isEditable ? '80px' : '0', cursor: isEditable ? 'text' : 'default', position: 'relative', zIndex: 2 }}
        >{rock.title}</h3>
      )}

      {rock.description && displaySize !== ROCK_SIZES.SMALL && (
        <p key={descAnimKey} style={{ fontSize: '13px', lineHeight: '1.6', margin: '0 0 auto 0', color: 'rgba(26,26,26,0.92)', fontWeight: '500', animation: 'descEnter 0.32s cubic-bezier(0,0,0.2,1) forwards', position: 'relative', zIndex: 2 }}>{rock.description}</p>
      )}

      {rock.date && (
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(26,26,26,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: displaySize === ROCK_SIZES.SMALL ? 'auto' : '8px', position: 'relative', zIndex: 2 }}>{rock.date}</div>
      )}

      {isDone && rock.completedDate && (
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#1E8449', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px', position: 'relative', zIndex: 2 }}>✓ {rock.completedDate}</div>
      )}

      {rock.tags && rock.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', position: 'relative', zIndex: 2 }}>
          {rock.tags.map(tagName => {
            const tag = allTags.find(t => t.name === tagName);
            return tag ? <span key={tagName} style={{ backgroundColor: tag.color, color: getContrastTextColor(tag.color), fontSize: '11px', fontWeight: '700', padding: '6px 12px', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', lineHeight: '1' }}>{tag.name}</span> : null;
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ROCK EDIT MODAL
// ============================================================================

function RockEditModal({ rock, allTags, onClose, onSave, onAddCustomTag, onDeleteCustomTag, onDuplicate }) {
  const [formData, setFormData] = useState({ title: rock.title, description: rock.description || '', size: rock.size, date: rock.date || '', tags: rock.tags || [] });
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#C97D60');

  const handleAddCustomTag = () => {
    if (newTagName.trim()) { onAddCustomTag(newTagName.trim(), newTagColor); setFormData(prev => ({ ...prev, tags: [...prev.tags, newTagName.trim()] })); setNewTagName(''); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', animation: 'fadeIn 0.2s ease-out' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#F0F0F0', border: '2px solid #1A1A1A', padding: '32px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto', animation: 'slideUp 0.3s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: '900', margin: '0', color: '#1A1A1A' }}>Edit Rock</h3>
          <button onClick={() => { onDuplicate(); onClose(); }} style={{ padding: '8px 16px', backgroundColor: '#1A1A1A', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: '"Work Sans", sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#333'} onMouseLeave={(e) => e.target.style.backgroundColor = '#1A1A1A'}>Duplicate</button>
        </div>

        {[
          { label: 'Title', key: 'title', type: 'input', inputType: 'text', fontSize: '16px' },
          { label: 'Description', key: 'description', type: 'textarea', rows: 4, fontSize: '14px' },
          { label: 'Date (Optional)', key: 'date', type: 'input', inputType: 'text', placeholder: 'Q2 2025', fontSize: '14px' },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', color: '#1A1A1A' }}>{field.label}</label>
            {field.type === 'textarea'
              ? <textarea value={formData[field.key]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} rows={field.rows} style={{ width: '100%', padding: '12px', fontSize: field.fontSize, border: '2px solid #1A1A1A', fontFamily: '"Work Sans", sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
              : <input type={field.inputType} value={formData[field.key]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} placeholder={field.placeholder} style={{ width: '100%', padding: '12px', fontSize: field.fontSize, border: '2px solid #1A1A1A', fontFamily: '"Work Sans", sans-serif', boxSizing: 'border-box' }} />
            }
          </div>
        ))}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', color: '#1A1A1A' }}>Tags (select multiple)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {allTags.map(tag => {
              const isSelected = formData.tags.includes(tag.name);
              const isThemeTag = THEME_TAGS.some(t => t.name === tag.name);
              return (
                <button key={tag.name}
                  onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags.includes(tag.name) ? prev.tags.filter(t => t !== tag.name) : [...prev.tags, tag.name] }))}
                  style={{ padding: '12px 16px', backgroundColor: tag.color, color: getContrastTextColor(tag.color), border: isSelected ? '3px solid #1A1A1A' : '2px solid transparent', borderRadius: '2px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: '"Work Sans", sans-serif', position: 'relative', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '48px' }}
                  onMouseEnter={(e) => { e.target.style.transform = 'scale(1.02)'; e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none'; }}
                >
                  {tag.name}
                  {!isThemeTag && (
                    <span onClick={(e) => { e.stopPropagation(); onDeleteCustomTag(tag.name); setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag.name) })); }}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.stopPropagation(); e.target.style.backgroundColor = 'rgba(0,0,0,0.5)'; }}
                      onMouseLeave={(e) => { e.stopPropagation(); e.target.style.backgroundColor = 'rgba(0,0,0,0.3)'; }}
                      title="Delete custom tag"
                    >×</span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Create New Tag</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" placeholder="Tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTag(); } }} style={{ flex: 1, padding: '12px', fontSize: '14px', border: '2px solid #1A1A1A', fontFamily: '"Work Sans", sans-serif' }} />
              <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} style={{ width: '48px', height: '48px', border: '2px solid #1A1A1A', cursor: 'pointer', padding: '2px' }} />
              <button onClick={handleAddCustomTag} style={{ padding: '12px 24px', backgroundColor: '#1A1A1A', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: '"Work Sans", sans-serif' }}>Add</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '2px solid #1A1A1A', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: '"Work Sans", sans-serif' }}>Cancel</button>
          <button onClick={() => onSave(formData)} style={{ padding: '12px 24px', backgroundColor: '#1A1A1A', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: '"Work Sans", sans-serif' }}>Save</button>
        </div>
      </div>
    </div>
  );
}
