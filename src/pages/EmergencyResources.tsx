import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  MapPin, 
  DoorOpen, 
  AlertTriangle, 
  ShieldCheck, 
  Flame, 
  Eye, 
  ArrowRight, 
  Boxes, 
  CheckCircle2, 
  XCircle,
  Droplets,
  Wind,
  Snowflake,
  Power,
  Bell,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  Clock,
  Layers,
  Activity
} from 'lucide-react';
import { SimulationState, simulationStore, INITIAL_ZONE_CONFIGS } from '../engine/simulationStore';
import { calculateEvacuationRoute } from '../logic/routing';
import { ZoneId, ResponseActionType, ZoneResponseAction } from '../types/simulation';

export const EmergencyResources: React.FC = () => {
  const { simState } = useOutletContext<{ simState: SimulationState }>();
  const navigate = useNavigate();

  // Active Zone Filter for Response Controls
  const [filterZone, setFilterZone] = useState<ZoneId | 'ALL'>('ALL');
  const [actionCategory, setActionCategory] = useState<'ALL' | ResponseActionType>('ALL');

  // Evacuation Pathfinder state
  const [selectedZone, setSelectedZone] = useState<ZoneId>('ZONE_PROD');
  const [blockedZones, setBlockedZones] = useState<ZoneId[]>(['ZONE_STORAGE']);

  const routeResult = calculateEvacuationRoute(selectedZone, blockedZones);

  const toggleZoneBlock = (zId: ZoneId) => {
    if (blockedZones.includes(zId)) {
      setBlockedZones(blockedZones.filter(z => z !== zId));
    } else {
      setBlockedZones([...blockedZones, zId]);
    }
  };

  const allActions = Object.values(simState.responseActions);
  const filteredActions = allActions.filter(action => {
    if (filterZone !== 'ALL' && action.zoneId !== filterZone) return false;
    if (actionCategory !== 'ALL' && action.type !== actionCategory) return false;
    return true;
  });

  const activeActionsCount = allActions.filter(a => a.status === 'ACTIVE').length;
  const completedActionsCount = allActions.filter(a => a.status === 'COMPLETED').length;

  const emergencyResources = [
    { id: 'RES-01', name: 'Emergency Exit A (Blast Doors)', type: 'EXIT', location: 'East Concourse', status: 'AVAILABLE', capacity: '200 pers' },
    { id: 'RES-02', name: 'Emergency Exit B (North Yard)', type: 'EXIT', location: 'North Walkway', status: 'AVAILABLE', capacity: '150 pers' },
    { id: 'RES-03', name: 'CO2 Gas Fire Suppression Bank', type: 'SUPPRESSION', location: 'Power Room Substation', status: 'STANDBY', capacity: '4 x 50kg' },
    { id: 'RES-04', name: 'Deluge Foam Sprinkler Loop', type: 'SUPPRESSION', location: 'Storage Area Racks', status: 'STANDBY', capacity: 'High Flow' },
    { id: 'RES-05', name: 'Pressurized Eyewash & Safety Shower', type: 'FIRST_AID', location: 'Storage Chemical Staging', status: 'INSPECTED', capacity: 'Continuous' },
    { id: 'RES-06', name: 'Assembly Muster Point Alpha', type: 'MUSTER', location: 'East Parking Concourse', status: 'OPEN', capacity: 'Safe Zone' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none font-mono">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-industrial-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">
              Emergency Responses & Facility Evacuation Center
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-bold">
              3D DIGITAL TWIN INTEGRATED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            State-driven emergency response operational control panel linked directly to real-time 3D facility simulation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-industrial-950 border border-industrial-800 text-xs">
            <span className="text-slate-400">Active Responses:</span>
            <span className={`font-bold ${activeActionsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
              {activeActionsCount} Running
            </span>
          </div>

          <button
            onClick={() => {
              simulationStore.selectZone(selectedZone);
              navigate('/facility');
            }}
            className="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-industrial-950 text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-lg shadow-cyan-600/20"
          >
            <Boxes className="w-4 h-4" />
            <span>Launch 3D Facility View</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: LIVE 3D EMERGENCY RESPONSE OPERATIONAL CONTROLS */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-lg p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-industrial-800">
          <div className="flex items-center space-x-2 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Simulated Emergency Response Control Console
              </h2>
              <span className="text-[10px] text-slate-400 font-sans">
                Activate response equipment to visibly suppress fire, extract smoke, and cool zones in the 3D model.
              </span>
            </div>
          </div>

          {/* Quick Zone Filter */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px] mr-1">Zone:</span>
            <button
              onClick={() => setFilterZone('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                filterZone === 'ALL' 
                  ? 'bg-cyan-500 text-industrial-950 font-bold' 
                  : 'bg-industrial-950 text-slate-400 border border-industrial-800'
              }`}
            >
              ALL
            </button>
            {(Object.keys(INITIAL_ZONE_CONFIGS) as ZoneId[]).map((zId) => (
              <button
                key={zId}
                onClick={() => setFilterZone(zId)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  filterZone === zId 
                    ? 'bg-cyan-500 text-industrial-950 font-bold' 
                    : 'bg-industrial-950 text-slate-400 border border-industrial-800'
                }`}
              >
                {zId.replace('ZONE_', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActions.map((action) => {
            const zone = simState.zones[action.zoneId];
            const isActive = action.status === 'ACTIVE';
            const isCompleted = action.status === 'COMPLETED';
            const isUnavailable = !action.isAvailable;

            let icon = <ShieldCheck className="w-4 h-4 text-cyan-400" />;
            if (action.type === 'SPRINKLERS') icon = <Droplets className={`w-4 h-4 ${isActive ? 'text-cyan-400 animate-bounce' : 'text-slate-400'}`} />;
            if (action.type === 'VENTILATION') icon = <Wind className={`w-4 h-4 ${isActive ? 'text-sky-400 animate-spin' : 'text-slate-400'}`} />;
            if (action.type === 'COOLING') icon = <Snowflake className={`w-4 h-4 ${isActive ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />;
            if (action.type === 'POWER_ISOLATION') icon = <Power className="w-4 h-4 text-amber-400" />;
            if (action.type === 'ALARM_STROBE') icon = <Bell className="w-4 h-4 text-red-400" />;

            return (
              <div
                key={action.id}
                className={`p-4 rounded-lg border transition-all flex flex-col justify-between space-y-3 ${
                  isActive 
                    ? 'bg-industrial-950 border-cyan-500/80 shadow-lg shadow-cyan-500/10' 
                    : isCompleted
                    ? 'bg-industrial-950/80 border-emerald-800/80'
                    : 'bg-industrial-950 border-industrial-800 hover:border-industrial-700'
                }`}
              >
                <div className="space-y-2">
                  {/* Card Title & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      {icon}
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">
                          {action.name.split(':')[1] || action.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {zone?.config.name || action.zoneId}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                      isActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse' :
                      isCompleted ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      isUnavailable ? 'bg-red-950 text-red-400 border border-red-800' :
                      'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {action.status}
                    </span>
                  </div>

                  {/* Expected Effect Description */}
                  <p className="text-[11px] text-slate-300 font-sans leading-tight">
                    {action.expectedEffect}
                  </p>

                  {/* Real-Time Sensor Telemetry in Zone */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded bg-industrial-900/90 text-center text-[10px] border border-industrial-800">
                    <div>
                      <span className="text-slate-500 block">Smoke</span>
                      <span className={`font-bold ${zone?.sensors.smokeLevel > 20 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {zone?.sensors.smokeLevel.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Temp</span>
                      <span className={`font-bold ${zone?.sensors.temperature > 50 ? 'text-red-400' : 'text-slate-300'}`}>
                        {zone?.sensors.temperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pressure</span>
                      <span className="text-slate-300 font-bold">
                        {zone?.sensors.pressure.toFixed(0)} PSI
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Suppression Progress:</span>
                      <span className="text-cyan-400 font-bold">{action.progress}%</span>
                    </div>
                    <div className="w-full bg-industrial-900 h-2 rounded-full overflow-hidden border border-industrial-800">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-400' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${action.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Button Bar */}
                <div className="pt-2 border-t border-industrial-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      simulationStore.selectZone(action.zoneId);
                      navigate('/facility');
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Watch in 3D</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {action.progress > 0 && !isActive && (
                      <button
                        onClick={() => simulationStore.resetResponseAction(action.id)}
                        className="px-2 py-1 text-[10px] rounded bg-industrial-900 hover:bg-industrial-850 text-slate-400 border border-industrial-800"
                        title="Reset progress to 0"
                      >
                        Reset
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (isActive) {
                          simulationStore.deactivateResponseAction(action.id);
                        } else {
                          simulationStore.activateResponseAction(action.id);
                        }
                      }}
                      disabled={isUnavailable}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 shadow-sm'
                          : isCompleted
                          ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                          : isUnavailable
                          ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-industrial-950 shadow-md shadow-cyan-500/20'
                      }`}
                    >
                      {isActive ? 'DEACTIVATE' : isCompleted ? 'RE-ACTIVATE' : 'ACTIVATE'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: SIMULATED DYNAMIC EVACUATION PATHFINDER & RESOURCE INVENTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dynamic Evacuation Pathfinder (7 cols) */}
        <div className="lg:col-span-7 bg-industrial-900 border border-industrial-800 rounded-lg p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-industrial-800">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Compass className="w-4 h-4" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Simulated Dynamic Egress Pathfinding
              </h2>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Dijkstra Shortest Path</span>
          </div>

          {/* Source Zone Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400">Select Evacuation Origin Zone:</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value as ZoneId)}
                className="w-full bg-industrial-950 border border-industrial-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
              >
                {(Object.keys(INITIAL_ZONE_CONFIGS) as ZoneId[]).map((zid) => (
                  <option key={zid} value={zid}>{INITIAL_ZONE_CONFIGS[zid].name}</option>
                ))}
              </select>
            </div>

            {/* Blocked Corridors Simulator */}
            <div className="space-y-1">
              <label className="text-slate-400">Simulate Hazard Blocks (Click to toggle):</label>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(INITIAL_ZONE_CONFIGS) as ZoneId[]).map((zid) => {
                  const isBlocked = blockedZones.includes(zid);
                  return (
                    <button
                      key={zid}
                      onClick={() => toggleZoneBlock(zid)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        isBlocked 
                          ? 'bg-red-950 text-red-400 border border-red-800' 
                          : 'bg-industrial-950 text-slate-400 border border-industrial-800 hover:text-white'
                      }`}
                    >
                      {zid.replace('ZONE_', '')} {isBlocked ? '✕' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Route Calculation Result Box */}
          <div className="bg-industrial-950 p-4 rounded-lg border border-industrial-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Computed Optimal Safe Egress</span>
              {routeResult.routeFound ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>SAFE ROUTE AVAILABLE</span>
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 flex items-center space-x-1">
                  <XCircle className="w-3 h-3" />
                  <span>EGRESS BLOCKED</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-industrial-900 border border-industrial-800">
                <span className="text-[10px] text-slate-500 uppercase block">Destination Exit</span>
                <span className="font-bold text-cyan-400 text-[11px] truncate block mt-0.5">
                  {routeResult.nearestExit.split('—')[0]}
                </span>
              </div>
              <div className="p-2 rounded bg-industrial-900 border border-industrial-800">
                <span className="text-[10px] text-slate-500 uppercase block">Total Distance</span>
                <span className="font-bold text-slate-200 text-sm block mt-0.5">
                  {routeResult.totalDistanceMeters.toFixed(1)} m
                </span>
              </div>
              <div className="p-2 rounded bg-industrial-900 border border-industrial-800">
                <span className="text-[10px] text-slate-500 uppercase block">Est. Egress Time</span>
                <span className="font-bold text-amber-400 text-sm block mt-0.5">
                  ~{routeResult.evacuationEstimatedSeconds} s
                </span>
              </div>
            </div>

            {/* Blocked corridor notice */}
            {routeResult.blockedCorridors.length > 0 && (
              <div className="p-2.5 rounded bg-amber-950/40 border border-amber-900/60 text-[11px] text-amber-300">
                <div className="font-bold flex items-center space-x-1 mb-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Avoided Corridors Due to Hazard:</span>
                </div>
                <ul className="list-disc list-inside text-[10px] text-amber-400/80">
                  {routeResult.blockedCorridors.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Equipment & Resources Directory (5 cols) */}
        <div className="lg:col-span-5 bg-industrial-900 border border-industrial-800 rounded-lg p-5 space-y-3 shadow-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-industrial-800">
              <div className="flex items-center space-x-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Facility Safety Resource Inventory
                </h2>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">6 Assets</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {emergencyResources.map((res) => (
                <div
                  key={res.id}
                  className="p-2.5 rounded bg-industrial-950 border border-industrial-800 text-xs space-y-1 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{res.name}</span>
                    <span className="text-[10px] px-1.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      {res.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Location: {res.location}</span>
                    <span>{res.capacity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-industrial-800 text-[10px] text-slate-500">
            * All emergency resources are simulated facility assets for educational digital twin demonstration. Response activation does not replace certified standard operating procedures.
          </div>
        </div>
      </div>
    </div>
  );
};
