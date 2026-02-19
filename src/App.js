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

// ─── helpers ────────────────────────────────────────────────────────────────

const getContrast = (hex) => {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b)/255 > 0.5 ? '#1A1A1A' : '#FFFFFF';
};

const THEME_TAGS = [
  { name:'Tech Debt',      color:'#C97D60' },
  { name:'Research',       color:'#2C3E50' },
  { name:'Customer',       color:'#27AE60' },
  { name:'Infrastructure', color:'#F39C12' },
  { name:'Design',         color:'#8E44AD' },
  { name:'Platform',       color:'#5D6D7E' },
  { name:'Marketing',      color:'#E74C3C' },
  { name:'Data',           color:'#16A085' },
];

const SZ = { SMALL:'small', MEDIUM:'medium', LARGE:'large' };

const BTN = { padding:'12px 24px', backgroundColor:'#1A1A1A', color:'#FFF', border:'none', fontSize:'14px', fontWeight:'700', cursor:'pointer', textTransform:'uppercase', letterSpacing:'1px', fontFamily:'"Work Sans",sans-serif' };
const SBTN = { padding:'8px 12px', backgroundColor:'transparent', border:'2px solid #1A1A1A', cursor:'pointer', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', fontFamily:'"Work Sans",sans-serif' };

// ─── done zone strip ─────────────────────────────────────────────────────────

function DoneZoneStrip() {
  const { setNodeRef, isOver } = useDroppable({ id:'done-zone-strip' });
  return (
    <div ref={setNodeRef} style={{ position:'fixed', left:0, top:0, bottom:0, width:'80px', zIndex:1000, background:isOver?'linear-gradient(to right,rgba(231,76,60,0.6),rgba(231,76,60,0.15))':'linear-gradient(to right,rgba(231,76,60,0.25),rgba(231,76,60,0.03))', borderRight:isOver?'4px solid #E74C3C':'4px solid rgba(231,76,60,0.5)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
      <div style={{ writingMode:'vertical-rl', transform:'rotate(180deg)', fontSize:'11px', fontWeight:'900', letterSpacing:'2px', color:isOver?'#E74C3C':'rgba(231,76,60,0.7)', textTransform:'uppercase', userSelect:'none', transition:'color 0.15s' }}>
        {isOver ? '✓ DROP TO DONE' : 'DROP → DONE'}
      </div>
    </div>
  );
}

// ─── droppable column ────────────────────────────────────────────────────────

function DroppableColumn({ id, children }) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} style={{ minHeight:'120px' }}>{children}</div>;
}

// ─── sortable rock wrapper ───────────────────────────────────────────────────

function SortableRock(props) {
  const { rock, columnId, isViewOnly } = props;
  const isDoneRock = columnId === 'done';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rock.id,
    disabled: isDoneRock ? false : isViewOnly,   // done rocks always draggable
    data: { columnId, rock },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : (transition ? 'transform 250ms cubic-bezier(0.25,1,0.5,1)' : undefined),
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} data-rock-id={rock.id} style={style}>
      <Rock
        {...props}
        isViewOnly={isDoneRock ? false : isViewOnly}
        isDragOverlay={false}
        isDraggingParent={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ─── main app ────────────────────────────────────────────────────────────────

export default function App() {
  const getShared = () => {
    if (typeof window==='undefined') return null;
    const s = new URLSearchParams(window.location.search).get('data');
    if (!s) return null;
    try { return JSON.parse(atob(s)); } catch(e) { return null; }
  };

  const [columns, setColumns] = useState(() => {
    const sh = getShared();
    if (sh) { if (!sh.columns.done) sh.columns.done={title:'DONE',rocks:[]}; return sh.columns; }
    const sv = typeof window!=='undefined' && localStorage.getItem('bigRocksData');
    if (sv) { const p=JSON.parse(sv); if(!p.done) p.done={title:'DONE',rocks:[]}; return p; }
    return { now:{title:'NOW',rocks:[]}, next:{title:'NEXT',rocks:[]}, later:{title:'LATER',rocks:[]}, done:{title:'DONE',rocks:[]} };
  });

  const [productName, setProductName] = useState(() => {
    const sh=getShared(); if(sh) return sh.productName||'Roadmap';
    return (typeof window!=='undefined'&&localStorage.getItem('bigRocksproductName'))||'Roadmap';
  });

  const [customTags, setCustomTags] = useState(() => {
    const sh=getShared(); if(sh) return sh.customTags||[];
    const sv=typeof window!=='undefined'&&localStorage.getItem('bigRocksCustomTags');
    return sv ? JSON.parse(sv) : [];
  });

  const [isViewOnly] = useState(() => {
    const sh=getShared(); return sh ? sh.editable===false : false;
  });

  const [editingRock,        setEditingRock]        = useState(null);
  const [editingProductName, setEditingProductName] = useState(false);
  const [editingColumnTitle, setEditingColumnTitle] = useState(null);
  const [editingRockTitle,   setEditingRockTitle]   = useState(null);
  const [showDone,           setShowDone]           = useState(false);
  const [showShareMenu,      setShowShareMenu]      = useState(false);
  const [doneCelebrating,    setDoneCelebrating]    = useState(false);
  const [activeFilter,       setActiveFilter]       = useState(null);
  const [showFilter,         setShowFilter]         = useState(false);
  // activeDragRock: { rock, columnId, displaySize }
  // displaySize is the *visual* size at drag start (done rocks appear small)
  const [activeDragRock, setActiveDragRock] = useState(null);
  const [overId,         setOverId]         = useState(null);

  const activeDragRef = useRef(null);
  const columnsRef    = useRef(columns);
  const scrollRef     = useRef(null);
  const shareMenuRef  = useRef(null);

  useEffect(() => { columnsRef.current = columns; }, [columns]);
  useEffect(() => { if (!isViewOnly) localStorage.setItem('bigRocksData',       JSON.stringify(columns));    }, [columns, isViewOnly]);
  useEffect(() => { if (!isViewOnly) localStorage.setItem('bigRocksproductName',productName);                }, [productName, isViewOnly]);
  useEffect(() => { if (!isViewOnly) localStorage.setItem('bigRocksCustomTags', JSON.stringify(customTags)); }, [customTags, isViewOnly]);
  useEffect(() => {
    const h = e => { if (showShareMenu&&shareMenuRef.current&&!shareMenuRef.current.contains(e.target)) setShowShareMenu(false); };
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  }, [showShareMenu]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:6 } }));

  const findCol = (rockId, cols) => {
    const c = cols || columnsRef.current;
    return Object.keys(c).find(k => c[k].rocks.some(r => r.id===rockId));
  };

  const handleDragStart = ({ active }) => {
    const colId = findCol(active.id);
    if (!colId) return;
    const rock = columnsRef.current[colId].rocks.find(r => r.id===active.id);
    // For the overlay: done rocks show visually as small but we want the ghost
    // to reflect their original size (before completion). Fall back to MEDIUM.
    const displaySize = colId==='done' ? (rock.originalSize||SZ.MEDIUM) : rock.size;
    const info = { rock, columnId:colId, displaySize };
    activeDragRef.current = info;
    setActiveDragRock(info);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    setOverId(over.id);
    if (over.id==='done-zone-strip') return;

    const fromCol = findCol(active.id);
    const toCol   = findCol(over.id) || (columnsRef.current[over.id] ? over.id : null);
    if (!fromCol||!toCol||fromCol===toCol) return;

    setColumns(prev => {
      const from=[...prev[fromCol].rocks], to=[...prev[toCol].rocks];
      const fi=from.findIndex(r=>r.id===active.id);
      const ti=to.findIndex(r=>r.id===over.id);
      const [moved]=from.splice(fi,1);
      to.splice(ti>=0?ti:to.length,0,moved);
      return { ...prev, [fromCol]:{...prev[fromCol],rocks:from}, [toCol]:{...prev[toCol],rocks:to} };
    });
  };

  const openDoneNoScroll = () => {
    const el=scrollRef.current, y=el?el.scrollTop:0;
    setShowDone(true);
    requestAnimationFrame(()=>{ if(el) el.scrollTop=y; });
  };

  const celebrate = () => {
    setDoneCelebrating(true);
    setTimeout(()=>setDoneCelebrating(false),600);
  };

  const nowDate = () => new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

  const handleDragEnd = ({ active, over }) => {
    const startInfo = activeDragRef.current;
    activeDragRef.current = null;
    setActiveDragRock(null);
    setOverId(null);
    if (!over) return;

    // ── left-edge done zone ───────────────────────────────────────────────────
    if (over.id==='done-zone-strip') {
      if (!startInfo||startInfo.columnId==='done') return;
      const colId=findCol(active.id);
      if (!colId||colId==='done') return;
      const rock=columnsRef.current[colId].rocks.find(r=>r.id===active.id);
      if (!rock) return;
      setColumns(prev=>({
        ...prev,
        [colId]:{ ...prev[colId], rocks:prev[colId].rocks.filter(r=>r.id!==active.id) },
        done:{ ...prev.done, rocks:[...prev.done.rocks,{ ...rock, completedDate:nowDate(), originalSize:rock.size, size:SZ.SMALL, justCompleted:true }] },
      }));
      openDoneNoScroll(); celebrate();
      setTimeout(()=>setColumns(prev=>({ ...prev, done:{ ...prev.done, rocks:prev.done.rocks.map(r=>r.id===active.id?{...r,justCompleted:false}:r) } })),600);
      return;
    }

    const activeCol = findCol(active.id);
    const overCol   = findCol(over.id)||(columnsRef.current[over.id]?over.id:null);
    if (!activeCol||!overCol) return;

    // ── reorder within same column ────────────────────────────────────────────
    if (activeCol===overCol) {
      const rocks=columnsRef.current[activeCol].rocks;
      const oi=rocks.findIndex(r=>r.id===active.id), ni=rocks.findIndex(r=>r.id===over.id);
      if (oi!==ni) setColumns(prev=>({ ...prev, [activeCol]:{ ...prev[activeCol], rocks:arrayMove(prev[activeCol].rocks,oi,ni) } }));
      return;
    }

    // ── dropped into done section ─────────────────────────────────────────────
    if (overCol==='done'&&activeCol!=='done') {
      setColumns(prev=>({ ...prev, done:{ ...prev.done, rocks:prev.done.rocks.map(r=>r.id===active.id&&!r.completedDate?{ ...r, completedDate:nowDate(), originalSize:r.size, size:SZ.SMALL, justCompleted:true }:r) } }));
      openDoneNoScroll(); celebrate();
      setTimeout(()=>setColumns(prev=>({ ...prev, done:{ ...prev.done, rocks:prev.done.rocks.map(r=>r.id===active.id?{...r,justCompleted:false}:r) } })),600);
      return;
    }

    // ── restore from done ─────────────────────────────────────────────────────
    // By dragEnd, handleDragOver has already moved the rock into activeCol.
    // startInfo.columnId tells us the drag originated from done.
    if (startInfo&&startInfo.columnId==='done'&&activeCol!=='done') {
      setColumns(prev=>({ ...prev, [activeCol]:{ ...prev[activeCol], rocks:prev[activeCol].rocks.map(r=>{
        if (r.id!==active.id) return r;
        const restored={ ...r, justUncompleted:true, size:r.originalSize||SZ.MEDIUM };
        delete restored.completedDate;
        delete restored.originalSize;
        return restored;
      }) } }));
      setTimeout(()=>setColumns(prev=>({ ...prev, [activeCol]:{ ...prev[activeCol], rocks:prev[activeCol].rocks.map(r=>r.id===active.id?{...r,justUncompleted:false}:r) } })),600);
      return;
    }
  };

  // ── crud ──────────────────────────────────────────────────────────────────

  const addCustomTag    = (name,color) => setCustomTags(prev=>[...prev,{name,color}]);
  const deleteCustomTag = (name) => {
    setCustomTags(prev=>prev.filter(t=>t.name!==name));
    setColumns(prev=>{ const n={...prev}; Object.keys(n).forEach(k=>{ n[k]={...n[k],rocks:n[k].rocks.map(r=>({...r,tags:r.tags?r.tags.filter(t=>t!==name):[]}))}; }); return n; });
  };

  const addRock = (colId) => {
    if (isViewOnly) return;
    const r={ id:`rock-${Date.now()}`, title:'New Initiative', description:'', size:SZ.MEDIUM, tags:[], date:'', newlyCreated:true };
    setColumns(prev=>({ ...prev, [colId]:{ ...prev[colId], rocks:[...prev[colId].rocks,r] } }));
    setTimeout(()=>setColumns(prev=>({ ...prev, [colId]:{ ...prev[colId], rocks:prev[colId].rocks.map(x=>x.id===r.id?{...x,newlyCreated:false}:x) } })),600);
    setEditingRock({ ...r, columnId:colId });
  };

  const updateRock = (colId,rockId,updates) =>
    setColumns(prev=>({ ...prev, [colId]:{ ...prev[colId], rocks:prev[colId].rocks.map(r=>r.id===rockId?{...r,...updates}:r) } }));

  const updateColumnTitle = (colId,title) =>
    setColumns(prev=>({ ...prev, [colId]:{ ...prev[colId], title } }));

  const deleteRock = (colId,rockId) => {
    setColumns(prev=>({ ...prev, [colId]:{ ...prev[colId], rocks:prev[colId].rocks.map(r=>r.id===rockId?{...r,deleting:true}:r) } }));
    setTimeout(()=>setColumns(prev=>({ ...prev, [colId]:{ ...prev[colId], rocks:prev[colId].rocks.filter(r=>r.id!==rockId) } })),300);
  };

  const duplicateRock = (colId,rockId) => {
    const src=columns[colId].rocks.find(r=>r.id===rockId);
    if (!src) return;
    const dup={ ...src, id:`rock-${Date.now()}`, newlyCreated:true };
    setColumns(prev=>({ ...prev, [colId]:{ ...prev[colId], rocks:[...prev[colId].rocks,dup] } }));
    setTimeout(()=>setColumns(prev=>({ ...prev, [colId]:{ ...prev[colId], rocks:prev[colId].rocks.map(r=>r.id===dup.id?{...r,newlyCreated:false}:r) } })),600);
  };

  const copyShareLink = (editable) => {
    const enc=btoa(JSON.stringify({columns,productName,customTags,editable}));
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?data=${enc}`);
    alert(editable?'Editable link copied!':'View-only link copied!');
  };

  const exportToPNG = async () => {
    try {
      const el=document.getElementById('export-container');
      const c=await html2canvas(el,{backgroundColor:'#F0F0F0',scale:2,logging:false,useCORS:true,width:el.offsetWidth,height:el.offsetHeight,windowWidth:el.scrollWidth,windowHeight:el.scrollHeight});
      const out=document.createElement('canvas'); out.width=c.width-120; out.height=c.height;
      out.getContext('2d').drawImage(c,0,0);
      const a=document.createElement('a'); a.download=`${productName.replace(/\s+/g,'-').toLowerCase()}-roadmap.png`; a.href=out.toDataURL('image/png'); a.click();
    } catch(e) { alert('Export failed. Please try again.'); }
  };

  const allTags        = [...THEME_TAGS,...customTags];
  const nonDoneEntries = Object.entries(columns).filter(([id])=>id!=='done');
  const doneRockIds    = columns.done?.rocks.map(r=>r.id)??[];
  const draggingLive   = activeDragRock && activeDragRock.columnId!=='done';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;700;900&family=Inter:wght@900&display=swap');
        *{box-sizing:border-box} body{margin:0}
        @keyframes fadeIn    {from{opacity:0}to{opacity:1}}
        @keyframes slideUp   {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes rockAppear{0%{opacity:0;transform:scale(0.9) translateY(10px)}60%{transform:scale(1.02)}100%{opacity:1;transform:scale(1)}}
        @keyframes rockDelete{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(0.9) translateX(-20px)}}
        @keyframes rockComplete  {0%{transform:scale(1)}30%{transform:scale(1.08)}100%{transform:scale(1)}}
        @keyframes rockUncomplete{0%{transform:scale(1);opacity:0.7}50%{transform:scale(0.95)}100%{transform:scale(1);opacity:1}}
        @keyframes donePulse {0%,100%{border-color:#D0D0D0}50%{border-color:#27AE60}}
        @keyframes descEnter {0%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#CCC;border-radius:3px}
      `}</style>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {draggingLive && !isViewOnly && <DoneZoneStrip />}

        <div ref={scrollRef} style={{ height:'100vh', width:'100vw', overflowY:'auto', overflowX:'hidden', backgroundColor:'#F0F0F0', backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.3'/%3E%3C/svg%3E")`, fontFamily:'"Work Sans",sans-serif' }}>
          <div style={{ minHeight:'100%', padding:'24px 24px 80px' }}>
            <div style={{ maxWidth:'1400px', margin:'0 auto' }}>

              {isViewOnly && <div style={{ backgroundColor:'#F39C12', color:'#1A1A1A', padding:'12px 24px', marginBottom:'24px', fontSize:'14px', fontWeight:'700', textAlign:'center' }}>👁️ View-Only Mode — You're viewing a shared roadmap</div>}

              {/* Header */}
              <div style={{ marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <img src="/big-rocks-image.png" alt="Boulder" style={{ width:'32px', height:'32px', objectFit:'contain' }} />
                  <h1 style={{ fontSize:'18px', fontWeight:'900', margin:0, color:'#1A1A1A', letterSpacing:'-1px', textTransform:'uppercase', lineHeight:'0.9' }}>BIG<br/>ROCKS</h1>
                </div>
                {!isViewOnly && (
                  <div style={{ display:'flex', gap:'12px', position:'relative' }}>
                    <button onClick={e=>{ e.stopPropagation(); setShowShareMenu(p=>!p); }} style={BTN}>Share</button>
                    {showShareMenu && (
                      <div ref={shareMenuRef} style={{ position:'absolute', top:'100%', right:0, marginTop:'8px', backgroundColor:'white', border:'2px solid #1A1A1A', boxShadow:'0 4px 12px rgba(0,0,0,0.15)', zIndex:1000, borderRadius:'4px', overflow:'hidden', minWidth:'220px' }}>
                        <button onClick={()=>{ copyShareLink(false); setShowShareMenu(false); }} style={{ width:'100%', padding:'12px 16px', background:'transparent', border:'none', textAlign:'left', cursor:'pointer', fontSize:'14px', fontFamily:'"Work Sans",sans-serif', display:'flex', alignItems:'center', gap:'8px' }} onMouseEnter={e=>e.target.style.background='#f5f5f5'} onMouseLeave={e=>e.target.style.background='transparent'}>📋 View Only</button>
                        <button disabled style={{ width:'100%', padding:'12px 16px', background:'#f9f9f9', border:'none', textAlign:'left', cursor:'not-allowed', fontSize:'14px', fontFamily:'"Work Sans",sans-serif', color:'#999', opacity:0.7 }}>✏️ Share Editable <span style={{fontSize:'11px',fontStyle:'italic'}}>(coming soon)</span></button>
                      </div>
                    )}
                    <button onClick={exportToPNG} style={BTN}>Export PNG</button>
                  </div>
                )}
              </div>

              <div style={{ borderTop:'2px solid #1A1A1A', marginBottom:'40px' }} />

              <div id="export-container" style={{ padding:'48px', maxWidth:'1400px', margin:'0 auto' }}>
                {/* Product name */}
                <div style={{ marginBottom:'40px' }}>
                  {editingProductName
                    ? <input type="text" value={productName} onChange={e=>setProductName(e.target.value)} onBlur={()=>setEditingProductName(false)} onKeyDown={e=>e.key==='Enter'&&setEditingProductName(false)} autoFocus style={{ fontSize:'72px', fontWeight:'900', fontFamily:'Inter,sans-serif', border:'2px solid #1A1A1A', backgroundColor:'white', padding:'8px 12px', width:'100%', lineHeight:'1', letterSpacing:'-3px' }} />
                    : <h2 onClick={()=>!isViewOnly&&setEditingProductName(true)} style={{ fontSize:'72px', fontWeight:'900', fontFamily:'Inter,sans-serif', margin:0, color:'#1A1A1A', cursor:isViewOnly?'default':'pointer', padding:'8px 0', lineHeight:'1', letterSpacing:'-3px', display:'inline-block' }} onMouseEnter={e=>!isViewOnly&&(e.target.style.opacity='0.7')} onMouseLeave={e=>e.target.style.opacity='1'}>{productName}</h2>
                  }
                </div>

                {/* Filter */}
                <div style={{ marginBottom:'32px', paddingBottom:activeFilter||showFilter?'24px':'0', borderBottom:activeFilter||showFilter?'1px solid #D0D0D0':'none', transition:'all 0.3s' }}>
                  {!showFilter&&!activeFilter
                    ? <button onClick={()=>setShowFilter(true)} style={SBTN}>+ Filter by Tag</button>
                    : <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', color:'#666' }}>Filter by Tag</div>
                        <div style={{ position:'relative' }}>
                          {activeFilter && <div style={{ position:'absolute', left:'8px', top:'50%', transform:'translateY(-50%)', width:'8px', height:'8px', backgroundColor:allTags.find(t=>t.name===activeFilter)?.color||'#1A1A1A', pointerEvents:'none', zIndex:1 }} />}
                          <select value={activeFilter||''} onChange={e=>setActiveFilter(e.target.value||null)} style={{ padding:'8px 12px', paddingLeft:activeFilter?'24px':'12px', backgroundColor:'white', border:'2px solid #1A1A1A', fontSize:'12px', fontWeight:'700', fontFamily:'"Work Sans",sans-serif', cursor:'pointer', minWidth:'200px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            <option value="">All Tags</option>
                            {allTags.map(t=><option key={t.name} value={t.name}>{t.name}</option>)}
                          </select>
                        </div>
                        <button onClick={()=>{ setActiveFilter(null); setShowFilter(false); }} style={SBTN}>{activeFilter?'Clear':'×'}</button>
                      </div>
                  }
                </div>

                {/* Live columns */}
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${nonDoneEntries.length},1fr)`, gap:'32px' }}>
                  {nonDoneEntries.map(([colId,col]) => {
                    const rocks=col.rocks.filter(r=>!activeFilter||(r.tags&&r.tags.includes(activeFilter)));
                    return (
                      <div key={colId}>
                        <div style={{ marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          {editingColumnTitle?.columnId===colId
                            ? <input type="text" value={col.title} autoFocus onChange={e=>updateColumnTitle(colId,e.target.value)} onBlur={()=>setEditingColumnTitle(null)} onKeyDown={e=>e.key==='Enter'&&setEditingColumnTitle(null)} style={{ fontSize:'24px', fontWeight:'900', fontFamily:'"Work Sans",sans-serif', border:'2px solid #1A1A1A', backgroundColor:'white', padding:'4px 8px', color:'#1A1A1A', letterSpacing:'-1px', flex:1, minWidth:0 }} />
                            : <h2 onClick={()=>!isViewOnly&&setEditingColumnTitle({columnId:colId})} style={{ fontSize:'24px', fontWeight:'900', margin:0, color:'#1A1A1A', letterSpacing:'-1px', cursor:isViewOnly?'default':'pointer', padding:'4px 0' }} onMouseEnter={e=>!isViewOnly&&(e.target.style.opacity='0.7')} onMouseLeave={e=>e.target.style.opacity='1'}>{col.title}</h2>
                          }
                          <button onClick={()=>addRock(colId)} disabled={isViewOnly} style={{ width:'32px', height:'32px', backgroundColor:isViewOnly?'#999':'#1A1A1A', color:'#FFF', border:'none', fontSize:'20px', cursor:isViewOnly?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:isViewOnly?0.5:1, flexShrink:0 }}>+</button>
                        </div>
                        <SortableContext items={rocks.map(r=>r.id)} strategy={verticalListSortingStrategy}>
                          <DroppableColumn id={colId}>
                            {rocks.length===0
                              ? <div style={{ border:'2px dashed #D0D0D0', padding:'48px 24px', textAlign:'center', color:'#999', fontSize:'14px', lineHeight:'1.8', backgroundColor:overId===colId&&activeDragRock?'rgba(231,76,60,0.04)':'transparent', transition:'background-color 0.2s' }}>🪨<br/>Drag rocks here or click + to add</div>
                              : rocks.map(rock=>(
                                  <SortableRock key={rock.id} rock={rock} columnId={colId} allTags={allTags} isViewOnly={isViewOnly} editingRockTitle={editingRockTitle}
                                    onEdit={()=>setEditingRock({...rock,columnId:colId})}
                                    onDelete={()=>deleteRock(colId,rock.id)}
                                    onUpdateSize={s=>updateRock(colId,rock.id,{size:s})}
                                    onStartEditTitle={()=>setEditingRockTitle({columnId:colId,rockId:rock.id})}
                                    onSaveTitle={t=>{ updateRock(colId,rock.id,{title:t}); setEditingRockTitle(null); }}
                                    onCancelEditTitle={()=>setEditingRockTitle(null)}
                                  />
                                ))
                            }
                          </DroppableColumn>
                        </SortableContext>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Done section */}
              {columns.done && (
                <div style={{ marginTop:'56px' }}>
                  <div style={{ borderTop:'2px solid #1A1A1A', paddingTop:'24px', marginBottom:'16px' }}>
                    <button onClick={()=>setShowDone(v=>!v)} style={{ display:'flex', alignItems:'center', gap:'12px', backgroundColor:'transparent', border:'none', cursor:'pointer', fontSize:'18px', fontWeight:'700', color:'#666', fontFamily:'"Work Sans",sans-serif', padding:'8px 12px' }} onMouseEnter={e=>e.target.style.backgroundColor='#F5F5F5'} onMouseLeave={e=>e.target.style.backgroundColor='transparent'}>
                      <span style={{ fontSize:'14px', transition:'transform 0.2s', transform:showDone?'rotate(90deg)':'rotate(0deg)', display:'inline-block' }}>▶</span>
                      DONE ({columns.done.rocks.length})
                    </button>
                  </div>

                  {/*
                    KEY FIX: SortableRock nodes must ALWAYS be in the DOM.
                    dnd-kit needs the DOM elements to exist to attach sensors and
                    read positions. display:none removes them — can't drag.
                    We use visibility:hidden + height:0 to hide visually while
                    keeping nodes mounted.
                  */}
                  <SortableContext items={doneRockIds} strategy={verticalListSortingStrategy}>
                    <DroppableColumn id="done">
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', columnGap:'16px', padding:showDone?'24px':'0', border:showDone?'2px dashed #D0D0D0':'none', animation:doneCelebrating?'donePulse 0.6s ease-in-out':'none' }}>
                        {showDone && columns.done.rocks.length===0 && (
                          <div style={{ gridColumn:'1/-1', padding:'32px', textAlign:'center', color:'#999', fontSize:'14px' }}>Drag completed items here</div>
                        )}
                        {columns.done.rocks
                          .filter(r=>!activeFilter||(r.tags&&r.tags.includes(activeFilter)))
                          .map(rock=>(
                            <div key={rock.id} style={{ visibility:showDone?'visible':'hidden', height:showDone?'auto':'0', overflow:'hidden', marginBottom:showDone?'0':'0' }}>
                              <SortableRock rock={rock} columnId="done" allTags={allTags} isViewOnly={isViewOnly} editingRockTitle={editingRockTitle}
                                onEdit={()=>setEditingRock({...rock,columnId:'done'})}
                                onDelete={()=>deleteRock('done',rock.id)}
                                onUpdateSize={s=>updateRock('done',rock.id,{size:s})}
                                onStartEditTitle={()=>{}} onSaveTitle={()=>{}}
                                onCancelEditTitle={()=>setEditingRockTitle(null)}
                              />
                            </div>
                          ))
                        }
                      </div>
                    </DroppableColumn>
                  </SortableContext>
                </div>
              )}

              {/* Footer */}
              <div style={{ borderTop:'2px solid #1A1A1A', margin:'96px auto 0', paddingTop:'48px' }}>
                <div style={{ fontSize:'13px', lineHeight:'1.6', color:'#666', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px' }}>
                  <span>🔒 Your data, your browser. <strong>BIG ROCKS</strong> stores locally. We never see it.</span>
                  <span style={{ fontSize:'12px', color:'#999' }}>© {new Date().getFullYear()} <a href="https://joehart.work/" target="_blank" rel="noopener noreferrer" style={{ color:'#1A1A1A', textDecoration:'none', fontWeight:'700' }} onMouseEnter={e=>e.target.style.textDecoration='underline'} onMouseLeave={e=>e.target.style.textDecoration='none'}>Joe Hart</a></span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration:200, easing:'cubic-bezier(0.25,1,0.5,1)' }}>
          {activeDragRock && (
            <Rock
              rock={activeDragRock.rock}
              columnId="now"
              overlaySize={activeDragRock.displaySize}
              allTags={allTags}
              isViewOnly={true}
              editingRockTitle={null}
              isDragOverlay={true}
              isDraggingParent={false}
              dragHandleProps={{}}
              onEdit={()=>{}} onDelete={()=>{}} onUpdateSize={()=>{}}
              onStartEditTitle={()=>{}} onSaveTitle={()=>{}} onCancelEditTitle={()=>{}}
            />
          )}
        </DragOverlay>

        {editingRock && (
          <RockEditModal
            rock={editingRock} allTags={allTags}
            onClose={()=>setEditingRock(null)}
            onSave={updates=>{ updateRock(editingRock.columnId,editingRock.id,updates); setEditingRock(null); }}
            onAddCustomTag={addCustomTag}
            onDeleteCustomTag={deleteCustomTag}
            onDuplicate={()=>duplicateRock(editingRock.columnId,editingRock.id)}
          />
        )}
      </DndContext>
    </>
  );
}

// ─── rock component ──────────────────────────────────────────────────────────

function Rock({ rock, columnId, allTags, isViewOnly, editingRockTitle, isDragOverlay, isDraggingParent, overlaySize, dragHandleProps, onEdit, onDelete, onUpdateSize, onStartEditTitle, onSaveTitle, onCancelEditTitle }) {
  const [titleVal,  setTitleVal]  = useState(rock.title);
  const [isPressed, setIsPressed] = useState(false);
  const titleRef = useRef(null);

  const isDone         = columnId==='done';
  const isEditingTitle = editingRockTitle?.columnId===columnId && editingRockTitle?.rockId===rock.id;
  const isEditable     = !isViewOnly && !isDone;
  const displaySize    = isDragOverlay ? (overlaySize||rock.size) : isDone ? SZ.SMALL : rock.size;
  const sizeMin        = { small:'80px', medium:'180px', large:'280px' };

  useEffect(()=>{ if(!isEditingTitle) setTitleVal(rock.title); },[rock.title,isEditingTitle]);
  useEffect(()=>{ if(isEditingTitle&&titleRef.current){ titleRef.current.focus(); titleRef.current.select(); } },[isEditingTitle]);
  // dnd-kit swallows pointerUp once drag activates — clear pressed state via isDraggingParent
  useEffect(()=>{ if(isDraggingParent) setIsPressed(false); },[isDraggingParent]);

  const [descKey,setDescKey]=useState(0);
  const prevSize=useRef(displaySize);
  useEffect(()=>{ if(prevSize.current!==displaySize){ prevSize.current=displaySize; setDescKey(k=>k+1); } },[displaySize]);

  // Attach drag handle directly to the card div — NOT a child overlay div.
  // Only attach when draggable (includes done rocks so they can be restored).
  const draggable = !isViewOnly && !isEditingTitle && !isDragOverlay;
  const dragProps = draggable ? {
    ...dragHandleProps,
    onPointerDown: e => { setIsPressed(true); dragHandleProps?.onPointerDown?.(e); },
    onPointerUp:   () => setIsPressed(false),
    onPointerCancel: () => setIsPressed(false),
  } : {};

  const anim = rock.deleting       ? 'rockDelete 0.3s cubic-bezier(0.4,0,0.2,1) forwards'
    : rock.justCompleted   ? 'rockComplete 0.6s cubic-bezier(0.34,1.56,0.64,1)'
    : rock.justUncompleted ? 'rockUncomplete 0.6s cubic-bezier(0.4,0,0.2,1)'
    : rock.newlyCreated    ? 'rockAppear 0.6s cubic-bezier(0.34,1.56,0.64,1)'
    : 'none';

  return (
    <div
      {...dragProps}
      style={{
        minHeight: sizeMin[displaySize],
        backgroundColor:'#FFF',
        border: (isDragOverlay||isPressed) ? '3px solid #E74C3C' : '3px solid #1A1A1A',
        padding:'20px',
        marginBottom: isDragOverlay?'0':'16px',
        boxShadow: isDragOverlay?'0 20px 48px rgba(0,0,0,0.35)':isPressed?'0 8px 24px rgba(0,0,0,0.18)':'0 2px 8px rgba(0,0,0,0.08)',
        position:'relative', display:'flex', flexDirection:'column',
        opacity: isDone?0.7:1,
        transform: isDragOverlay?'rotate(1.5deg) scale(1.02)':isPressed?'scale(0.98)':'scale(1)',
        transition: isDragOverlay?'none':'border-color 0.1s,box-shadow 0.1s,transform 0.1s',
        cursor: isDragOverlay?'grabbing':isEditingTitle?'default':isPressed?'grabbing':'grab',
        userSelect: isEditingTitle?'text':'none',
        animation: anim,
      }}
    >
      {isEditable && (
        <div style={{ position:'absolute', top:'8px', right:'8px', display:'flex', gap:'4px', zIndex:2 }}>
          {[
            { icon:'⇅', action:e=>{ e.stopPropagation(); const s=[SZ.SMALL,SZ.MEDIUM,SZ.LARGE]; onUpdateSize(s[(s.indexOf(rock.size)+1)%3]); } },
            { icon:'✎', action:e=>{ e.stopPropagation(); onEdit(); } },
            { icon:'×', action:e=>{ e.stopPropagation(); onDelete(); }, danger:true },
          ].map(b=>(
            <button key={b.icon} onClick={b.action}
              style={{ width:'24px', height:'24px', backgroundColor:'rgba(0,0,0,0.1)', border:'none', borderRadius:'2px', cursor:'pointer', fontSize:'12px', zIndex:2 }}
              onMouseEnter={e=>e.target.style.backgroundColor=b.danger?'rgba(231,76,60,0.2)':'rgba(0,0,0,0.2)'}
              onMouseLeave={e=>e.target.style.backgroundColor='rgba(0,0,0,0.1)'}
            >{b.icon}</button>
          ))}
        </div>
      )}

      {isEditingTitle
        ? <input ref={titleRef} type="text" value={titleVal}
            onChange={e=>setTitleVal(e.target.value)}
            onBlur={()=>onSaveTitle(titleVal.trim()||rock.title)}
            onKeyDown={e=>{ e.stopPropagation(); if(e.key==='Enter') onSaveTitle(titleVal.trim()||rock.title); if(e.key==='Escape'){setTitleVal(rock.title);onCancelEditTitle();} }}
            style={{ fontSize:'18px', fontWeight:'900', fontFamily:'"Work Sans",sans-serif', border:'2px solid #1A1A1A', borderRadius:'2px', backgroundColor:'white', padding:'4px 8px', marginBottom:'8px', color:'#1A1A1A', width:'calc(100% - 88px)', boxSizing:'border-box', outline:'none', boxShadow:'0 0 0 3px rgba(231,76,60,0.2)', position:'relative', zIndex:2 }}
          />
        : <h3 onClick={e=>{ if(isEditable){e.stopPropagation();onStartEditTitle();} }}
            style={{ fontSize:'18px', fontWeight:'900', margin:'0 0 8px', color:'#1A1A1A', wordBreak:'break-word', paddingRight:isEditable?'80px':'0', cursor:isEditable?'text':'default', position:'relative', zIndex:2 }}
          >{rock.title}</h3>
      }

      {rock.description && displaySize!==SZ.SMALL && (
        <p key={descKey} style={{ fontSize:'13px', lineHeight:'1.6', margin:'0 0 auto', color:'rgba(26,26,26,0.92)', fontWeight:'500', animation:'descEnter 0.32s ease forwards', position:'relative', zIndex:2 }}>{rock.description}</p>
      )}

      {rock.date && (
        <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(26,26,26,0.6)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:displaySize===SZ.SMALL?'auto':'8px', position:'relative', zIndex:2 }}>{rock.date}</div>
      )}

      {isDone && rock.completedDate && (
        <div style={{ fontSize:'11px', fontWeight:'700', color:'#1E8449', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:'8px', position:'relative', zIndex:2 }}>✓ {rock.completedDate}</div>
      )}

      {rock.tags?.length>0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'12px', position:'relative', zIndex:2 }}>
          {rock.tags.map(name=>{ const t=allTags.find(x=>x.name===name); return t?<span key={name} style={{ backgroundColor:t.color, color:getContrast(t.color), fontSize:'11px', fontWeight:'700', padding:'6px 12px', borderRadius:'2px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{t.name}</span>:null; })}
        </div>
      )}
    </div>
  );
}

// ─── edit modal ──────────────────────────────────────────────────────────────

function RockEditModal({ rock, allTags, onClose, onSave, onAddCustomTag, onDeleteCustomTag, onDuplicate }) {
  const [form,setForm]             = useState({ title:rock.title, description:rock.description||'', size:rock.size, date:rock.date||'', tags:rock.tags||[] });
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor,setNewTagColor]= useState('#C97D60');

  const addTag = () => {
    if (!newTagName.trim()) return;
    onAddCustomTag(newTagName.trim(),newTagColor);
    setForm(p=>({...p,tags:[...p.tags,newTagName.trim()]}));
    setNewTagName('');
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:'24px', animation:'fadeIn 0.2s ease-out' }}>
      <div onClick={e=>e.stopPropagation()} style={{ backgroundColor:'#F0F0F0', border:'2px solid #1A1A1A', padding:'32px', maxWidth:'600px', width:'100%', maxHeight:'80vh', overflow:'auto', animation:'slideUp 0.3s ease-out' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
          <h3 style={{ fontSize:'24px', fontWeight:'900', margin:0, color:'#1A1A1A' }}>Edit Rock</h3>
          <button onClick={()=>{ onDuplicate(); onClose(); }} style={BTN}>Duplicate</button>
        </div>

        {[
          { label:'Title',          key:'title',       type:'input',    inputType:'text',   fs:'16px' },
          { label:'Description',    key:'description', type:'textarea', rows:4,             fs:'14px' },
          { label:'Date (Optional)',key:'date',        type:'input',    inputType:'text',   fs:'14px', placeholder:'Q2 2025' },
        ].map(f=>(
          <div key={f.key} style={{ marginBottom:'16px' }}>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px', color:'#1A1A1A' }}>{f.label}</label>
            {f.type==='textarea'
              ? <textarea value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} rows={f.rows} style={{ width:'100%', padding:'12px', fontSize:f.fs, border:'2px solid #1A1A1A', fontFamily:'"Work Sans",sans-serif', resize:'vertical', boxSizing:'border-box' }} />
              : <input type={f.inputType} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.placeholder} style={{ width:'100%', padding:'12px', fontSize:f.fs, border:'2px solid #1A1A1A', fontFamily:'"Work Sans",sans-serif', boxSizing:'border-box' }} />
            }
          </div>
        ))}

        <div style={{ marginBottom:'24px' }}>
          <label style={{ display:'block', fontSize:'12px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'12px', color:'#1A1A1A' }}>Tags (select multiple)</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px', marginBottom:'16px' }}>
            {allTags.map(tag=>{
              const sel=form.tags.includes(tag.name), isTheme=THEME_TAGS.some(t=>t.name===tag.name);
              return (
                <button key={tag.name}
                  onClick={()=>setForm(p=>({...p,tags:p.tags.includes(tag.name)?p.tags.filter(t=>t!==tag.name):[...p.tags,tag.name]}))}
                  style={{ padding:'12px 16px', backgroundColor:tag.color, color:getContrast(tag.color), border:sel?'3px solid #1A1A1A':'2px solid transparent', borderRadius:'2px', cursor:'pointer', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', fontFamily:'"Work Sans",sans-serif', position:'relative', minHeight:'48px', display:'flex', alignItems:'center', justifyContent:'center' }}
                  onMouseEnter={e=>{ e.target.style.transform='scale(1.02)'; }}
                  onMouseLeave={e=>{ e.target.style.transform='scale(1)'; }}
                >
                  {tag.name}
                  {!isTheme && (
                    <span onClick={e=>{ e.stopPropagation(); onDeleteCustomTag(tag.name); setForm(p=>({...p,tags:p.tags.filter(t=>t!==tag.name)})); }}
                      style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', width:'20px', height:'20px', backgroundColor:'rgba(0,0,0,0.3)', borderRadius:'2px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', cursor:'pointer' }}
                    >×</span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize:'12px', fontWeight:'700', marginBottom:'8px', color:'#1A1A1A', textTransform:'uppercase', letterSpacing:'0.5px' }}>Create New Tag</div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <input type="text" placeholder="Tag name" value={newTagName} onChange={e=>setNewTagName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();addTag();} }} style={{ flex:1, padding:'12px', fontSize:'14px', border:'2px solid #1A1A1A', fontFamily:'"Work Sans",sans-serif' }} />
            <input type="color" value={newTagColor} onChange={e=>setNewTagColor(e.target.value)} style={{ width:'48px', height:'48px', border:'2px solid #1A1A1A', cursor:'pointer', padding:'2px' }} />
            <button onClick={addTag} style={BTN}>Add</button>
          </div>
        </div>

        <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={SBTN}>Cancel</button>
          <button onClick={()=>onSave(form)} style={BTN}>Save</button>
        </div>
      </div>
    </div>
  );
}
