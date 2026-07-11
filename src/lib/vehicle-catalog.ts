import type { SeatConfiguration, VehicleModel } from './types';



/** Canonical trim name for the long-wheelbase Model Y. */

export const PREMIUM_LONG_WHEELBASE_TRIM = 'Premium Long Wheelbase';



/** Local fleet photography (portfolio-safe, de-badged). */

export const FLEET_IMAGES = {

  modelY67: '/vehicles/ModelY_67.jpg',

  modelYPremium50: '/vehicles/ModelYPremium_50.jpg',

  modelYPremium68: '/vehicles/ModelYPremium_68.jpg',

  modelYPerformance70: '/vehicles/ModelYPerformance_70.jpg',

  model388: '/vehicles/Model3_88.jpg',

  model3Premium64: '/vehicles/Model3Premium_64.jpg',

  model3Performance96: '/vehicles/Model3Performance_96.jpg',

  modelYLCosmicSilver: '/vehicles/ModelYL_na_91.jpg',

  cybertruckPremium: '/vehicles/Cybertruck_61.jpg',
  cybertruckDualMotor: '/vehicles/Cybertruck_65.jpg',
  cybertruckCyberbeast: '/vehicles/Cybertruck_71.jpg',
  modelS: '/vehicles/Group_56.jpg',
  modelX: '/vehicles/Group_61.jpg',

} as const;



/** Maps legacy trim labels to current display names. */

export const TRIM_ALIASES: Record<string, string> = {

  'Base Model RWD': 'Rear-Wheel Drive',

  'Base Model AWD': 'All-Wheel Drive',

  'Premium RWD': 'Premium Rear-Wheel Drive',

  'Premium AWD': 'Premium All-Wheel Drive',

  'Rear Wheel Drive': 'Rear-Wheel Drive',

  'All Wheel Drive': 'All-Wheel Drive',

  'Premium Rear Wheel Drive': 'Premium Rear-Wheel Drive',

  'Premium All Wheel Drive': 'Premium All-Wheel Drive',

  'Model Y L': PREMIUM_LONG_WHEELBASE_TRIM,

  'Dual Motor AWD': 'Dual Motor All-Wheel Drive',

};



export function normalizeTrim(trim: string, model?: VehicleModel): string {

  const direct = TRIM_ALIASES[trim];

  if (direct) return direct;



  const collapsed = trim.replace(/\s+/g, ' ').trim();

  if (/^model y l$/i.test(collapsed)) return PREMIUM_LONG_WHEELBASE_TRIM;

  if (/premium.*long.*wheelbase/i.test(collapsed)) return PREMIUM_LONG_WHEELBASE_TRIM;

  if (/^performance$/i.test(collapsed)) return 'Performance';

  if (/dual motor.*all.*wheel/i.test(collapsed)) return 'Dual Motor All-Wheel Drive';

  if (/^cyberbeast$/i.test(collapsed)) return 'Cyberbeast';

  if (/premium.*all.*wheel/i.test(collapsed)) return 'Premium All-Wheel Drive';

  if (/premium.*rear.*wheel/i.test(collapsed)) return 'Premium Rear-Wheel Drive';

  if (/^rear.*wheel.*drive$/i.test(collapsed)) return 'Rear-Wheel Drive';

  if (/^all.*wheel.*drive$/i.test(collapsed)) {

    if (model === 'Cybertruck') return 'Premium All-Wheel Drive';

    return 'All-Wheel Drive';

  }



  return trim;

}



type TrimTier = 'base' | 'premium' | 'performance' | 'longWheelbase';



function getTrimTier(model: VehicleModel, trim: string): TrimTier {

  const t = normalizeTrim(trim, model);

  if (model === 'Model Y' && t === PREMIUM_LONG_WHEELBASE_TRIM) return 'longWheelbase';

  if (t === 'Performance') return 'performance';

  if (t.startsWith('Premium')) return 'premium';

  if (

    (model === 'Model 3' && t === 'Rear-Wheel Drive') ||

    (model === 'Model Y' && (t === 'Rear-Wheel Drive' || t === 'All-Wheel Drive'))

  ) {

    return 'base';

  }

  return 'base';

}



const BASE_EXTERIOR = ['Stealth Grey', 'Pearl White Multi-Coat', 'Diamond Black'] as const;

const PREMIUM_EXTERIOR = [

  'Stealth Grey',

  'Pearl White Multi-Coat',

  'Marine Blue',

  'Diamond Black',

  'Ultra Red',

  'Quicksilver',

] as const;

const PERFORMANCE_EXTERIOR = [

  'Stealth Grey',

  'Pearl White Multi-Coat',

  'Frost Blue Metallic',

  'Diamond Black',

  'Ultra Red',

  'Quicksilver',

] as const;



const BASE_INTERIOR = ['Black'] as const;

const PREMIUM_INTERIOR = ['Black', 'Black and White'] as const;

const LONG_WHEELBASE_INTERIOR = ['Black', 'Zen Grey'] as const;

/** Premium Model Y exterior palette with Quicksilver replaced by Cosmic Silver. */
const LONG_WHEELBASE_EXTERIOR = [
  'Stealth Grey',
  'Pearl White Multi-Coat',
  'Marine Blue',
  'Diamond Black',
  'Ultra Red',
  'Cosmic Silver',
] as const;



const WHEELS_BY_TRIM: Partial<Record<VehicleModel, Record<string, readonly string[]>>> = {

  'Model 3': {

    'Rear-Wheel Drive': ['18" Prismata Wheels', '19" Nova Wheels'],

    'Premium Rear-Wheel Drive': ['18" Photon Wheels', '19" Nova Wheels'],

    'Premium All-Wheel Drive': ['18" Photon Wheels', '19" Nova Wheels'],

    Performance: ['20" Warp Wheels'],

  },

  'Model Y': {

    'Rear-Wheel Drive': ['18" Aperture Wheels', '19" Crossflow Wheels'],

    'All-Wheel Drive': ['18" Aperture Wheels', '19" Crossflow Wheels'],

    'Premium Rear-Wheel Drive': ['19" Crossflow Wheels', '20" Helix 2.0 Wheels'],

    'Premium All-Wheel Drive': ['19" Crossflow Wheels', '20" Helix 2.0 Wheels'],

    Performance: ['21" Arachnid 2.0 Wheels'],

    [PREMIUM_LONG_WHEELBASE_TRIM]: ['19" Machina 2.0 Wheels', '20" Uberhelix Wheels'],

  },

  Cybertruck: {

    'Dual Motor All-Wheel Drive': ['18" Molten Wheels', '20" Core Wheels'],

    'Premium All-Wheel Drive': ['20" Core Wheels', '20" Mantle Wheels'],

    Cyberbeast: ['20" Core Wheels', '20" Mantle Wheels'],

  },

};

const CYBERTRUCK_INTERIOR_BY_TRIM: Record<string, readonly string[]> = {

  'Dual Motor All-Wheel Drive': ['Textile Seats'],

  'Premium All-Wheel Drive': ['Tactical Grey decor', 'White Decor'],

  Cyberbeast: ['Tactical Grey decor', 'White Decor'],

};



const IMAGES_BY_TRIM: Partial<Record<VehicleModel, Record<string, string>>> = {

  'Model 3': {

    'Rear-Wheel Drive': FLEET_IMAGES.model388,

    'Premium Rear-Wheel Drive': FLEET_IMAGES.model3Premium64,

    'Premium All-Wheel Drive': FLEET_IMAGES.model3Premium64,

    Performance: FLEET_IMAGES.model3Performance96,

  },

  'Model Y': {

    'Rear-Wheel Drive': FLEET_IMAGES.modelY67,

    'All-Wheel Drive': FLEET_IMAGES.modelY67,

    'Premium Rear-Wheel Drive': FLEET_IMAGES.modelYPremium68,

    'Premium All-Wheel Drive': FLEET_IMAGES.modelYPremium50,

    Performance: FLEET_IMAGES.modelYPerformance70,

    [PREMIUM_LONG_WHEELBASE_TRIM]: FLEET_IMAGES.modelYLCosmicSilver,

  },

  'Model S': {
    'All-Wheel Drive': FLEET_IMAGES.modelS,
    Plaid: FLEET_IMAGES.modelS,
  },

  'Model X': {
    'All-Wheel Drive': FLEET_IMAGES.modelX,
    Plaid: FLEET_IMAGES.modelX,
  },

  Cybertruck: {
    'Dual Motor All-Wheel Drive': FLEET_IMAGES.cybertruckDualMotor,
    'Premium All-Wheel Drive': FLEET_IMAGES.cybertruckPremium,
    Cyberbeast: FLEET_IMAGES.cybertruckCyberbeast,
  },

};



export function getFleetImage(model: VehicleModel, trim: string): string | undefined {

  const normalized = normalizeTrim(trim, model);

  const direct = IMAGES_BY_TRIM[model]?.[normalized];

  if (direct) return direct;



  if (model === 'Model 3' && normalized === 'All-Wheel Drive') {

    return IMAGES_BY_TRIM['Model 3']?.['Premium All-Wheel Drive'];

  }



  return undefined;

}



/** Models with trim-mapped local fleet photography. */

export function hasFleetPhotography(model: VehicleModel): boolean {

  return (
    model === 'Model 3' ||
    model === 'Model Y' ||
    model === 'Model S' ||
    model === 'Model X' ||
    model === 'Cybertruck'
  );

}



export function getExteriorColorsForVehicle(model: VehicleModel, trim: string): string[] {

  const tier = getTrimTier(model, trim);

  if (tier === 'longWheelbase') return [...LONG_WHEELBASE_EXTERIOR];

  if (tier === 'performance') return [...PERFORMANCE_EXTERIOR];

  if (tier === 'premium') return [...PREMIUM_EXTERIOR];

  if (model === 'Model 3' || model === 'Model Y') return [...BASE_EXTERIOR];

  return [];

}



export function getInteriorColorsForVehicle(model: VehicleModel, trim: string): string[] {

  const normalized = normalizeTrim(trim, model);

  if (model === 'Cybertruck') {

    return [...(CYBERTRUCK_INTERIOR_BY_TRIM[normalized] ?? ['Tactical Grey decor', 'White Decor'])];

  }

  const tier = getTrimTier(model, trim);

  if (tier === 'longWheelbase') return [...LONG_WHEELBASE_INTERIOR];

  if (tier === 'premium' || tier === 'performance') return [...PREMIUM_INTERIOR];

  if (model === 'Model 3' || model === 'Model Y') return [...BASE_INTERIOR];

  return [];

}



export function getWheelsForVehicle(model: VehicleModel, trim: string): string[] {

  const normalized = normalizeTrim(trim, model);

  const trimWheels = WHEELS_BY_TRIM[model]?.[normalized];

  if (trimWheels) return [...trimWheels];

  return [];

}



/**

 * Seat layouts by trim:

 * - Model 3 (all trims): 5-seater

 * - Model Y base / Premium RWD / Performance: 5-seater

 * - Model Y Premium AWD: 7-seater

 * - Model Y Premium Long Wheelbase: 6-seater

 */

export function getSeatsForVehicle(model: VehicleModel, trim: string): SeatConfiguration[] {

  const normalized = normalizeTrim(trim, model);

  if (model === 'Model 3') return ['5-seater'];

  if (model === 'Model Y') {

    if (normalized === PREMIUM_LONG_WHEELBASE_TRIM) return ['6-seater'];

    if (normalized === 'Premium All-Wheel Drive') return ['7-seater'];

    return ['5-seater'];

  }

  if (model === 'Model S') return ['5-seater'];

  if (model === 'Model X') return ['5-seater', '6-seater', '7-seater'];

  if (model === 'Cybertruck') return ['5-seater'];

  if (model === 'Roadster') return ['4-seater'];

  return ['5-seater'];

}



/** Human-readable seat label for fleet cards. */

export function getSeatDisplayLabel(seats: SeatConfiguration): string {

  switch (seats) {

    case '5-seater':

      return 'Five-Seat Interior';

    case '6-seater':

      return 'Six-Seat Interior';

    case '7-seater':

      return 'Seven-Seat Interior';

    default:

      return seats;

  }

}


