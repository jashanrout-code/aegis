import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Boxes, 
  Camera, 
  Sliders, 
  Flame, 
  Thermometer, 
  Gauge, 
  AlertOctagon, 
  ShieldCheck, 
  RotateCcw, 
  X, 
  Check, 
  Layers,
  Cpu,
  CornerDownRight,
  Droplets,
  Wind,
  Snowflake,
  Power,
  Bell
} from 'lucide-react';
import { SimulationState, simulationStore } from '../engine/simulationStore';
import { FacilityCanvas, CAMERA_PRESETS } from '../components/3d/FacilityCanvas';
import { LogicDiagram } from '../components/shared/LogicDiagram';
import { ZoneId } from '../types/simulation';

export const Facility3DPage: React.FC = () => {
  const { simState } = useOutletContext<{ simState: SimulationState }>();
  const [cameraPreset, setCameraPreset] = useState<string>('OVERVIEW');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  const selectedZoneId = simState.selectedZoneId || 'ZONE_PROD';
  const selectedZone = simState.zones[selectedZoneId];

  const handlePresetChange = (preset: string) => {
    setCameraPreset(preset);
    if (preset.startsWith('ZONE_')) {
      simulationStore.selectZone(preset as ZoneId);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem-2rem)] bg-industrial-950 flex overflow-hidden select-none">
      {/* 3D Canvas Main Viewport */}
      <div className="flex-1 h-full relative">
        <FacilityCanvas
          zones={simState.zones}
          responseActions={simState.responseActions}
          fsmState={simState.fsmState}
          selectedZoneId={simState.selectedZoneId}
          cameraPreset={cameraPreset}
          evacuationWaypoints={simState.activeEvacuationRoute?.waypoints}
          onSelectZone={(zoneId) => simulationStore.selectZone(zoneId)}
          onSelectEquipment={(eq) => {
            simulationStore.selectZone(eq.zoneId);
            setIsDrawerOpen(true);
          }}
        />

        {/* Top Floating Camera Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5 bg-industrial-950/80 backdrop-blur-md p-1.5 rounded-lg border border-industrial-800 text-xs font-mono shadow-xl">
          <div className="flex items-center space-x-1.5 px-2 text-slate-400 border-r border-industrial-800 mr-1">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Camera:</span>
          </div>

          {['OVERVIEW', 'TOP_DOWN', 'ZONE_PROD', 'ZONE_POWER', 'ZONE_STORAGE', 'ZONE_CTRL', 'ZONE_UTIL', 'ZONE_EXIT'].map((key) => {
            const label = key === 'OVERVIEW' ? 'Overview' :
                          key === 'TOP_DOWN' ? 'Top-Down' :
                          key.replace('ZONE_', '');
            return (
              <button
                key={key}
                onClick={() => handlePresetChange(key)}
                className={`px-2 py-1 rounded transition-colors ${
                  cameraPreset === key 
                    ? 'bg-cyan-500 text-industrial-950 font-bold' 
                    : 'text-slate-300 hover:bg-industrial-850 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Floating Evacuation Route Notice */}
        {simState.activeEvacuationRoute && simState.activeEvacuationRoute.routeFound && (
          <div className="absolute bottom-4 left-4 z-10 bg-industrial-950/90 backdrop-blur-md border border-emerald-800/80 px-3 py-2 rounded-lg text-xs font-mono shadow-xl flex items-center space-x-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Evacuation Route: {simState.activeEvacuationRoute.nearestExit} ({simState.activeEvacuationRoute.totalDistanceMeters.toFixed(1)}m, ~{simState.activeEvacuationRoute.evacuationEstimatedSeconds}s)</span>
          </div>
        )}

        {/* Drawer Toggle Button when closed */}
        {!isDrawerOpen && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="absolute top-4 right-4 z-10 bg-industrial-900 hover:bg-industrial-850 border border-industrial-700 text-cyan-400 px-3 py-2 rounded-lg font-mono text-xs flex items-center space-x-2 shadow-2xl transition-all"
          >
            <Sliders className="w-4 h-4" />
            <span>Inspect Zone: {selectedZone.config.name}</span>
          </button>
        )}
      </div>

      {/* Slide-out Interactive Zone Inspector Drawer */}
      {isDrawerOpen && (
        <div className="w-96 bg-industrial-900 border-l border-industrial-800 flex flex-col h-full shadow-2xl z-20 overflow-hidden font-mono">
          {/* Header */}
          <div className="p-4 bg-industrial-950 border-b border-industrial-800 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-cyan-neon font-bold tracking-wider uppercase">
                  {selectedZone.config.code}
                </span>
                <span className="text-slate-600">|</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans uppercase ${
                  selectedZone.status === 'EMERGENCY' ? 'bg-red-950 text-red-400 border border-red-800' :
                  selectedZone.status === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  selectedZone.status === 'FAULT' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                  'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {selectedZone.status}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-100 mt-0.5">
                {selectedZone.config.name}
              </h2>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Inspector Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {/* Zone Description & Risk */}
            <div className="bg-industrial-950/80 p-3 rounded border border-industrial-800/80 space-y-1.5">
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                {selectedZone.config.description}
              </p>
              <p className="text-[10px] text-amber-400/90 font-mono">
                Primary Risk: {selectedZone.config.primaryRisk}
              </p>
            </div>

            {/* Live Interactive Sensor Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-industrial-800">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Simulated Sensor Telemetry</span>
                </span>
                <span className="text-[10px] text-slate-500">Live Interactive</span>
              </div>

              {/* Smoke Sensor Control */}
              <div className="bg-industrial-950 p-2.5 rounded border border-industrial-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-200">
                    <Flame className={`w-3.5 h-3.5 ${selectedZone.sensors.smoke ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
                    <span>Smoke Level</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200">{selectedZone.sensors.smokeLevel.toFixed(1)}%</span>
                    <span className={`px-1 rounded text-[10px] ${selectedZone.sensors.smoke ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                      S={selectedZone.sensors.smoke ? '1' : '0'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={selectedZone.sensors.smokeLevel}
                  onChange={(e) => simulationStore.setAnalogLevel(selectedZoneId, 'smokeLevel', parseFloat(e.target.value))}
                  className="w-full h-1 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Nominal: &lt;15%</span>
                  <span>Trip Threshold: 25.0%</span>
                </div>
              </div>

              {/* Temperature Sensor Control */}
              <div className="bg-industrial-950 p-2.5 rounded border border-industrial-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-200">
                    <Thermometer className={`w-3.5 h-3.5 ${selectedZone.sensors.tempHigh ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                    <span>Temperature</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200">{selectedZone.sensors.temperature.toFixed(1)}°C</span>
                    <span className={`px-1 rounded text-[10px] ${selectedZone.sensors.tempHigh ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                      H={selectedZone.sensors.tempHigh ? '1' : '0'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="140"
                  step="0.5"
                  value={selectedZone.sensors.temperature}
                  onChange={(e) => simulationStore.setAnalogLevel(selectedZoneId, 'temperature', parseFloat(e.target.value))}
                  className="w-full h-1 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Ambient: ~24°C</span>
                  <span>Trip Threshold: 60.0°C</span>
                </div>
              </div>

              {/* Pressure Sensor Control */}
              <div className="bg-industrial-950 p-2.5 rounded border border-industrial-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-200">
                    <Gauge className={`w-3.5 h-3.5 ${selectedZone.sensors.pressureAnomaly ? 'text-purple-400 animate-pulse' : 'text-slate-400'}`} />
                    <span>Pressure Line</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200">{selectedZone.sensors.pressure.toFixed(1)} PSI</span>
                    <span className={`px-1 rounded text-[10px] ${selectedZone.sensors.pressureAnomaly ? 'bg-purple-950 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                      P={selectedZone.sensors.pressureAnomaly ? '1' : '0'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="20"
                  max="180"
                  step="1"
                  value={selectedZone.sensors.pressure}
                  onChange={(e) => simulationStore.setAnalogLevel(selectedZoneId, 'pressure', parseFloat(e.target.value))}
                  className="w-full h-1 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Safe Window: 45 - 115 PSI</span>
                </div>
              </div>

              {/* Discrete Digital Switch Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => simulationStore.triggerEmergencyPull(selectedZoneId)}
                  className={`p-2 rounded border text-left flex items-center justify-between transition-colors ${
                    selectedZone.sensors.manualEmergency 
                      ? 'bg-red-950/80 border-red-600 text-red-300' 
                      : 'bg-industrial-950 border-industrial-800 hover:border-red-700/60 text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-[11px]">Manual Pull Station</div>
                    <div className="text-[10px] text-slate-500">Digital Input M</div>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${selectedZone.sensors.manualEmergency ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`} />
                </button>

                <button
                  onClick={() => simulationStore.toggleSensor(selectedZoneId, 'systemEnable' as any)}
                  className={`p-2 rounded border text-left flex items-center justify-between transition-colors ${
                    selectedZone.sensors.systemEnable 
                      ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300' 
                      : 'bg-industrial-950 border-industrial-800 text-slate-400'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-[11px]">Safety Subsystem</div>
                    <div className="text-[10px] text-slate-500">Enable Signal EN</div>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${selectedZone.sensors.systemEnable ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                </button>
              </div>
            </div>

            {/* Zone Logic Circuit Visualizer */}
            <LogicDiagram
              smoke={selectedZone.sensors.smoke}
              highTemp={selectedZone.sensors.tempHigh}
              manualEmergency={selectedZone.sensors.manualEmergency}
              zoneName={selectedZone.config.name}
            />

            {/* Live 3D Emergency Response Controls */}
            <div className="space-y-3 p-3 rounded-lg bg-industrial-950 border border-industrial-800">
              <div className="flex items-center justify-between pb-1 border-b border-industrial-800">
                <div className="flex items-center space-x-1.5 text-cyan-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                    Live 3D Emergency Responses
                  </span>
                </div>
                <span className="text-[10px] text-cyan-500 font-mono">3D STATE LINKED</span>
              </div>

              {/* Fire Suppression Sprinklers */}
              {(() => {
                const actionId = `ACT-SPRINKLER-${selectedZoneId}`;
                const action = simState.responseActions[actionId];
                const isActive = action?.status === 'ACTIVE';
                const isCompleted = action?.status === 'COMPLETED';

                return (
                  <div className="p-2.5 rounded bg-industrial-900 border border-industrial-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Droplets className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400 animate-bounce' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs text-slate-200">Fire Deluge Sprinklers</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        isActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        isCompleted ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        'bg-slate-900 text-slate-500'
                      }`}>
                        {action?.status || 'STANDBY'}
                      </span>
                    </div>

                    <div className="w-full bg-industrial-950 h-1.5 rounded-full overflow-hidden border border-industrial-800">
                      <div 
                        className="bg-cyan-500 h-full transition-all duration-300"
                        style={{ width: `${action?.progress || 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        {isActive ? 'Spraying water droplets in 3D...' : isCompleted ? 'Suppression cycle complete' : 'Ready for activation'}
                      </span>
                      <button
                        onClick={() => {
                          if (isActive) {
                            simulationStore.deactivateResponseAction(actionId);
                          } else {
                            simulationStore.activateResponseAction(actionId);
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] rounded font-bold transition-all ${
                          isActive 
                            ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800' 
                            : 'bg-cyan-600 hover:bg-cyan-500 text-industrial-950'
                        }`}
                      >
                        {isActive ? 'DEACTIVATE' : 'ACTIVATE SPRINKLERS'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Smoke Ventilation Louvers & Fans */}
              {(() => {
                const actionId = `ACT-VENT-${selectedZoneId}`;
                const action = simState.responseActions[actionId];
                const isActive = action?.status === 'ACTIVE';
                const isCompleted = action?.status === 'COMPLETED';

                return (
                  <div className="p-2.5 rounded bg-industrial-900 border border-industrial-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wind className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400 animate-spin' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs text-slate-200">High-Flow Smoke Ventilation</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        isActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        isCompleted ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        'bg-slate-900 text-slate-500'
                      }`}>
                        {action?.status || 'STANDBY'}
                      </span>
                    </div>

                    <div className="w-full bg-industrial-950 h-1.5 rounded-full overflow-hidden border border-industrial-800">
                      <div 
                        className="bg-sky-500 h-full transition-all duration-300"
                        style={{ width: `${action?.progress || 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        {isActive ? 'Spinning exhaust fan blades in 3D...' : isCompleted ? 'Smoke purged to safe levels' : 'Standby auto-dampers'}
                      </span>
                      <button
                        onClick={() => {
                          if (isActive) {
                            simulationStore.deactivateResponseAction(actionId);
                          } else {
                            simulationStore.activateResponseAction(actionId);
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] rounded font-bold transition-all ${
                          isActive 
                            ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800' 
                            : 'bg-cyan-600 hover:bg-cyan-500 text-industrial-950'
                        }`}
                      >
                        {isActive ? 'DEACTIVATE' : 'ACTIVATE VENTILATION'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Thermal Forced Cooling Fans */}
              {(() => {
                const actionId = `ACT-COOL-${selectedZoneId}`;
                const action = simState.responseActions[actionId];
                const isActive = action?.status === 'ACTIVE';
                const isCompleted = action?.status === 'COMPLETED';

                return (
                  <div className="p-2.5 rounded bg-industrial-900 border border-industrial-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Snowflake className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs text-slate-200">Thermal Chiller Cooling</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        isActive ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        isCompleted ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        'bg-slate-900 text-slate-500'
                      }`}>
                        {action?.status || 'STANDBY'}
                      </span>
                    </div>

                    <div className="w-full bg-industrial-950 h-1.5 rounded-full overflow-hidden border border-industrial-800">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${action?.progress || 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        {isActive ? 'Chiller fans operating in 3D...' : isCompleted ? 'Heat reduced to safe baseline' : 'Forced-air cooling idle'}
                      </span>
                      <button
                        onClick={() => {
                          if (isActive) {
                            simulationStore.deactivateResponseAction(actionId);
                          } else {
                            simulationStore.activateResponseAction(actionId);
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] rounded font-bold transition-all ${
                          isActive 
                            ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800' 
                            : 'bg-cyan-600 hover:bg-cyan-500 text-industrial-950'
                        }`}
                      >
                        {isActive ? 'DEACTIVATE' : 'ACTIVATE COOLING'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Calculated Digital Control Outputs */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-industrial-800 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Calculated Digital Outputs</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-industrial-950 border border-industrial-800 flex justify-between items-center">
                  <span className="text-slate-400">Alarm Stage 1:</span>
                  <span className={selectedZone.outputs.alarmStage1 ? 'text-amber-400 font-bold' : 'text-slate-600'}>
                    {selectedZone.outputs.alarmStage1 ? 'ACTIVE (1)' : 'OFF (0)'}
                  </span>
                </div>

                <div className="p-2 rounded bg-industrial-950 border border-industrial-800 flex justify-between items-center">
                  <span className="text-slate-400">Alarm Stage 2:</span>
                  <span className={selectedZone.outputs.alarmStage2 ? 'text-red-400 font-bold' : 'text-slate-600'}>
                    {selectedZone.outputs.alarmStage2 ? 'ACTIVE (1)' : 'OFF (0)'}
                  </span>
                </div>

                <div className="p-2 rounded bg-industrial-950 border border-industrial-800 flex justify-between items-center">
                  <span className="text-slate-400">Ventilation Override:</span>
                  <span className={selectedZone.outputs.ventilationOverride ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
                    {selectedZone.outputs.ventilationOverride ? 'OPEN (1)' : 'AUTO (0)'}
                  </span>
                </div>

                <div className="p-2 rounded bg-industrial-950 border border-industrial-800 flex justify-between items-center">
                  <span className="text-slate-400">Blast Doors Unlock:</span>
                  <span className={selectedZone.outputs.exitDoorUnlock ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                    {selectedZone.outputs.exitDoorUnlock ? 'UNLOCKED (1)' : 'SECURE (0)'}
                  </span>
                </div>

                <div className="p-2 rounded bg-industrial-950 border border-industrial-800 flex justify-between items-center">
                  <span className="text-slate-400">Telemetry Parity:</span>
                  <span className={selectedZone.outputs.parityValid ? 'text-emerald-400 font-bold' : 'text-purple-400 font-bold'}>
                    {selectedZone.outputs.parityValid ? 'VALID (0 ERR)' : 'CORRUPT'}
                  </span>
                </div>

                <div className="p-2 rounded bg-industrial-950 border border-industrial-800 flex justify-between items-center">
                  <span className="text-slate-400">Priority Encoder:</span>
                  <span className="text-slate-300 font-bold">
                    Channel {selectedZone.outputs.encodedPriority}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer inside Drawer */}
            <div className="pt-2 border-t border-industrial-800 flex items-center space-x-2">
              <button
                onClick={() => simulationStore.clearHazardInZone(selectedZoneId)}
                className="flex-1 py-2 px-3 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Extinguish / Clear Zone</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
