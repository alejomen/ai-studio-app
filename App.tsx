
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Scene3D } from './components/Scene3D';
import { Sidebar } from './components/Sidebar';
import { ProductModal } from './components/ProductModal';
import { ConfigState, LayoutType, MountingType, PlacedLamp, PRICING, LampType, EnvironmentType, TrackSystemConfig, EnvironmentObject, EnvObjectType } from './types';
import * as THREE from 'three';

const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/clase-22b0d.appspot.com/o/Logo%20EOS.png?alt=media&token=81387693-02f3-424a-939e-4054a1a5b481";

const DEFAULT_HOME: EnvironmentObject[] = [
  { id: 'h1', type: 'sofa', position: [0, 0, -2.5], rotation: [0, 0, 0] },
  { id: 'h2', type: 'coffeeTable', position: [0, 0, -1], rotation: [0, 0, 0] },
  { id: 'h3', type: 'sideboard', position: [2.5, 0, -2.5], rotation: [0, -Math.PI / 2, 0] },
  { id: 'h4', type: 'loungeChair', position: [-2, 0, -1.5], rotation: [0, Math.PI / 4, 0] }
];

const DEFAULT_OFFICE: EnvironmentObject[] = [
  { id: 'o1', type: 'officeTable', position: [0, 0, 0], rotation: [0, 0, 0] },
  { id: 'o2', type: 'officeTable', position: [2.5, 0, 0], rotation: [0, 0, 0] },
  { id: 'o3', type: 'bookshelf', position: [0, 0, -3], rotation: [0, 0, 0] },
  { id: 'o4', type: 'lowCabinet', position: [-2.5, 0, 0], rotation: [0, Math.PI / 2, 0] }
];

const App: React.FC = () => {
  const initialSystemId = Math.random().toString(36).substr(2, 9);
  const [config, setConfig] = useState<ConfigState>({
    environmentType: EnvironmentType.HOME,
    ceilingHeight: 3,
    suspensionHeight: 0.6,
    systems: [{
      id: initialSystemId,
      layout: LayoutType.LINEAR,
      mounting: MountingType.SUSPENDIDO,
      width: 3,
      depth: 2,
      position: [0, 0, 0],
      rotation: 0,
      lamps: []
    }],
    selectedSystemId: initialSystemId,
    selectedObjectId: null,
    includeInstallation: false,
    includeShipping: false,
    showEnvironment: true,
    envObjects: [...DEFAULT_HOME]
  });

  const [history, setHistory] = useState<ConfigState[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [activeLampType, setActiveLampType] = useState<LampType | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<LampType | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneGroupRef = useRef<THREE.Group>(null);

  const saveHistory = useCallback((newState: ConfigState) => {
    setHistory(prev => {
      const last = prev[prev.length - 1];
      if (JSON.stringify(last) === JSON.stringify(newState)) return prev;
      return [...prev.slice(-19), newState];
    });
  }, []);

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setConfig(prev);
    }
  };

  const updateConfig = (key: keyof ConfigState, value: any) => {
    saveHistory(config);
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleEnvironment = () => {
    saveHistory(config);
    setConfig(prev => ({ ...prev, showEnvironment: !prev.showEnvironment }));
  };

  const handleEnvironmentTypeChange = (type: EnvironmentType) => {
    saveHistory(config);
    setConfig(prev => ({
      ...prev,
      environmentType: type,
      selectedObjectId: null,
      envObjects: type === EnvironmentType.HOME ? [...DEFAULT_HOME] : [...DEFAULT_OFFICE]
    }));
  };

  const quoteData = useMemo(() => {
    let totalRailLength = 0;
    let totalCorners = 0;
    let totalSpots = 0;
    let totalRacks = 0;

    config.systems.forEach(sys => {
      let l = 0; let c = 0;
      switch (sys.layout) {
        case LayoutType.LINEAR: l = sys.width; c = 0; break;
        case LayoutType.RECTANGULAR: l = (sys.width * 2) + (sys.depth * 2); c = 4; break;
        case LayoutType.L_SHAPE: l = sys.width + sys.depth; c = 1; break;
        case LayoutType.U_SHAPE: l = (sys.width * 2) + sys.depth; c = 2; break;
      }
      totalRailLength += l; totalCorners += c;
      totalSpots += sys.lamps.filter(lamp => lamp.type === LampType.SPOT_DIRECTIONAL).length;
      totalRacks += sys.lamps.filter(lamp => lamp.type === LampType.FIXED_RACK).length;
    });

    const railSegments = Math.ceil(totalRailLength / 2);
    const railCost = railSegments * PRICING.RAIL_KIT_2M;
    const cornersCost = totalCorners * PRICING.CORNER_PIECE;
    const spotsCost = totalSpots * PRICING.SPOT_DIRECTIONAL;
    const racksCost = totalRacks * PRICING.FIXED_RACK;
    const installationCost = config.includeInstallation ? PRICING.INSTALLATION_BASE + ((totalSpots + totalRacks) * PRICING.INSTALLATION_PER_ITEM) : 0;
    const shippingCost = config.includeShipping ? PRICING.SHIPPING : 0;

    return {
      railSegments, railCost, cornerCount: totalCorners, cornersCost, spotCount: totalSpots, spotsCost, rackCount: totalRacks, racksCost,
      installationCost, shippingCost, total: railCost + cornersCost + spotsCost + racksCost + installationCost + shippingCost
    };
  }, [config]);

  const updateSystemPosition = (id: string, newPos: [number, number, number]) => {
    setConfig(prev => ({ 
      ...prev, 
      systems: prev.systems.map(s => s.id === id ? { ...s, position: newPos } : s) 
    }));
  };

  const updateObjectPosition = (id: string, newPos: [number, number, number]) => {
    setConfig(prev => ({ 
      ...prev, 
      envObjects: prev.envObjects.map(o => o.id === id ? { ...o, position: [newPos[0], o.position[1], newPos[2]] } : o) 
    }));
  };

  const deleteObject = (id: string) => {
    saveHistory(config);
    setConfig(prev => ({
      ...prev,
      envObjects: prev.envObjects.filter(o => o.id !== id),
      selectedObjectId: prev.selectedObjectId === id ? null : prev.selectedObjectId
    }));
  };

  const rotateObject = (id: string) => {
    saveHistory(config);
    setConfig(prev => ({
      ...prev,
      envObjects: prev.envObjects.map(o => o.id === id ? { ...o, rotation: [o.rotation[0], o.rotation[1] + Math.PI / 2, o.rotation[2]] } : o)
    }));
  };

  const addLamp = useCallback((type: LampType, systemId: string, trackIndex: number, position: number) => {
    saveHistory(config);
    const newLamp: PlacedLamp = {
      id: Math.random().toString(36).substr(2, 9),
      type, trackIndex, position,
      rotation: type === LampType.SPOT_DIRECTIONAL ? (Math.random() - 0.5) * 2 * Math.PI : 0
    };
    setConfig(prev => ({
      ...prev,
      systems: prev.systems.map(sys => sys.id === systemId ? { ...sys, lamps: [...sys.lamps, newLamp] } : sys)
    }));
  }, [config, saveHistory]);

  const removeLamp = useCallback((systemId: string, lampId: string) => {
    saveHistory(config);
    setConfig(prev => ({
      ...prev,
      systems: prev.systems.map(sys => sys.id === systemId ? { ...sys, lamps: sys.lamps.filter(l => l.id !== lampId) } : sys)
    }));
  }, [config, saveHistory]);

  const cloneObject = (id: string) => {
    saveHistory(config);
    const obj = config.envObjects.find(o => o.id === id);
    if (!obj) return;
    const newObj: EnvironmentObject = {
      ...obj,
      id: Math.random().toString(36).substr(2, 9),
      position: [obj.position[0] + 0.5, obj.position[1], obj.position[2] + 0.5]
    };
    setConfig(prev => ({ ...prev, envObjects: [...prev.envObjects, newObj] }));
  };

  const handleExport3D = async () => {
    if (!sceneGroupRef.current) return;
    const { ColladaExporter } = await import('three/examples/jsm/exporters/ColladaExporter.js');
    const exporter = new ColladaExporter();
    exporter.parse(sceneGroupRef.current, (result) => {
      const blob = new Blob([result.data], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eos_iluminacion_3d.dae`;
      link.click();
    }, { version: '1.4.1' });
  };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden relative">
      <div className="flex-1 relative cursor-crosshair">
        <Scene3D 
          config={config} 
          activeLampType={activeLampType}
          onPlaceLamp={addLamp}
          onRemoveLamp={removeLamp}
          canvasRef={canvasRef}
          sceneGroupRef={sceneGroupRef}
          onUpdateSystemPos={updateSystemPosition}
          onUpdateObjectPos={updateObjectPosition}
          onCloneObject={cloneObject}
          onDeleteObject={deleteObject}
          onSelectObject={(id) => setConfig(prev => ({ ...prev, selectedObjectId: id }))}
          deleteMode={deleteMode}
        />
        <div className="absolute bottom-8 left-8 w-48 z-10">
          <img 
            src={LOGO_URL} 
            alt="EOS Logo" 
            className="w-full h-auto drop-shadow-md" 
            crossOrigin="anonymous"
          />
        </div>
      </div>
      <Sidebar 
        config={config} 
        setConfig={setConfig} 
        updateConfig={updateConfig}
        quoteData={quoteData}
        activeLampType={activeLampType} 
        setActiveLampType={setActiveLampType}
        onDownloadPDF={() => {}} // Reference implementation already provided
        onExport3D={handleExport3D}
        onProductDetail={setSelectedProduct}
        logoUrl={LOGO_URL}
        onUndo={handleUndo}
        canUndo={history.length > 0}
        onToggleEnv={toggleEnvironment}
        deleteMode={deleteMode}
        setDeleteMode={setDeleteMode}
        onEnvTypeChange={handleEnvironmentTypeChange}
        onRotateObject={rotateObject}
      />
      <ProductModal productType={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
};

export default App;
