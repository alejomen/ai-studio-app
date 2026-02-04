
export enum LayoutType {
  LINEAR = 'LINEAL',
  RECTANGULAR = 'RECTANGULAR',
  L_SHAPE = 'FORMA L',
  U_SHAPE = 'FORMA U'
}

export enum MountingType {
  SUSPENDIDO = 'SUSPENDIDO',
  SUPERFICIAL = 'SUPERFICIAL',
  EMBUTIDO = 'EMBUTIDO'
}

export enum EnvironmentType {
  HOME = 'HOGAR',
  OFFICE = 'OFICINA'
}

export enum LampType {
  SPOT_DIRECTIONAL = 'SPOT_DIRECTIONAL',
  FIXED_RACK = 'FIXED_RACK'
}

export interface PlacedLamp {
  id: string;
  type: LampType;
  trackIndex: number;
  position: number;
  rotation: number;
}

export interface TrackSystemConfig {
  id: string;
  layout: LayoutType;
  mounting: MountingType;
  width: number;
  depth: number;
  position: [number, number, number];
  rotation: number; // 90 degree increments
  lamps: PlacedLamp[];
}

export type EnvObjectType = 'sofa' | 'coffeeTable' | 'officeTable' | 'sideboard' | 'loungeChair' | 'bookshelf' | 'lowCabinet';

export interface EnvironmentObject {
  id: string;
  type: EnvObjectType;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface ConfigState {
  environmentType: EnvironmentType;
  ceilingHeight: number;
  suspensionHeight: number;
  systems: TrackSystemConfig[];
  selectedSystemId: string | null;
  selectedObjectId: string | null;
  includeInstallation: boolean;
  includeShipping: boolean;
  showEnvironment: boolean;
  envObjects: EnvironmentObject[];
}

export const PRICING = {
  RAIL_KIT_2M: 70,
  SPOT_DIRECTIONAL: 33,
  FIXED_RACK: 60,
  CORNER_PIECE: 25,
  INSTALLATION_BASE: 50,
  INSTALLATION_PER_ITEM: 5,
  SHIPPING: 25
};

export interface ProductDetail {
  id: LampType;
  name: string;
  price: number;
  description: string;
  image: string;
}

export const PRODUCT_DETAILS: Record<LampType, ProductDetail> = {
  [LampType.SPOT_DIRECTIONAL]: {
    id: LampType.SPOT_DIRECTIONAL,
    name: 'Spot Bala Magnético 12W',
    price: 33,
    description: 'Track Light Negro Tipo Bala Magnético para Riel 4000K 12W (45 mm). Ajustable 360 grados.',
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400'
  },
  [LampType.FIXED_RACK]: {
    id: LampType.FIXED_RACK,
    name: 'Rack Lineal Fijo 8 Luces',
    price: 60,
    description: 'Sistema fijo de 8 puntos LED integrados en perfil lineal magnético. Luz difusa técnica.',
    image: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&q=80&w=400'
  }
};
