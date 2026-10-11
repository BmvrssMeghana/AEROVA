import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Wind, Droplets, AlertTriangle, Settings, Activity, Play, Pause, Square, Zap, 
  Truck, ShieldAlert, Flame, Clock, Factory, Map as MapIcon, ShieldCheck, 
  ListChecks, History, TrendingDown, TrendingUp, Layers, X, RadioReceiver, 
  BookOpen, Trash2, Crosshair, ArrowRight, Info, HardHat, Radio, Check,
  BarChart2, Shield, Users, Target, ArrowLeft
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

// --- CONFIGURATION ---

const SITE_LOCATIONS = {
  excavation: { id: 'excavation', name: 'Excavation Pit', x: 45, y: 60 },
  haulRoad: { id: 'haulRoad', name: 'Main Haul Road', x: 60, y: 50 },
  stockpile: { id: 'stockpile', name: 'Material Stockpile', x: 30, y: 30 },
  cutting: { id: 'cutting', name: 'Cutting Station', x: 80, y: 30 },
  gate: { id: 'gate', name: 'Site Gate', x: 95, y: 85 },
  residential: { id: 'residential', name: 'Residential Zone', x: 10, y: 10 },
};

const SENSORS = [
  // 24 Internal Sensors
  { id: 'S01', name: 'Excavation Center', x: 45, y: 55, zone: 'Excavation', type: 'internal' },
  { id: 'S02', name: 'Excavation North', x: 45, y: 45, zone: 'Excavation', type: 'internal' },
  { id: 'S03', name: 'Excavation South', x: 45, y: 65, zone: 'Excavation', type: 'internal' },
  { id: 'S04', name: 'Excavation East', x: 55, y: 55, zone: 'Excavation', type: 'internal' },
  { id: 'S05', name: 'Excavation West', x: 35, y: 55, zone: 'Excavation', type: 'internal' },
  { id: 'S06', name: 'Excavation NE', x: 55, y: 45, zone: 'Excavation', type: 'internal' },
  { id: 'S07', name: 'Excavation NW', x: 35, y: 45, zone: 'Excavation', type: 'internal' },
  { id: 'S08', name: 'Excavation SE', x: 55, y: 65, zone: 'Excavation', type: 'internal' },
  { id: 'S09', name: 'Excavation SW', x: 35, y: 65, zone: 'Excavation', type: 'internal' },
  { id: 'S10', name: 'Haul Road North', x: 60, y: 40, zone: 'Transport', type: 'internal' },
  { id: 'S11', name: 'Haul Road Mid', x: 65, y: 50, zone: 'Transport', type: 'internal' },
  { id: 'S12', name: 'Haul Road South', x: 70, y: 65, zone: 'Transport', type: 'internal' },
  { id: 'S13', name: 'Stockpile North', x: 30, y: 30, zone: 'Material', type: 'internal' },
  { id: 'S14', name: 'Stockpile South', x: 30, y: 40, zone: 'Material', type: 'internal' },
  { id: 'S15', name: 'Stockpile East', x: 40, y: 35, zone: 'Material', type: 'internal' },
  { id: 'S16', name: 'Cutting Station', x: 75, y: 30, zone: 'Processing', type: 'internal' },
  { id: 'S17', name: 'Loading Zone', x: 50, y: 70, zone: 'Transport', type: 'internal' },
  { id: 'S18', name: 'Site Gate Internal', x: 85, y: 80, zone: 'Entry', type: 'internal' },
  { id: 'S19', name: 'Enclosure NW', x: 28, y: 28, zone: 'Boundary', type: 'internal' },
  { id: 'S20', name: 'Enclosure NE', x: 78, y: 28, zone: 'Boundary', type: 'internal' },
  { id: 'S21', name: 'Enclosure SW', x: 28, y: 82, zone: 'Boundary', type: 'internal' },
  { id: 'S22', name: 'Enclosure SE', x: 78, y: 82, zone: 'Boundary', type: 'internal' },
  { id: 'S23', name: 'Perimeter West', x: 26, y: 55, zone: 'Boundary', type: 'internal' },
  { id: 'S24', name: 'Perimeter East', x: 80, y: 55, zone: 'Boundary', type: 'internal' },
  // External Receptors (6)
  { id: 'R01', name: 'Residential NW', x: 15, y: 15, zone: 'Receptor', type: 'external' },
  { id: 'R02', name: 'Residential North', x: 50, y: 10, zone: 'Receptor', type: 'external' },
  { id: 'R03', name: 'Residential NE', x: 90, y: 15, zone: 'Receptor', type: 'external' },
  { id: 'R04', name: 'School SW', x: 15, y: 90, zone: 'Receptor', type: 'external' },
  { id: 'R05', name: 'Clinic SE', x: 80, y: 95, zone: 'Receptor', type: 'external' },
  { id: 'R06', name: 'Park West', x: 5, y: 55, zone: 'Receptor', type: 'external' },
  { id: 'HW-ESP32', name: 'ESP32 Telemetry Node', x: 75, y: 50, zone: 'Hardware', type: 'hardware' }
];

const WORKER_PROFILES = [
  { id: 'W01', role: 'Excavator Operator', route: [{x:45,y:55}, {x:48,y:58}, {x:43,y:52}] },
  { id: 'W02', role: 'Spotter', route: [{x:40,y:50}, {x:42,y:45}, {x:38,y:53}] },
  { id: 'W03', role: 'Haul Driver', route: [{x:60,y:50}, {x:70,y:50}, {x:80,y:75}] },
  { id: 'W04', role: 'General Labor', route: [{x:30,y:30}, {x:35,y:35}, {x:28,y:32}] },
  { id: 'W05', role: 'Site Manager', route: [{x:75,y:75}, {x:50,y:75}, {x:40,y:65}] },
  { id: 'W06', role: 'Support Crew', route: [{x:30,y:25}, {x:30,y:45}, {x:45,y:25}] },
  { id: 'W07', role: 'Safety Inspector', route: [{x:78,y:30}, {x:78,y:80}, {x:30,y:80}] },
  { id: 'W08', role: 'Foreman', route: [{x:55,y:55}, {x:50,y:60}, {x:60,y:45}] },
  { id: 'W09', role: 'Mechanic', route: [{x:80,y:75}, {x:75,y:70}, {x:85,y:80}] },
  { id: 'W10', role: 'Surveyor', route: [{x:35,y:75}, {x:45,y:75}, {x:35,y:65}] },
];

const SCENARIOS = [
  { id: 'excavation', name: 'Excavation Pit', x: 45, y: 60, windAngle: 225, windSpeed: 15, intensity: 400, intervention: 'smogGun', interventionName: 'Anti-Smog Gun', reqType: 'smogGun', windDir: 'NW' },
  { id: 'cutting', name: 'Cutting Station', x: 80, y: 30, windAngle: 135, windSpeed: 12, intensity: 300, intervention: 'dryCapture', interventionName: 'HEPA Extractor', reqType: 'dryCapture', windDir: 'SW' },
  { id: 'haulRoad', name: 'Main Haul Road', x: 60, y: 50, windAngle: 0, windSpeed: 18, intensity: 280, intervention: 'sweeping', interventionName: 'Vacuum Sweeping', reqType: 'sweeping', windDir: 'E' }
];

const SERVICES = {
  sweeping: { key: 'sweeping', name: 'Vacuum Sweeping', icon: Truck, provider: 'SweepCo', cost: '£150/hr', type: 'Cleanup', defaultLocation: 'haulRoad', targetZone: 'Main Haul Road' },
  water: { key: 'water', name: 'Water Delivery', icon: Droplets, provider: 'Aqua Logistics', cost: '£80/load', type: 'Supply', defaultLocation: 'gate', targetZone: 'Water Storage Tank' },
  smogGun: { key: 'smogGun', name: 'Anti-Smog Gun', icon: Wind, provider: 'AirClear', cost: '£250/day', type: 'Equipment', defaultLocation: 'excavation', targetZone: 'Excavation Pit' },
  dryCapture: { key: 'dryCapture', name: 'HEPA Extractor', icon: Factory, provider: 'FilterPros', cost: '£300/day', type: 'Equipment', defaultLocation: 'cutting', targetZone: 'Cutting Station' },
  wheelWash: { key: 'wheelWash', name: 'Wheel Wash', icon: ShieldCheck, provider: 'SitePrep Ltd', cost: '£400/wk', type: 'Equipment', defaultLocation: 'gate', targetZone: 'Perimeter Site Gate' },
  filterMaint: { key: 'filterMaint', name: 'Filter Replace', icon: Settings, provider: 'FilterPros', cost: '£120/unit', type: 'Maintenance', defaultLocation: 'cutting', targetZone: 'Cutting Extraction' }
};

// --- HELPER PHYSICS ---
const getPollutionAt = (px, py, sources, wind) => {
  let pm10 = 20; 
  const windRad = wind.angle * Math.PI / 180;
  const wx = Math.cos(windRad);
  const wy = Math.sin(windRad);

  sources.forEach(s => {
    const dx = px - s.x;
    const dy = py - s.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const dot = (dx * wx + dy * wy) / dist; 
    const windMult = dot > 0 ? (1 + dot * 2) : (1 / (1 - dot * 1.5));
    pm10 += (s.intensity * windMult) / (1 + Math.pow(dist / 8, 2));
  });
  return pm10;
};

// --- MAP OVERLAYS ---

const CanvasHeatmap = ({ sources, wind, isVisible }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 1920; 
    const height = 1080;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    if (!isVisible || sources.length === 0) return;
    ctx.globalCompositeOperation = 'screen';
    
    const windRad = wind.angle * Math.PI / 180;
    const wx = Math.cos(windRad);
    const wy = Math.sin(windRad);

    sources.forEach(s => {
      for(let i=0; i<6; i++) {
         const intensity = s.intensity * Math.pow(0.7, i); 
         if (intensity < 10) continue;
         
         const cx = (s.x / 100) * width + (wx * i * width * 0.05 * (wind.speed/10));
         const cy = (s.y / 100) * height + (wy * i * height * 0.05 * (wind.speed/10));
         
         const radius = Math.min(width * 0.4, Math.max(100, intensity * 1.5));
         const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
         
         let color;
         if (intensity > 200) color = 'rgba(239, 68, 68, 0.5)';
         else if (intensity > 120) color = 'rgba(249, 115, 22, 0.4)';
         else if (intensity > 60) color = 'rgba(234, 179, 8, 0.2)';
         else color = 'rgba(34, 197, 94, 0.1)';
         
         gradient.addColorStop(0, color);
         gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
         ctx.fillStyle = gradient;
         ctx.fillRect(0, 0, width, height);
      }
    });
  }, [sources, wind, isVisible]);

  return <canvas ref={canvasRef} className={cn("absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-1000", isVisible ? "opacity-85" : "opacity-0")} />;
};

const BoundaryOverlay = ({ isVisible, isLeakageActive }) => {
  if (!isVisible) return null;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="leakage-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points="10,95 20,20 85,5 95,80 60,95" fill="rgba(34,197,94,0.03)" stroke="rgba(34,197,94,0.5)" strokeWidth="2" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
      <text x="12" y="93" fill="rgba(34,197,94,0.6)" fontSize="1" fontWeight="bold">SITE BOUNDARY</text>
      {isLeakageActive && (
        <g>
          <circle cx="25" cy="40" r="10" fill="url(#leakage-grad)" className="animate-pulse" />
          <polyline points="20,20 25,40" stroke="#ef4444" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </g>
      )}
    </svg>
  );
};

const WindOverlay = ({ isVisible, wind, windDirStr, isHardwareMode, envData }) => {
  if (!isVisible) return null;
  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-10" preserveAspectRatio="none">
        <path d="M 95% 85% Q 75% 65% 35% 25%" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="30 150" className="animate-[windflow_6s_linear_infinite]" />
        <path d="M 85% 95% Q 60% 55% 15% 10%" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="50 180" className="animate-[windflow_5s_linear_infinite]" style={{ animationDelay: '-1s' }} />
        <path d="M 100% 75% Q 65% 35% 25% 5%" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="20 100" className="animate-[windflow_7s_linear_infinite]" style={{ animationDelay: '-3s' }} />
      </svg>
      <div className="absolute top-6 left-6 z-30 bg-[#0f172a]/95 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 shadow-2xl flex flex-col gap-2 w-44">
         <div className="flex items-center gap-4">
           <div className="relative w-10 h-10 rounded-full border-2 border-slate-700 flex items-center justify-center bg-[#020617] shadow-inner shrink-0">
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center transition-transform duration-1000" style={{ transform: `rotate(${wind.angle}deg)` }}>
                 <ArrowRight className="w-4 h-4 text-sky-400 translate-x-2" />
              </div>
           </div>
           <div className="flex flex-col">
              <div className="text-xs font-black text-white tracking-widest uppercase flex items-center gap-1.5"><span>{windDirStr}</span><span className="text-slate-500">·</span><span className="text-sky-400">{wind.speed}<span className="text-[9px] text-sky-500 ml-0.5">km/h</span></span></div>
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">{isHardwareMode ? 'Live Vector' : 'Sim. Vector'}</div>
           </div>
         </div>
         {isHardwareMode && envData && (
           <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
             <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500"/> {envData.temp}°C</div>
             <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-500"/> {envData.hum}% RH</div>
           </div>
         )}
      </div>
    </>
  );
};


// ------------------------------------------------------------------
// Main App Component
// ------------------------------------------------------------------

export default function App() {
  const [simulationState, setSimulationState] = useState('idle');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStage, setDemoStage] = useState(0); 
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  
  // Hardware Mode State
  const [hardwareMode, setHardwareMode] = useState(false);
  const [hardwareStatus, setHardwareStatus] = useState('WAITING FOR DATA');
  const [hardwareData, setHardwareData] = useState(null);
  
  // Physics State
  const [dustSources, setDustSources] = useState([]);
  const [wind, setWind] = useState({ angle: 225, speed: 15 });
  const [sensors, setSensors] = useState({});
  const [workers, setWorkers] = useState(WORKER_PROFILES.map(w => ({ ...w, pos: {...w.route[0]}, targetIdx: 1, pm10: 20, pm25: 10, status: 'normal' })));
  const [vehicles, setVehicles] = useState([]);
  
  // Logistics State
  const [waterTank, setWaterTank] = useState(85);
  const [interventionsCount, setInterventionsCount] = useState(0);
  const [downwindExposure, setDownwindExposure] = useState(false);
  
  const [requests, setRequests] = useState(() => {
    try { 
      const saved = localStorage.getItem('dustgrid_requests'); 
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map(r => r.status !== 'COMPLETED' ? { ...r, status: 'COMPLETED' } : r);
      }
      return []; 
    } catch (e) { return []; }
  });
  const [eventLog, setEventLog] = useState([]);
  const demoTimers = useRef([]);
  const demoIntervals = useRef([]);

  const setDemoTimer = useCallback((callback, ms) => {
     const ticks = Math.max(1, Math.round(ms / 200));
     demoTimers.current.push({ callback, ticksRemaining: ticks });
  }, []);

  const setDemoInterval = useCallback((callback, ms) => {
     const ticks = Math.max(1, Math.round(ms / 200));
     const id = Math.random();
     demoIntervals.current.push({ id, callback, intervalTicks: ticks, ticksRemaining: ticks });
     return id;
  }, []);

  const clearDemoInterval = useCallback((id) => {
     demoIntervals.current = demoIntervals.current.filter(t => t.id !== id);
  }, []);

  // UI State
  const [mapLayers, setMapLayers] = useState({ heatmap: true, sensors: true, workers: true, services: true, wind: true });
  const [selectedSensorId, setSelectedSensorId] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [showCatalogue, setShowCatalogue] = useState(false);
  
  const [trendData, setTrendData] = useState([]);
  const [peakPm10, setPeakPm10] = useState(32);
  const [initialRisk, setInitialRisk] = useState(25);
  const [activeInterventionName, setActiveInterventionName] = useState('None');

  const logEndRef = useRef(null);

  // Derived Metrics
  const peakNetworkPm10 = useMemo(() => {
    let max = 20;
    Object.values(sensors).forEach(s => { if(s.pm10 > max) max = s.pm10; });
    return max;
  }, [sensors]);
  
  const overallRisk = useMemo(() => Math.min(100, (peakNetworkPm10 / 200) * 100), [peakNetworkPm10]);

  useEffect(() => { localStorage.setItem('dustgrid_requests', JSON.stringify(requests)); }, [requests]);
  useEffect(() => { if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [eventLog]);
  useEffect(() => { if (peakNetworkPm10 > peakPm10) setPeakPm10(peakNetworkPm10); }, [peakNetworkPm10, peakPm10]);

  const addLog = useCallback((msg, type = 'info') => {
    setEventLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  }, []);

  const hardwareDataRef = useRef(null);
  useEffect(() => { hardwareDataRef.current = hardwareData; }, [hardwareData]);

  // --- TELEMETRY POLLING ---
  useEffect(() => {
    let timeoutId;
    const pollTelemetry = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/telemetry');
        if (res.status === 202) {
           if (hardwareStatus !== 'CONNECTED' && hardwareStatus !== 'STALE DATA') {
             setHardwareStatus('WAITING FOR DATA');
           }
        } else if (res.ok) {
           const json = await res.json();
           const data = json.data;
           setHardwareData(data);
           
           const receivedAt = new Date(data.received_at).getTime();
           const now = Date.now();
           if (now - receivedAt > 10000) {
             setHardwareStatus('STALE DATA');
           } else {
             setHardwareStatus('CONNECTED');
             setHardwareMode(true);
           }
        } else {
           setHardwareStatus('DISCONNECTED');
        }
      } catch (e) {
        setHardwareStatus('DISCONNECTED');
      }
      timeoutId = setTimeout(pollTelemetry, 1000);
    };
    pollTelemetry();
    return () => clearTimeout(timeoutId);
  }, [hardwareStatus]);

  // --- PHYSICS ENGINE TICK ---
  useEffect(() => {
    if (simulationState !== 'running') return;
    
    const tick = setInterval(() => {
      
      // Calculate Environmental Sensors
      setSensors(prev => {
        const next = {};
        SENSORS.forEach(s => {
          let p10 = getPollutionAt(s.x, s.y, dustSources, wind) + (Math.random()*4-2);
          if (p10 < 10) p10 = Math.max(0, p10 + (Math.random()-0.5));
          let p25 = p10 * 0.5 + (Math.random()*2-1);
          
          if (s.id === 'HW-ESP32' && hardwareDataRef.current) {
             p10 = hardwareDataRef.current.pm10_ugm3 || p10;
             p25 = hardwareDataRef.current.pm25_ugm3 || p25;
          }
          
          const status = p10 > 120 ? 'critical' : p10 > 70 ? 'warning' : 'normal';
          
          const hist = prev[s.id]?.history || Array(15).fill(p10);
          const newHist = [...hist, p10];
          if (newHist.length > 15) newHist.shift();
          
          next[s.id] = { pm10: p10, pm25: p25, status, history: newHist };
        });
        return next;
      });

      // Move & Calculate Workers
      setWorkers(prev => prev.map(w => {
        const t = w.route[w.targetIdx];
        const dx = t.x - w.pos.x;
        const dy = t.y - w.pos.y;
        const dist = Math.hypot(dx, dy);
        const speed = 0.5;
        let newPos = { ...w.pos };
        let newIdx = w.targetIdx;
        
        if (dist < speed) {
          newPos = { x: t.x, y: t.y };
          newIdx = (w.targetIdx + 1) % w.route.length;
        } else {
          newPos = { x: w.pos.x + (dx/dist)*speed, y: w.pos.y + (dy/dist)*speed };
        }
        
        const p10 = getPollutionAt(newPos.x, newPos.y, dustSources, wind) + (Math.random()*6-3);
        const p25 = p10 * 0.5;
        const status = p10 > 120 ? 'critical' : p10 > 70 ? 'warning' : 'normal';

        const hist = w.history || Array(15).fill(p10);
        const newHist = [...hist, p10];
        if (newHist.length > 15) newHist.shift();

        return { 
           ...w, pos: newPos, targetIdx: newIdx, 
           pm10: p10, pm25: p25, 
           status, history: newHist 
        };
      }));

      // Move Vehicles
      setVehicles(prev => {
        return prev.map(v => {
          if (v.status !== 'moving' && v.status !== 'returning') return v;
          if (v.targetIdx >= v.route.length) return { ...v, status: v.status === 'returning' ? 'returned' : 'arrived' };
          
          const t = v.route[v.targetIdx];
          const dx = t.x - v.pos.x;
          const dy = t.y - v.pos.y;
          const dist = Math.hypot(dx, dy);
          const speed = 1.2;
          
          if (dist < speed) {
            if (v.targetIdx === v.route.length - 1) return { ...v, pos: { x: t.x, y: t.y }, status: v.status === 'returning' ? 'returned' : 'arrived' };
            return { ...v, pos: { x: t.x, y: t.y }, targetIdx: v.targetIdx + 1 };
          }
          return { ...v, pos: { x: v.pos.x + (dx/dist)*speed, y: v.pos.y + (dy/dist)*speed } };
        });
      });

      // Process Coordinated Timers
      demoTimers.current.forEach(t => {
         t.ticksRemaining -= 1;
         if (t.ticksRemaining <= 0) {
            t.callback();
            t.done = true;
         }
      });
      demoTimers.current = demoTimers.current.filter(t => !t.done);

      demoIntervals.current.forEach(t => {
         t.ticksRemaining -= 1;
         if (t.ticksRemaining <= 0) {
            t.callback();
            t.ticksRemaining = t.intervalTicks;
         }
      });

    }, 200); // 5 FPS physics, relies on CSS transition for 60FPS UI interpolation
    
    return () => clearInterval(tick);
  }, [simulationState, dustSources, wind]);

  const peakNetworkPm10Ref = useRef(20);
  useEffect(() => { peakNetworkPm10Ref.current = peakNetworkPm10; }, [peakNetworkPm10]);

  // --- CHART DATA TICK ---
  const lastHardwareTimeRef = useRef(0);
  const simulationStateRef = useRef(simulationState);
  useEffect(() => { simulationStateRef.current = simulationState; }, [simulationState]);
  
  useEffect(() => {
    setTrendData(prev => {
      if (prev.length > 0) return prev;
      const hist = [];
      const now = new Date();
      for (let i = 59; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 1000);
        hist.push({
          time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          pm10: 20 + (Math.random() * 2),
          pm25: 10 + Math.random()
        });
      }
      return hist;
    });

    const chartTick = setInterval(() => {
      setTrendData(prev => {
        const isPaused = simulationStateRef.current === 'paused';
        if (isPaused && !hardwareMode) return prev;

        let p10 = 0, p25 = 0;
        const now = new Date();
        
        if (hardwareMode && hardwareDataRef.current) {
           const hwTime = new Date(hardwareDataRef.current.received_at).getTime();
           if (hwTime === lastHardwareTimeRef.current && prev.length > 0) {
             return prev;
           }
           lastHardwareTimeRef.current = hwTime;
           p10 = hardwareDataRef.current.pm10_ugm3 || 0;
           p25 = hardwareDataRef.current.pm25_ugm3 || 0;
        } else {
           p10 = peakNetworkPm10Ref.current;
           p25 = p10 * 0.5;
        }
        
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const next = [...prev, { time: timeStr, pm10: p10, pm25: p25 }];
        if (next.length > 60) return next.slice(next.length - 60);
        return next;
      });
    }, 1000);
    return () => clearInterval(chartTick);
  }, [hardwareMode]);

  // --- SERVICE DISPATCH LIFECYCLE ---
  const advanceRequestStatus = (id, targetStatus) => {
    setRequests(prev => {
      let dispatchEvent = null;
      let targetReq = null;
      const next = prev.map(r => {
        if (r.id !== id) return r;
        if (targetStatus === 'ACCEPTED' && r.status === 'REQUESTED') { addLog(`Request ${id} ACCEPTED by ${r.vendor}`, 'success'); return { ...r, status: 'ACCEPTED' }; }
        if (targetStatus === 'DISPATCHED' && r.status === 'ACCEPTED') { 
            addLog(`Request ${id} DISPATCHED. Entering site.`, 'info'); 
            dispatchEvent = r;
            return { ...r, status: 'ENTERING SITE' }; 
        }
        if (targetStatus === 'ACTIVE' && r.status === 'ARRIVED') {
            addLog(`Intervention ${id} (${r.name}) is ACTIVE at ${r.location}.`, 'success');
            setActiveInterventionName(r.name);
            setInterventionsCount(p => p + 1);

            // Execute physical operational mitigation
            if (r.serviceKey === 'water') {
               setWaterTank(w => Math.min(100, w + 35));
               addLog(`Water reserves refilled (+35%). Site storage replenished.`, 'success');
            } else if (r.serviceKey === 'smogGun' || r.serviceKey === 'dryCapture' || r.serviceKey === 'sweeping') {
               setDustSources(prev => prev.map(s => ({ ...s, intensity: Math.max(0, s.intensity - 180) })));
               addLog(`Particulate suppression active: Dust plume reduced by 180 µg/m³.`, 'success');
            } else if (r.serviceKey === 'wheelWash') {
               addLog(`Wheel wash active: Track-out mitigation operational at perimeter gate.`, 'success');
            } else if (r.serviceKey === 'filterMaint') {
               addLog(`HEPA filtration serviced: 99.97% particulate capture efficiency certified.`, 'success');
            }

            targetReq = { ...r, status: 'ACTIVE' };
            return targetReq;
        }
        if (targetStatus === 'COMPLETED' && r.status === 'ACTIVE') {
            addLog(`Service ${id} COMPLETED. Vehicle returning to base.`, 'success');
            setVehicles(vPrev => vPrev.map(veh => {
               if (veh.reqId === id) {
                  const returnRoute = [...veh.route].reverse();
                  return { ...veh, route: returnRoute, targetIdx: 1, status: 'returning', prevStatus: 'returning' };
               }
               return veh;
            }));
            return { ...r, status: 'RETURNING' };
        }
        return r; 
      });

      if (dispatchEvent) {
         const routeMap = {
            'Excavation Pit': [{x:95,y:95}, {x:75,y:75}, {x:65,y:45}, {x:45,y:60}],
            'Main Haul Road': [{x:95,y:95}, {x:75,y:75}, {x:65,y:45}, {x:60,y:50}],
            'Material Stockpile': [{x:95,y:95}, {x:75,y:75}, {x:65,y:45}, {x:45,y:35}, {x:30,y:30}],
            'Cutting Station': [{x:95,y:95}, {x:85,y:75}, {x:80,y:60}, {x:80,y:30}],
            'Site Gate': [{x:95,y:95}, {x:95,y:85}],
            'Residential Zone': [{x:95,y:95}, {x:60,y:60}, {x:35,y:35}, {x:10,y:10}],
         };
         const route = routeMap[dispatchEvent.location] || [{x:95, y:95}, {x: 45, y: 60}];
         setVehicles(v => {
            if (v.some(veh => veh.reqId === dispatchEvent.id)) return v;
            return [...v, { 
               id: `veh-${dispatchEvent.id}`, reqId: dispatchEvent.id, serviceKey: dispatchEvent.serviceKey, 
               pos: {x: 95, y: 95}, route, targetIdx: 1, status: 'moving', prevStatus: 'moving' 
            }];
         });
      }
      return next;
    });
  };

  const addRequest = (serviceKey, locationId, priority = 'Medium', triggerReason) => {
    const service = SERVICES[serviceKey];
    if (!service) return false;
    const targetLocId = locationId || service.defaultLocation || 'excavation';
    const locName = SITE_LOCATIONS[targetLocId]?.name || targetLocId;

    if (requests.some(r => r.serviceKey === serviceKey && r.location === locName && r.status !== 'COMPLETED' && r.status !== 'RETURNING')) {
      addLog(`Notice: [${service.name}] is already active or en route to ${locName}.`, 'warning');
      return false;
    }

    // Auto-start simulation if idle so timers & vehicle motion engage immediately
    if (simulationStateRef.current !== 'running') {
      setSimulationState('running');
      addLog('Simulation engine engaged for service dispatch.', 'info');
    }

    // Spawn localized dust plume if suppressing and no plume is active
    if ((serviceKey === 'smogGun' || serviceKey === 'dryCapture' || serviceKey === 'sweeping') && dustSources.length === 0) {
      const loc = SITE_LOCATIONS[targetLocId] || SITE_LOCATIONS.excavation;
      setDustSources([{ id: `plume-${Date.now()}`, x: loc.x, y: loc.y, intensity: 250 }]);
      addLog(`Localized particulate surge detected at ${locName}. Dispatched rapid mitigation.`, 'warning');
    }

    // Lower water level if simulating water delivery when tank is full, so user sees refill
    if (serviceKey === 'water' && waterTank > 70) {
      setWaterTank(45);
    }

    const newId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReq = { 
      id: newId, 
      serviceKey, 
      name: service.name, 
      type: service.type, 
      location: locName, 
      vendor: service.provider, 
      cost: service.cost, 
      priority, 
      status: 'REQUESTED', 
      reason: triggerReason || `Catalogue dispatch: ${service.name}`, 
      createdAt: Date.now() 
    };
    setRequests(prev => [newReq, ...prev]);
    addLog(`System generated Service Request [${newId}] for ${service.name} at ${locName}.`, 'info');

    setDemoTimer(() => advanceRequestStatus(newId, 'ACCEPTED'), 1500);
    setDemoTimer(() => advanceRequestStatus(newId, 'DISPATCHED'), 3500);
    return true;
  };

  // Listen for vehicle arrivals to complete requests
  useEffect(() => {
    const hasStatusChange = vehicles.some(v => (v.status === 'arrived' && v.prevStatus !== 'arrived') || (v.status === 'returned' && v.prevStatus !== 'returned'));
    if (!hasStatusChange) return;
    
    setVehicles(prev => {
      let shouldFilter = false;
      const nextVehs = prev.map(v => {
        if (v.status === 'arrived' && v.prevStatus !== 'arrived') {
          setRequests(reqs => reqs.map(r => {
            if (r.id === v.reqId && r.status === 'ENTERING SITE') {
              addLog(`Service ${r.id} ARRIVED on site.`, 'success');
              
              setDemoTimer(() => advanceRequestStatus(r.id, 'ACTIVE'), 2000);
              setDemoTimer(() => advanceRequestStatus(r.id, 'COMPLETED'), 12000);
              
              return { ...r, status: 'ARRIVED' };
            }
            return r;
          }));
          return { ...v, prevStatus: 'arrived' };
        }
        
        if (v.status === 'returned' && v.prevStatus !== 'returned') {
           shouldFilter = true;
           setRequests(reqs => reqs.map(r => {
              if (r.id === v.reqId && r.status === 'RETURNING') {
                 addLog(`Service ${r.id} has RETURNED to gate. Request complete.`, 'info');
                 return { ...r, status: 'COMPLETED' };
              }
              return r;
           }));
           return { ...v, prevStatus: 'returned' };
        }
        return v;
      });
      return shouldFilter ? nextVehs.filter(v => v.status !== 'returned') : nextVehs;
    });
  }, [vehicles, addLog]);

  useEffect(() => {
     if (isDemoMode && demoStage === 5) {
         if (requests.some(r => r.status === 'ACTIVE')) {
             setDemoStage(6);
         }
     }
  }, [requests, isDemoMode, demoStage]);

  const overallRiskRef = useRef(overallRisk);
  useEffect(() => { overallRiskRef.current = overallRisk; }, [overallRisk]);

  // --- HARDWARE RULES ENGINE ---
  useEffect(() => {
    if (!hardwareMode || simulationState !== 'running' || isDemoMode) return;
    if (!hardwareDataRef.current) return;
    
    const hwData = hardwareDataRef.current;
    
    // Low tank level: request water
    if (hwData.tank_level_pct !== undefined && hwData.tank_level_pct < 20) {
      addRequest('water', 'gate', 'High', 'Hardware telemetry: Low tank level detected');
    }
    
    // High dust logic
    if (hwData.pm10_ugm3 > 100) {
      if (hwData.activity === 'excavation') {
         addRequest('smogGun', 'excavation', 'Urgent', 'Hardware telemetry: High dust at excavation');
      } else if (hwData.activity === 'cutting') {
         addRequest('dryCapture', 'cutting', 'Urgent', 'Hardware telemetry: High dust at cutting station');
      } else {
         addRequest('sweeping', 'haulRoad', 'Medium', 'Hardware telemetry: High dust detected');
      }
    }

    // Downwind risk
    if (hwData.wind_speed_kmh > 20 && hwData.pm10_ugm3 > 80) {
      if (!downwindExposure) {
         setDownwindExposure(true);
         addLog('Hardware telemetry: High wind causing downwind exposure risk', 'warning');
      }
    } else {
      if (downwindExposure) setDownwindExposure(false);
    }
    
  }, [hardwareData, hardwareMode, simulationState, isDemoMode, downwindExposure, addLog]);

  // --- DEMO STORYTELLING SCRIPT ---
  const gradualIntervalRef = useRef(null);
  useEffect(() => {
    if (!isDemoMode) return;
    const scen = activeScenario;
    
    const runDemoStage = () => {
      switch (demoStage) {
        case 1:
          addLog(`${scen.name} activity initiating.`, 'info');
          setDemoTimer(() => setDemoStage(2), 3000); 
          break;
        case 2:
          setInitialRisk(overallRiskRef.current);
          setDustSources([{ id: scen.id, x: scen.x, y: scen.y, intensity: 0 }]);
          
          const closestSensor = SENSORS.reduce((prev, curr) => {
             const d1 = Math.hypot(curr.x - scen.x, curr.y - scen.y);
             const d2 = Math.hypot(prev.x - scen.x, prev.y - scen.y);
             return d1 < d2 ? curr : prev;
          });
          setSelectedSensorId(closestSensor.id);
          
          addLog(`CRITICAL: Dust spike detected at ${scen.name}.`, 'critical');
          
          let growTicks = 0;
          gradualIntervalRef.current = setDemoInterval(() => {
             growTicks++;
             setDustSources(prev => prev.map(s => ({ ...s, intensity: Math.min(scen.intensity, s.intensity + (scen.intensity/10)) })));
             if (growTicks >= 10) {
                 clearDemoInterval(gradualIntervalRef.current);
                 setDemoStage(3);
             }
          }, 350); 
          break;
        case 3:
          setDownwindExposure(true);
          addLog(`WARNING: Wind dispersing plume ${scen.windDir}. Downwind exposure increasing.`, 'warning');
          setDemoTimer(() => setDemoStage(4), 4500); 
          break;
        case 4:
          addLog(`Rules Engine: ${scen.interventionName} selected for rapid suppression.`, 'info');
          setDemoTimer(() => setDemoStage(5), 3000); 
          break;
        case 5:
          const locKey = Object.keys(SITE_LOCATIONS).find(k => SITE_LOCATIONS[k].name === scen.name) || 'excavation';
          addRequest(scen.reqType, locKey, 'Urgent', `Automated trigger from ${scen.name} spike`);
          break;
        case 6:
          setActiveInterventionName(scen.interventionName);
          setInterventionsCount(p => p + 1);
          if (scen.reqType === 'water') setWaterTank(25);
          
          let ticks = 0;
          gradualIntervalRef.current = setDemoInterval(() => {
            ticks++;
            setDustSources(prev => prev.map(s => ({ ...s, intensity: Math.max(0, s.intensity - 25) })));
            if (ticks >= 15) {
              clearDemoInterval(gradualIntervalRef.current);
              setDownwindExposure(false);
              addLog(`Sensors confirm PM10 reduced. Compliance restored.`, 'success');
              setDemoStage(7);
            }
          }, 400); 
          break;
        case 7:
          addLog('Demo workflow completed. System nominal.', 'info');
          setDemoTimer(() => { 
             setDustSources([]); setSimulationState('idle'); setIsDemoMode(false); 
          }, 8000); 
          break;
      }
    };
    runDemoStage();
  }, [demoStage, isDemoMode, activeScenario, addLog, setDemoTimer, setDemoInterval, clearDemoInterval]);

  const resetSimulation = () => {
    setSimulationState('idle'); setIsDemoMode(false); setDemoStage(0);
    demoTimers.current = [];
    demoIntervals.current = [];
    
    setDustSources([]); setVehicles([]); setRequests([]);
    const initialHist = [];
    const now = new Date();
    for (let i = 59; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 1000);
      initialHist.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        pm10: 20 + (Math.random() * 2),
        pm25: 10 + Math.random()
      });
    }
    setTrendData(initialHist);
    setPeakPm10(25); setInitialRisk(25); setActiveInterventionName('None');
    setDownwindExposure(false); setEventLog([]); setSelectedSensorId(null); setSelectedWorkerId(null);
    setWorkers(WORKER_PROFILES.map(w => ({ ...w, pos: {...w.route[0]}, targetIdx: 1, pm10: 20, pm25: 10, status: 'normal' })));
  };

  const runLiveDemo = () => {
    const nextScen = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    setActiveScenario(nextScen);
    resetSimulation();
    setWind({ angle: nextScen.windAngle, speed: nextScen.windSpeed });
    setTimeout(() => { setIsDemoMode(true); setSimulationState('running'); setDemoStage(1); }, 100);
  };
  
  const clearAllRequests = () => { setRequests([]); addLog('Service history cleared.', 'info'); };

  // --- UI RENDER HELPERS ---
  const getRiskColor = (val) => val < 40 ? 'text-green-400' : val < 70 ? 'text-amber-400' : 'text-red-500';
  const getRiskBgColor = (val) => val < 40 ? 'bg-green-500/10 border-green-500/20' : val < 70 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  const pm10Reduction = peakPm10 > 0 ? Math.max(0, ((peakPm10 - peakNetworkPm10) / peakPm10) * 100).toFixed(0) : 0;
  
  const getProgressWidth = (status) => {
    switch (status) {
      case 'REQUESTED': return 'w-1/6 bg-amber-500';
      case 'ACCEPTED': return 'w-2/6 bg-blue-400';
      case 'DISPATCHED':
      case 'ENTERING SITE': return 'w-3/6 bg-blue-500';
      case 'ARRIVED': return 'w-4/6 bg-indigo-400';
      case 'ACTIVE': return 'w-5/6 bg-indigo-500';
      case 'RETURNING': return 'w-11/12 bg-green-400';
      case 'COMPLETED': return 'w-full bg-green-500';
      default: return 'w-0';
    }
  };

  const demoStory = {
    0: { title: "SYSTEM IDLE", source: "N/A", why: "Sensors and wearables report normal conditions.", action: "Monitoring", next: "Press RUN LIVE DEMO to observe automated dust mitigation." },
    1: { title: "ACTIVITY DETECTED", source: activeScenario.name, why: "Operations initiating at zone.", action: "Monitoring", next: "Sensors are tracking particulate matter generation." },
    2: { title: "DUST DETECTED", source: activeScenario.name, why: "Activity is generating heavy airborne particles.", action: "Analyzing Risk", next: "AEROVA is evaluating worker exposure and wind drift." },
    3: { title: "EXPOSURE WARNING", source: "Downwind Area", why: "Wind is pushing particulate plume toward sensitive receptors.", action: "Safety Response", next: "Alerting supervisor. Selecting localized control." },
    4: { title: "CONTROL SELECTED", source: activeScenario.name, why: "Rapid suppression required to protect workers and compliance.", action: activeScenario.interventionName, next: "Dispatching service equipment to zone." },
    5: { title: "VENDOR DISPATCHED", source: "Site Gate", why: "Service requested and vendor accepted job.", action: "Awaiting Arrival", next: "Vehicle is en route to affected zone." },
    6: { title: "CONTROL ACTIVATED", source: activeScenario.name, why: "Equipment has arrived and is actively suppressing the dust plume.", action: "Active Suppression", next: "Awaiting sensor confirmation of PM10 reduction." },
    7: { title: "RESULT ACHIEVED", source: "All Zones", why: "Environmental compliance and worker safety restored.", action: "Nominal", next: "System returning to idle monitoring state." }
  };
  const story = demoStory[demoStage] || demoStory[0];
  
  const selectedSensor = SENSORS.find(s => s.id === selectedSensorId);
  const selectedSensorData = selectedSensor ? sensors[selectedSensor.id] : null;
  const selectedWorker = workers.find(w => w.id === selectedWorkerId);
  
  const networkStats = useMemo(() => {
    let norm = 0, warn = 0, crit = 0;
    Object.values(sensors).forEach(s => { if(s.status==='critical') crit++; else if(s.status==='warning') warn++; else norm++; });
    return { norm, warn, crit, total: Object.keys(sensors).length };
  }, [sensors]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30">
      
      {/* A. TOP NAVIGATION */}
      <header className="h-[60px] bg-[#020617] border-b border-slate-800 flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600/20 border border-blue-500/50 p-1.5 rounded-md"><Wind className="text-blue-400 w-5 h-5" /></div>
          <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase">AER<span className="text-blue-500">OVA</span></h1>
          <span className="ml-2 text-[10px] uppercase font-black tracking-widest text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full hidden sm:block">GIS Operations Center</span>
          <span className={cn("ml-2 text-[10px] uppercase font-black tracking-widest border px-2 py-0.5 rounded-full flex items-center gap-1.5", hardwareMode ? "text-purple-400 bg-purple-900/30 border-purple-800/50" : "text-blue-400 bg-blue-900/30 border-blue-800/50")}>
             <Activity className={cn("w-3 h-3", simulationState === 'running' && "animate-pulse")} /> {hardwareMode ? 'HARDWARE MODE' : 'SIMULATION MODE'}
          </span>
          <span className={cn("ml-2 text-[10px] uppercase font-black tracking-widest border px-2 py-0.5 rounded-full flex items-center gap-1.5 hidden sm:flex", 
              hardwareStatus === 'CONNECTED' ? 'text-green-400 bg-green-900/30 border-green-800/50' :
              hardwareStatus === 'STALE DATA' ? 'text-amber-400 bg-amber-900/30 border-amber-800/50' :
              hardwareStatus === 'DISCONNECTED' ? 'text-red-400 bg-red-900/30 border-red-800/50' :
              'text-slate-400 bg-slate-900/30 border-slate-800/50'
          )}>
             <Radio className={cn("w-3 h-3", hardwareStatus === 'CONNECTED' && "animate-pulse")} /> {hardwareStatus}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowCatalogue(true)} className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded border border-slate-700 flex items-center gap-2 transition-colors">
            <BookOpen className="w-3.5 h-3.5" /> Catalogue
          </button>
          <div className="flex bg-[#0f172a] rounded p-1 border border-slate-800">
            <button onClick={() => { if (!isDemoMode) setSimulationState('running'); }} disabled={isDemoMode} className={cn("px-4 py-1.5 rounded-sm flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors", simulationState === 'running' && !isDemoMode ? "bg-green-500/20 text-green-400" : "text-slate-500 hover:text-white")}><Play className="w-3.5 h-3.5" /> Start</button>
            <button onClick={() => { if (!isDemoMode) setSimulationState('paused'); }} disabled={isDemoMode} className={cn("px-4 py-1.5 rounded-sm flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors", simulationState === 'paused' && !isDemoMode ? "bg-amber-500/20 text-amber-400" : "text-slate-500 hover:text-white")}><Pause className="w-3.5 h-3.5" /> Pause</button>
            <button onClick={resetSimulation} className="px-4 py-1.5 rounded-sm flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"><Square className="w-3.5 h-3.5" /> Reset</button>
          </div>
          <button onClick={runLiveDemo} disabled={isDemoMode} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-2 disabled:opacity-50 transition-colors">
            <Zap className={cn("w-4 h-4", isDemoMode && "animate-pulse")} /> {isDemoMode ? `DEMO (${demoStage}/7)` : 'RUN LIVE DEMO'}
          </button>
        </div>
      </header>

      {/* B. TOP KPI STRIP */}
      <div className="h-[90px] flex gap-4 px-6 py-3 border-b border-slate-800 shrink-0 bg-[#090f1e]/80">
        <div className={cn("flex-1 rounded-lg border flex items-center justify-between p-4 transition-colors", getRiskBgColor(overallRisk))}>
           <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Overall Dust Risk</div>
              <div className="flex items-baseline gap-2">
                 <span className={cn("text-3xl font-black", getRiskColor(overallRisk))}>{overallRisk.toFixed(0)}</span>
                 <span className="text-xs text-slate-500 font-bold uppercase">/ 100</span>
              </div>
           </div>
           <Shield className={cn("w-8 h-8 opacity-50", getRiskColor(overallRisk))} />
        </div>

        <div className="flex-1 bg-[#020617] rounded-lg border border-slate-800 flex items-center p-4">
           <div className="w-1/2 border-r border-slate-800 pr-4">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Peak PM10</div>
              <div className="flex items-baseline gap-1.5">
                 <span className="text-2xl font-black text-white">{peakNetworkPm10.toFixed(0)}</span>
                 <span className="text-[9px] text-slate-500 font-bold">µg/m³</span>
              </div>
           </div>
           <div className="w-1/2 pl-4">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Peak PM2.5</div>
              <div className="flex items-baseline gap-1.5">
                 <span className="text-2xl font-black text-white">{(peakNetworkPm10 * 0.5).toFixed(0)}</span>
                 <span className="text-[9px] text-slate-500 font-bold">µg/m³</span>
              </div>
           </div>
        </div>

        <div className="flex-1 bg-[#020617] rounded-lg border border-slate-800 flex items-center justify-between p-4">
           <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Water Reserves</div>
              <div className="flex items-baseline gap-2">
                 <span className={cn("text-3xl font-black", waterTank < 30 ? 'text-red-500' : 'text-blue-400')}>{waterTank.toFixed(1)}%</span>
                 <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{(waterTank * 50).toFixed(0)} L</span>
              </div>
           </div>
           <Droplets className="w-8 h-8 text-blue-500/20" />
        </div>

        <div className="flex-1 bg-[#020617] rounded-lg border border-slate-800 flex items-center justify-between p-4">
           <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Automated Interventions</div>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-black text-indigo-400">{interventionsCount}</span>
                 <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Active Sim</span>
              </div>
           </div>
           <Settings className="w-8 h-8 text-indigo-500/20" />
        </div>
      </div>

      {/* C & D: MAIN CONTENT GRID */}
      <main className="w-full h-[650px] lg:h-[700px] flex flex-col lg:flex-row overflow-hidden border-b border-slate-800 shrink-0">
        
        {/* C. MAIN MONITORING AREA */}
        <section className="flex-[2.2] relative bg-[#020617] overflow-hidden border-r border-slate-800">
          <img src="/site_aerial.jpg" alt="Aerial Site View" className="absolute inset-0 w-full h-full object-cover" />
          
          <BoundaryOverlay isVisible={false} isLeakageActive={downwindExposure} />
          <CanvasHeatmap sources={dustSources} wind={wind} isVisible={mapLayers.heatmap} />
          <WindOverlay isVisible={mapLayers.wind} wind={wind} windDirStr={activeScenario.windDir} isHardwareMode={hardwareMode} envData={hardwareData ? { temp: hardwareData.temperature_c, hum: hardwareData.humidity_pct } : null} />

          {mapLayers.heatmap && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#0f172a]/95 backdrop-blur-xl p-3 border border-slate-700/50 rounded shadow-2xl flex flex-col gap-2 pointer-events-none">
               <div className="text-[9px] uppercase font-black text-slate-400 tracking-widest text-center">PM10 Concentration (µg/m³)</div>
               <div className="flex w-64 h-2 rounded-full bg-gradient-to-r from-green-500/80 via-amber-400/80 to-red-600/80"></div>
               <div className="flex justify-between text-[9px] font-bold text-slate-500 px-1">
                  <span>&lt;60</span>
                  <span>120</span>
                  <span>&gt;200</span>
               </div>
             </div>
          )}

          {/* Map Layer Controls */}
          <div className="absolute top-6 right-6 z-30 bg-[#0f172a]/95 backdrop-blur-xl p-4 border border-slate-700/50 rounded shadow-2xl flex flex-col gap-2 w-44">
            <div className="text-[10px] uppercase font-black text-slate-400 mb-2 border-b border-slate-700/50 pb-2 flex justify-between">
              <span>Map Overlays</span><Layers className="w-3.5 h-3.5"/>
            </div>
            {Object.keys(mapLayers).map(layer => (
              <label key={layer} className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-800/80 p-1.5 rounded transition-colors group">
                <input type="checkbox" checked={mapLayers[layer]} onChange={() => setMapLayers(l => ({...l, [layer]: !l[layer]}))} className="accent-blue-500 w-3.5 h-3.5" />
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-white capitalize tracking-wide">{
                  layer === 'wind' ? 'Wind Vector' : layer === 'heatmap' ? 'PM10 Heatmap' : layer === 'workers' ? 'Worker Wearables' : layer === 'services' ? 'Service Vehicles' : layer === 'sensors' ? 'Fixed Sensors' : layer
                }</span>
              </label>
            ))}
          </div>

          <div className="absolute inset-0 cursor-crosshair" onClick={() => { setSelectedSensorId(null); setSelectedWorkerId(null); }}>
            
            {/* Map Markers: Sensors */}
            {mapLayers.sensors && SENSORS.map(sensor => {
              const data = sensors[sensor.id] || { pm10: 20, status: 'normal' };
              const isSelected = selectedSensorId === sensor.id;
              return (
                <div key={sensor.id}
                  className={cn("absolute w-5 h-5 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.8)] z-20 hover:scale-125 bg-slate-900/90 transition-all duration-300",
                    isSelected ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#020617]" : "",
                    data.status === 'critical' ? 'border-red-500 text-red-500 animate-pulse' : data.status === 'warning' ? 'border-amber-500 text-amber-500' : 'border-green-500 text-green-500'
                  )}
                  style={{ left: `${sensor.x}%`, top: `${sensor.y}%` }}
                  onClick={(e) => { e.stopPropagation(); setSelectedSensorId(sensor.id); setSelectedWorkerId(null); }}
                >
                  <span className="text-[8px] font-black">{sensor.type === 'external' ? sensor.id : sensor.id.replace('S','')}</span>
                </div>
              );
            })}
            
            {/* Map Markers: Workers */}
            {mapLayers.workers && workers.map(worker => {
              const isSelected = selectedWorkerId === worker.id;
              return (
                <div key={worker.id}
                  className={cn("absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.8)] z-30 hover:scale-125 transition-all duration-200 linear",
                    isSelected ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#020617]" : "",
                    worker.status === 'critical' ? 'bg-red-950 border-2 border-red-500 text-red-100 animate-pulse' : 
                    worker.status === 'warning' ? 'bg-amber-950 border-2 border-amber-500 text-amber-100' : 
                    'bg-[#0f172a] border-[1.5px] border-purple-500/80 text-purple-400'
                  )}
                  style={{ left: `${worker.pos.x}%`, top: `${worker.pos.y}%` }}
                  onClick={(e) => { e.stopPropagation(); setSelectedWorkerId(worker.id); setSelectedSensorId(null); }}
                >
                  <HardHat className="w-3.5 h-3.5" />
                </div>
              );
            })}

            {/* Map Markers: Service Vehicles */}
            {mapLayers.services && vehicles.map(veh => {
              const SvcIcon = SERVICES[veh.serviceKey]?.icon || Truck;
              return (
                <div key={veh.id}
                  className="absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2 rounded-md flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.9)] z-40 bg-[#090f1e] border-2 border-blue-500 transition-all duration-200 linear"
                  style={{ left: `${veh.pos.x}%`, top: `${veh.pos.y}%` }}
                >
                  <SvcIcon className="w-4 h-4 text-blue-400" />
                  {veh.status === 'arrived' && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />}
                </div>
              );
            })}
          </div>

          {/* Map markers are now purely visual, selected item state highlights them but removes the overlay popup. */}

        </section>

        {/* D. RIGHT INTELLIGENCE COLUMN */}
        <aside className="flex-[1] min-w-[360px] flex flex-col bg-[#090f1e] overflow-hidden border-l border-slate-800 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-40">
           
           {/* Panel 1: WHAT'S HAPPENING NOW */}
           <div className="p-5 border-b border-slate-800 shrink-0">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Radio className={cn("w-3.5 h-3.5", simulationState !== 'idle' && "text-blue-500 animate-pulse")} /> 
                  Live Storyboard
                </h2>
                {isDemoMode && <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">Scenario: {activeScenario.name}</span>}
             </div>
             
             <div className="bg-[#020617] border border-slate-800/80 rounded-lg p-5 shadow-lg relative overflow-hidden">
               <h3 className={cn("text-[13px] font-black uppercase tracking-[0.15em] mb-4", 
                 demoStage === 2 || demoStage === 3 ? "text-red-400" : demoStage === 4 || demoStage === 5 || demoStage === 6 ? "text-blue-400" : demoStage === 7 ? "text-green-400" : "text-white"
               )}>{story.title}</h3>
               
               <div className="flex flex-col gap-2.5 mb-4">
                 <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Source</span><span className="text-xs font-bold text-slate-200">{story.source}</span></div>
                 <div className="text-xs text-slate-400 leading-relaxed font-medium"><span className="text-slate-500 font-bold uppercase tracking-wider mr-2">Cause:</span>{story.why}</div>
               </div>

               {story.action !== 'Monitoring' && story.action !== 'Nominal' && (
                 <div className="bg-blue-950/20 rounded border border-blue-900/40 p-3 mt-4">
                   <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1.5">Action Taken</div>
                   <div className="text-[13px] font-black uppercase text-blue-400 tracking-wider mb-1.5">{story.action}</div>
                   <div className="text-[11px] text-blue-300/70 font-medium leading-snug"><Info className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5"/>{story.next}</div>
                 </div>
               )}
               {(story.action === 'Monitoring' || story.action === 'Nominal') && (
                 <div className="mt-4 text-xs text-slate-500 font-medium tracking-wide"><ArrowRight className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5"/>{story.next}</div>
               )}
               {isDemoMode && <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full"><div className="h-full bg-blue-500 transition-all duration-[2000ms]" style={{ width: `${(demoStage / 7) * 100}%` }}></div></div>}
             </div>
           </div>

           {/* Panel 2: SENSOR NETWORK or DETAILS */}
           <div className="flex-1 flex flex-col border-b border-slate-800 overflow-hidden">
             {!selectedSensor && !selectedWorker ? (
               <>
                 <div className="p-5 pb-3 flex justify-between items-end shrink-0">
                   <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><RadioReceiver className="w-3.5 h-3.5"/> Sensor Network</h2>
                   <div className="flex gap-2">
                     <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500"><div className="w-2 h-2 bg-green-500 rounded-full" /> {networkStats.norm}</div>
                     <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500"><div className="w-2 h-2 bg-amber-500 rounded-full" /> {networkStats.warn}</div>
                     <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500"><div className="w-2 h-2 bg-red-500 rounded-full" /> {networkStats.crit}</div>
                   </div>
                 </div>
                 <div className="px-5 pb-5 pt-1">
                    <div className="flex flex-col gap-2.5">
                      {SENSORS.map(s => {
                        const data = sensors[s.id] || { pm10: 20, status: 'normal' };
                        return (
                          <div key={s.id} onClick={() => {setSelectedSensorId(s.id); setSelectedWorkerId(null);}} 
                               className={cn("bg-[#020617] border border-slate-800/80 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-slate-600 transition-colors shadow-sm")}>
                            <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-2 rounded-full shrink-0", data.status === 'critical' ? 'bg-red-500 animate-pulse' : data.status === 'warning' ? 'bg-amber-500' : 'bg-green-500')} />
                              <div>
                                <div className="text-[11px] font-black text-white uppercase tracking-wider">{s.id} <span className="text-slate-500 font-bold ml-1">{s.name}</span></div>
                                <div className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">{s.zone}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={cn("text-sm font-black tracking-wide", data.status === 'critical' ? 'text-red-400' : 'text-slate-200')}>{Number(data.pm10).toFixed(0)} <span className="text-[9px] text-slate-500 ml-0.5">µg</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                 </div>
               </>
             ) : (
               <div className="flex-1 flex flex-col bg-[#020617] overflow-hidden">
                 <div className="p-5 pb-3 flex justify-between items-center shrink-0">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Target className="w-3.5 h-3.5"/> Detail View
                    </h2>
                    <button onClick={() => {setSelectedSensorId(null); setSelectedWorkerId(null);}} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white flex items-center gap-1 transition-colors bg-slate-800/50 px-2.5 py-1.5 rounded">
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </div>
                  
                  <div className="px-5 pb-5 flex-1 overflow-y-auto custom-scrollbar">
                    {selectedSensor && selectedSensorData && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                      <div className="flex items-center gap-3 mb-6">
                         <div className={cn("w-3 h-3 rounded-full shrink-0 shadow-[0_0_10px_currentColor]", selectedSensorData.status === 'critical' ? 'bg-red-500 text-red-500 animate-pulse' : selectedSensorData.status === 'warning' ? 'bg-amber-500 text-amber-500' : 'bg-green-500 text-green-500')} />
                         <div>
                           <div className="text-lg font-black text-white uppercase tracking-wider">{selectedSensor.id} - {selectedSensor.name}</div>
                           <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">{selectedSensor.type === 'external' ? 'Residential Receptor' : 'Fixed Sensor'} • {selectedSensor.zone}</div>
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-[#090f1e] p-4 rounded-lg border border-slate-800/80 text-center shadow-inner">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">PM10 Level</div>
                          <div className={cn("text-3xl font-black", selectedSensorData.status === 'critical' ? 'text-red-500' : selectedSensorData.status === 'warning' ? 'text-amber-500' : 'text-green-500')}>{Number(selectedSensorData.pm10).toFixed(0)}</div>
                        </div>
                        <div className="bg-[#090f1e] p-4 rounded-lg border border-slate-800/80 text-center shadow-inner">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">PM2.5 Level</div>
                          <div className={cn("text-3xl font-black", selectedSensorData.status === 'critical' ? 'text-red-500' : selectedSensorData.status === 'warning' ? 'text-amber-500' : 'text-green-500')}>{Number(selectedSensorData.pm25).toFixed(0)}</div>
                        </div>
                      </div>

                      {/* Mini Trend Chart */}
                      <div className="bg-[#090f1e] p-4 rounded-lg border border-slate-800/80 mb-4 h-24 flex items-end justify-between gap-1 shadow-inner relative group">
                        <div className="absolute top-2 left-3 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Recent Trend (PM10)</div>
                        {selectedSensorData.history?.map((val, i) => (
                           <div key={i} className="flex-1 bg-blue-500/30 rounded-t min-w-[2px] hover:bg-blue-400 transition-all" style={{ height: `${Math.max(5, Math.min(100, (val / 300) * 100))}%` }} />
                        ))}
                      </div>

                      {selectedSensor.type === 'external' && selectedSensorData.status !== 'normal' && (
                         <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-lg mb-4 text-[10px] text-amber-400 font-bold uppercase tracking-widest flex items-start gap-2.5 shadow-md">
                           <Wind className="w-4 h-4 shrink-0 -mt-0.5 text-amber-500" />
                           <span className="leading-relaxed">Downwind drift detected. Elevated exposure warning for receptor.</span>
                         </div>
                      )}

                      <div className="bg-[#090f1e] p-4 rounded-lg border border-slate-800/80 flex justify-between items-center shadow-inner">
                         <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Network Status</span>
                         <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded", selectedSensorData.status === 'critical' ? 'bg-red-500/20 text-red-500' : selectedSensorData.status === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500')}>{selectedSensorData.status}</span>
                      </div>
                    </div>
                  )}

                  {selectedWorker && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                      <div className="flex items-center gap-3 mb-6">
                         <div className={cn("w-3 h-3 rounded-full shrink-0 shadow-[0_0_10px_currentColor]", selectedWorker.status === 'critical' ? 'bg-red-500 text-red-500 animate-pulse' : selectedWorker.status === 'warning' ? 'bg-amber-500 text-amber-500' : 'bg-green-500 text-green-500')} />
                         <div>
                           <div className="text-lg font-black text-white uppercase tracking-wider">{selectedWorker.id}</div>
                           <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">Worker Wearable • {selectedWorker.role}</div>
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-[#090f1e] p-4 rounded-lg border border-slate-800/80 text-center shadow-inner">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Pers. PM10</div>
                          <div className={cn("text-3xl font-black", selectedWorker.status === 'critical' ? 'text-red-500' : selectedWorker.status === 'warning' ? 'text-amber-500' : 'text-green-500')}>{Number(selectedWorker.pm10).toFixed(0)}</div>
                        </div>
                        <div className="bg-[#090f1e] p-4 rounded-lg border border-slate-800/80 text-center shadow-inner">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Pers. PM2.5</div>
                          <div className={cn("text-3xl font-black", selectedWorker.status === 'critical' ? 'text-red-500' : selectedWorker.status === 'warning' ? 'text-amber-500' : 'text-green-500')}>{Number(selectedWorker.pm25).toFixed(0)}</div>
                        </div>
                      </div>

                      {/* Mini Trend Chart */}
                      <div className="bg-[#090f1e] p-4 rounded-lg border border-slate-800/80 mb-4 h-24 flex items-end justify-between gap-1 shadow-inner relative group">
                        <div className="absolute top-2 left-3 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Recent Trend (PM10)</div>
                        {selectedWorker.history?.map((val, i) => (
                           <div key={i} className="flex-1 bg-purple-500/40 rounded-t min-w-[2px] hover:bg-purple-400 transition-all" style={{ height: `${Math.max(5, Math.min(100, (val / 300) * 100))}%` }} />
                        ))}
                      </div>

                      {selectedWorker.status === 'critical' && (
                        <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-lg mb-4 text-[10px] text-red-400 font-bold uppercase tracking-widest flex items-start gap-2.5 shadow-md">
                           <ShieldAlert className="w-4 h-4 shrink-0 -mt-0.5" />
                           <span className="leading-relaxed">Personal limit exceeded. Evacuate or rotate worker from zone.</span>
                        </div>
                      )}

                      <div className="bg-[#090f1e] p-4 rounded-lg border border-slate-800/80 flex justify-between items-center shadow-inner">
                         <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Network Status</span>
                         <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded", selectedWorker.status === 'critical' ? 'bg-red-500/20 text-red-500' : selectedWorker.status === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500')}>{selectedWorker.status}</span>
                      </div>
                    </div>
                  )}
                  </div>
               </div>
             )}
           </div>

           {/* Panel 3: PM10 TREND */}
           <div className="h-[200px] p-5 shrink-0 bg-[#020617] relative">
             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><BarChart2 className="w-3.5 h-3.5"/> PM10 Trend Analysis</h2>
             
             <div className="absolute top-5 right-5 flex flex-col items-end">
               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Peak: <span className="text-white">{peakPm10.toFixed(0)}</span></div>
               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current: <span className={cn("font-black", peakNetworkPm10 > 120 ? 'text-red-400' : 'text-sky-400')}>{peakNetworkPm10.toFixed(0)}</span></div>
             </div>

             <div className="h-[120px] w-full mt-2">
                {trendData.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg">
                    <Activity className="w-6 h-6 text-slate-600 mb-2 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Waiting for Data...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorPm10" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPm25" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, 'auto']} tick={{fontSize: 9, fill: '#64748b'}} width={30} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#fff'}} 
                        labelStyle={{color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold'}}
                      />
                      <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                      <Area type="monotone" dataKey="pm10" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorPm10)" isAnimationActive={false} />
                      <Area type="monotone" dataKey="pm25" stroke="#a78bfa" strokeWidth={2} fillOpacity={1} fill="url(#colorPm25)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
             </div>
           </div>

        </aside>
      </main>

      {/* E. BOTTOM DASHBOARD */}
      <footer className="min-h-[220px] flex flex-col lg:flex-row border-t border-slate-800 shrink-0 bg-[#020617] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50">
        
        {/* Panel 1: MITIGATION IMPACT */}
        <div className="w-full lg:w-[450px] border-b lg:border-b-0 lg:border-r border-slate-800 p-5 flex flex-col justify-between bg-[#090f1e]/80 shrink-0">
           <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4" /> Mitigation Impact Analysis</h3>
           
           <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="bg-[#020617] border border-slate-800 rounded p-3 relative">
                 <div className="absolute top-0 right-0 p-2"><TrendingDown className="w-4 h-4 text-green-500 opacity-50" /></div>
                 <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">PM10 Reduction</div>
                 <div className="text-xl font-black text-white">{pm10Reduction}%</div>
                 <div className="text-[9px] text-slate-500 mt-1 font-bold">BASE {peakPm10.toFixed(0)} → CUR {peakNetworkPm10.toFixed(0)}</div>
              </div>

              <div className="bg-[#020617] border border-slate-800 rounded p-3">
                 <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Risk Score</div>
                 <div className="text-xl font-black text-white">
                   {initialRisk.toFixed(0)} <span className="text-slate-600 font-normal mx-1">→</span> <span className={getRiskColor(overallRisk)}>{overallRisk.toFixed(0)}</span>
                 </div>
                 <div className="text-[9px] text-slate-500 mt-1 font-bold truncate">ACT: {activeInterventionName}</div>
              </div>
              
              <div className="bg-[#020617] border border-slate-800 rounded p-3 flex flex-col justify-center">
                 <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                    <span>Active Services</span>
                    <span className="text-indigo-400 text-[11px]">{interventionsCount}</span>
                 </div>
                 <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    <span>Water Consumed</span>
                    <span className="text-blue-400 text-[11px]">{((100 - waterTank) * 50).toFixed(0)} L</span>
                 </div>
              </div>
              
              <div className="bg-[#020617] border border-slate-800 rounded p-3 flex flex-col justify-center">
                 <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Vehicle Status</div>
                 <div className={cn("text-[11px] font-black uppercase tracking-wider truncate", requests.length > 0 && requests[0].status !== 'COMPLETED' ? 'text-blue-400' : 'text-slate-400')}>
                   {requests.length > 0 ? requests[0].status : 'Standby'}
                 </div>
              </div>
           </div>
        </div>

        {/* Panel 2: AUTOMATED SERVICE DISPATCH */}
        <div className="flex-1 flex flex-col p-6 bg-[#020617]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><ListChecks className="w-4 h-4" /> Automated Services Network</h3>
              <span className="text-[9px] uppercase font-black text-slate-600 border border-slate-800/80 px-2.5 py-1 rounded-full tracking-[0.2em] hidden sm:block">Simulated Vendors</span>
            </div>
            {requests.length > 0 && <button onClick={clearAllRequests} className="text-[10px] uppercase font-bold tracking-widest text-slate-500 hover:text-red-400 flex items-center gap-1.5 transition-colors"><Trash2 className="w-3.5 h-3.5" /> Clear History</button>}
          </div>
          
          <div className="flex-1 flex gap-5 overflow-x-auto custom-scrollbar items-center pb-2">
            {requests.length === 0 ? (
              <div className="text-slate-600 text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center w-full h-full border border-slate-800/50 border-dashed rounded-lg bg-[#090f1e]/30">Awaiting Engine Triggers</div>
            ) : (
              requests.map(req => {
                const SvcIcon = SERVICES[req.serviceKey]?.icon || Truck;
                return (
                  <div key={req.id} className="min-w-[320px] h-[140px] bg-[#090f1e] border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between animate-in slide-in-from-right-4 shrink-0 shadow-lg group hover:border-slate-700 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-md bg-[#020617] border border-slate-800 flex items-center justify-center shrink-0 shadow-inner"><SvcIcon className="w-5 h-5 text-blue-500" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-black text-white uppercase tracking-wide truncate">{req.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5 truncate">{req.id} • {req.location}</div>
                      </div>
                      <div className={cn("text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded shrink-0 border", 
                         req.status === 'REQUESTED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : req.status === 'ACCEPTED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : req.status === 'DISPATCHED' ? 'bg-blue-600 text-white shadow-md border-blue-600' : 'bg-green-500/10 text-green-500 border-green-500/20'
                      )}>{req.status}</div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-2">
                        <span>{req.vendor} • {req.cost}</span>
                        <span className="text-sky-400">{req.status === 'ACCEPTED' ? 'ETA 60m' : req.status === 'DISPATCHED' ? 'En Route' : req.status === 'ENTERING SITE' ? 'Arriving' : req.status === 'ARRIVED' ? 'Positioning' : req.status === 'ACTIVE' ? 'Suppressing' : req.status === 'RETURNING' ? 'Returning' : req.status === 'COMPLETED' ? 'Done' : 'Awaiting'}</span>
                      </div>
                      <div className="h-1.5 bg-[#020617] rounded-full overflow-hidden flex shadow-inner">
                        <div className={cn("h-full transition-all duration-1000", getProgressWidth(req.status))} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </footer>

      {/* CATALOGUE MODAL */}
      {showCatalogue && (
        <div className="absolute inset-0 z-[100] bg-[#020617]/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
          <div className="bg-[#090f1e] border border-slate-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-[800px] max-h-[80vh] flex flex-col overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-[#020617]">
               <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500"/> Simulation Catalogue</h2>
               <button onClick={() => setShowCatalogue(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
             </div>
             <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
               <div className="grid grid-cols-2 gap-5">
                 {Object.values(SERVICES).map(svc => (
                   <div key={svc.key} className="bg-[#020617] border border-slate-800 p-5 rounded-lg flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg">
                     <div className="flex gap-4 mb-5">
                       <div className="w-12 h-12 rounded-md bg-[#090f1e] border border-slate-800 flex items-center justify-center shrink-0"><svc.icon className="w-6 h-6 text-blue-500" /></div>
                       <div>
                         <div className="text-[13px] font-black text-white uppercase tracking-wider">{svc.name}</div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1.5">{svc.type}</div>
                         <div className="text-[11px] text-slate-400 mt-2.5 font-medium"><span className="text-slate-500 font-bold uppercase tracking-widest">Vendor:</span> {svc.provider}</div>
                         <div className="text-[11px] text-slate-400 mt-1 font-medium"><span className="text-slate-500 font-bold uppercase tracking-widest">Sim Cost:</span> {svc.cost}</div>
                       </div>
                     </div>
                     <button onClick={() => { const ok = addRequest(svc.key, svc.defaultLocation, 'High', `Catalogue dispatch: ${svc.name}`); if (ok) setShowCatalogue(false); }} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded transition-colors shadow-md">Simulate Requirement</button>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes windflow { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
}
