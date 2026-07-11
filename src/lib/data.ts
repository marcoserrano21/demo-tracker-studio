

import type { Store, StoreInfo, DriveLog, Vehicle, Advisor, VehicleModel, UserRole } from './types';
import {
  FLEET_IMAGES,
  PREMIUM_LONG_WHEELBASE_TRIM,
  getExteriorColorsForVehicle,
  getInteriorColorsForVehicle,
  getWheelsForVehicle,
  getSeatsForVehicle,
  getFleetImage,
  hasFleetPhotography,
  normalizeTrim,
  getSeatDisplayLabel,
} from './vehicle-catalog';

/** Generic EV imagery via Unsplash (portfolio-safe, no OEM asset dependencies). */
const EV_SEDAN =
  'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80';
const EV_SUV =
  'https://images.unsplash.com/photo-1619767886555-ef584397c424?w=800&q=80';
const EV_SPORTS =
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80';

export const MODEL_Y_L_IMAGE = FLEET_IMAGES.modelYLCosmicSilver;

export const modelImages: Record<string, string> = {
  'Model S': FLEET_IMAGES.modelS,
  'Model 3': EV_SEDAN,
  'Model X': FLEET_IMAGES.modelX,
  'Model Y': EV_SUV,
  Cybertruck: FLEET_IMAGES.cybertruckPremium,
  Roadster: EV_SPORTS,
};

export const vehicleImageMap: Record<
  VehicleModel,
  { default: string; trims?: Record<string, string> }
> = {
  'Model S': { default: FLEET_IMAGES.modelS },
  'Model 3': { default: FLEET_IMAGES.model388, trims: {
    'Rear-Wheel Drive': FLEET_IMAGES.model388,
    'Premium Rear-Wheel Drive': FLEET_IMAGES.model3Premium64,
    'Premium All-Wheel Drive': FLEET_IMAGES.model3Premium64,
    Performance: FLEET_IMAGES.model3Performance96,
  }},
  'Model X': { default: FLEET_IMAGES.modelX },
  'Model Y': { default: FLEET_IMAGES.modelY67, trims: {
    'Rear-Wheel Drive': FLEET_IMAGES.modelY67,
    'All-Wheel Drive': FLEET_IMAGES.modelY67,
    'Premium Rear-Wheel Drive': FLEET_IMAGES.modelYPremium68,
    'Premium All-Wheel Drive': FLEET_IMAGES.modelYPremium50,
    Performance: FLEET_IMAGES.modelYPerformance70,
    [PREMIUM_LONG_WHEELBASE_TRIM]: FLEET_IMAGES.modelYLCosmicSilver,
  }},
  Cybertruck: {
    default: FLEET_IMAGES.cybertruckPremium,
    trims: {
      'Dual Motor All-Wheel Drive': FLEET_IMAGES.cybertruckDualMotor,
      'Premium All-Wheel Drive': FLEET_IMAGES.cybertruckPremium,
      Cyberbeast: FLEET_IMAGES.cybertruckCyberbeast,
    },
  },
  Roadster: { default: EV_SPORTS },
};


export function getVehicleImage(model: VehicleModel, trim: string, imageUrl?: string): string {
    const normalizedTrim = normalizeTrim(trim, model);
    const fleetImage = getFleetImage(model, normalizedTrim);
    // Trim-mapped fleet photos always win over stale Firestore imageUrl values.
    if (fleetImage) return fleetImage;
    if (imageUrl && !hasFleetPhotography(model)) return imageUrl;
    const modelData = vehicleImageMap[model];
    if (modelData?.trims?.[normalizedTrim]) {
        return modelData.trims[normalizedTrim];
    }
    if (imageUrl) return imageUrl;
    return modelData?.default || modelImages['Model 3'];
}

export { getExteriorColorsForVehicle, getInteriorColorsForVehicle, getWheelsForVehicle, getSeatsForVehicle, normalizeTrim, getSeatDisplayLabel, PREMIUM_LONG_WHEELBASE_TRIM };

export const vehicleOptions = {
  trims: {
    'Model S': ['All-Wheel Drive', 'Plaid'],
    'Model 3': ['Rear-Wheel Drive', 'Premium Rear-Wheel Drive', 'Premium All-Wheel Drive', 'Performance'],
    'Model X': ['All-Wheel Drive', 'Plaid'],
    'Model Y': ['Rear-Wheel Drive', 'All-Wheel Drive', 'Premium Rear-Wheel Drive', 'Premium All-Wheel Drive', 'Performance', PREMIUM_LONG_WHEELBASE_TRIM],
    'Cybertruck': ['Dual Motor All-Wheel Drive', 'Premium All-Wheel Drive', 'Cyberbeast'],
    'Roadster': ["Founder's Series"],
  },
  exteriorColors: {
    'Model S': ['Stealth Grey', 'Pearl White', 'Diamond Black', 'Frost Blue Metallic', 'Ultra Red', 'Lunar Silver'],
    'Model X': ['Stealth Grey', 'Pearl White', 'Diamond Black', 'Frost Blue Metallic', 'Ultra Red', 'Lunar Silver'],
    'Cybertruck': ['Stainless Steel'],
    'Roadster': ['Signature Red', 'Electric Blue', 'Jet Black'],
  },
  interiorColors: {
    'Model S': ['All black / Ebony Decor', 'Black and White / Walnut Decor', 'Cream / Walnut Decor'],
    'Model X': ['All black / Ebony Decor', 'Black and White / Walnut Decor', 'Cream / Walnut Decor'],
    'Cybertruck': ['Tactical Grey decor', 'White Decor'],
    'Roadster': ['Black', 'White', 'Red'],
  },
  wheels: {
    'Model S': ['19" Magnetite Wheels', '21" Velarium Wheels'],
    'Model X': ['20" Perihelix Wheels', '22" Machina Wheels'],
    'Cybertruck': ['20" Core Wheels', '20" Mantle Wheels'],
    'Roadster': ['21" Arachnid Wheels'],
  },
};

const allAdvisors: Omit<Advisor, 'id' | 'storeId'>[] = [
  { name: 'Alice Johnson', email: 'alice.j@demo.local', role: 'advisor' },
  { name: 'Bob Williams', email: 'bob.w@demo.local', role: 'advisor' },
  { name: 'Charlie Brown', email: 'charlie.b@demo.local', role: 'advisor' },
  { name: 'Diana Miller', email: 'diana.m@demo.local', role: 'advisor' },
  { name: 'Ethan Davis', email: 'ethan.d@demo.local', role: 'advisor' },
  { name: 'Fiona Garcia', email: 'fiona.g@demo.local', role: 'advisor' },
  { name: 'George Rodriguez', email: 'george.r@demo.local', role: 'advisor' },
  { name: 'Hannah Martinez', email: 'hannah.m@demo.local', role: 'advisor' },
  { name: 'Ian Hernandez', email: 'ian.h@demo.local', role: 'advisor' },
  { name: 'Jasmine Lopez', email: 'jasmine.l@demo.local', role: 'advisor' },
  { name: 'Marco Serrano', email: 'marco.serrano@demo.local', role: 'moderator' },
];

const generateUniqueContent = (
  base: Omit<Vehicle, 'id' | 'vin' | 'wheelSize' | 'storeId'>,
  index: number,
  storeCode: string,
  wheelOverride?: string,
): Omit<Vehicle, 'id'> => {
  const vinEnd = (1000 + index).toString();
  const battery = Math.floor(Math.random() * 40) + 60; // 60-99%
  const wheelOptions = getWheelsForVehicle(base.model, base.trim);
  const plateSuffix = (100 + index).toString().slice(-3);
  return {
    ...base,
    storeId: storeCode,
    vin: `${base.model.substring(0,1)}${base.trim.substring(0,1)}${vinEnd}`,
    wheelSize: wheelOverride || wheelOptions[index % wheelOptions.length],
    batteryLevel: battery,
    licensePlate: `EV${plateSuffix}${storeCode.slice(0, 2).toUpperCase()}`,
  };
};

const getVehiclesForStore = (storeCode: string): Omit<Vehicle, 'id'>[] => {
    switch (storeCode) {
        case 'orlando-florida-mall':
            return [
                generateUniqueContent({ model: 'Model S', trim: 'Plaid', exteriorColor: 'Ultra Red', interiorColor: 'Cream', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: modelImages['Model S'] }, 1, storeCode),
                generateUniqueContent({ model: 'Model 3', trim: 'Premium All-Wheel Drive', exteriorColor: 'Pearl White Multi-Coat', interiorColor: 'Black and White', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model 3', 'Premium All-Wheel Drive') }, 2, storeCode),
                generateUniqueContent({ model: 'Model X', trim: 'Plaid', exteriorColor: 'Marine Blue', interiorColor: 'Black', status: 'On Demo', batteryLevel: 0, seats: '6-seater', imageUrl: modelImages['Model X'], driveStartedAt: Date.now() - (45 * 60 * 1000), expectedDuration: 60, currentDriveId: 'log-3' }, 3, storeCode),
                generateUniqueContent({ model: 'Model Y', trim: 'Performance', exteriorColor: 'Ultra Red', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model Y', 'Performance') }, 4, storeCode),
            ];
        case 'orlando-lee-vista-blvd':
            return [
                generateUniqueContent({ model: 'Cybertruck', trim: 'Cyberbeast', exteriorColor: 'Stainless Steel', interiorColor: 'Tactical Grey decor', status: 'Charging', batteryLevel: 0, seats: '5-seater', imageUrl: modelImages['Cybertruck'], currentDriveId: 'log-5' }, 5, storeCode),
                generateUniqueContent({ model: 'Model S', trim: 'All-Wheel Drive', exteriorColor: 'Solid Black', interiorColor: 'White', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: modelImages['Model S'] }, 6, storeCode),
                generateUniqueContent({ model: 'Model Y', trim: 'All-Wheel Drive', exteriorColor: 'Stealth Grey', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model Y', 'All-Wheel Drive') }, 7, storeCode),
                generateUniqueContent({ model: 'Model 3', trim: 'Performance', exteriorColor: 'Frost Blue Metallic', interiorColor: 'Black and White', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model 3', 'Performance') }, 8, storeCode),
            ];
        case 'orlando-john-young-pkwy':
            return [
                generateUniqueContent({ model: 'Model X', trim: 'All-Wheel Drive', exteriorColor: 'Stealth Gray', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '7-seater', imageUrl: modelImages['Model X'] }, 9, storeCode),
                generateUniqueContent({ model: 'Roadster', trim: "Founder's Series", exteriorColor: 'Ultra Red', interiorColor: 'White', status: 'Available', batteryLevel: 0, seats: '4-seater', imageUrl: modelImages['Roadster'] }, 10, storeCode),
                generateUniqueContent({ model: 'Model 3', trim: 'Rear-Wheel Drive', exteriorColor: 'Pearl White Multi-Coat', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model 3', 'Rear-Wheel Drive') }, 11, storeCode),
                generateUniqueContent({ model: 'Model Y', trim: 'Rear-Wheel Drive', exteriorColor: 'Pearl White Multi-Coat', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model Y', 'Rear-Wheel Drive') }, 12, storeCode),
            ];
        case 'clermont':
             return [
                generateUniqueContent({ model: 'Model S', trim: 'Plaid', exteriorColor: 'Pearl White Multi-Coat', interiorColor: 'Cream', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: modelImages['Model S'] }, 13, storeCode),
                generateUniqueContent({ model: 'Model Y', trim: 'Performance', exteriorColor: 'Frost Blue Metallic', interiorColor: 'Black and White', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model Y', 'Performance') }, 14, storeCode),
                generateUniqueContent({ model: 'Cybertruck', trim: 'Premium All-Wheel Drive', exteriorColor: 'Stainless Steel', interiorColor: 'White Decor', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: modelImages['Cybertruck'] }, 15, storeCode, '20" Core Wheels'),
                generateUniqueContent({ model: 'Model X', trim: 'All-Wheel Drive', exteriorColor: 'Solid Black', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '6-seater', imageUrl: modelImages['Model X'] }, 16, storeCode),
                generateUniqueContent({ model: 'Model Y', trim: PREMIUM_LONG_WHEELBASE_TRIM, exteriorColor: 'Cosmic Silver', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '6-seater', imageUrl: getVehicleImage('Model Y', PREMIUM_LONG_WHEELBASE_TRIM) }, 31, storeCode, '19" Machina 2.0 Wheels'),
                generateUniqueContent({ model: 'Model 3', trim: 'Performance', exteriorColor: 'Ultra Red', interiorColor: 'Black and White', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model 3', 'Performance') }, 32, storeCode),
                generateUniqueContent({ model: 'Model Y', trim: 'All-Wheel Drive', exteriorColor: 'Stealth Grey', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model Y', 'All-Wheel Drive') }, 33, storeCode),
                generateUniqueContent({ model: 'Model 3', trim: 'Premium All-Wheel Drive', exteriorColor: 'Pearl White Multi-Coat', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model 3', 'Premium All-Wheel Drive') }, 34, storeCode),
            ];
        case 'kissimmee':
            return [
                generateUniqueContent({ model: 'Model 3', trim: 'Premium All-Wheel Drive', exteriorColor: 'Stealth Grey', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model 3', 'Premium All-Wheel Drive') }, 17, storeCode),
                generateUniqueContent({ model: 'Model Y', trim: 'All-Wheel Drive', exteriorColor: 'Diamond Black', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model Y', 'All-Wheel Drive') }, 18, storeCode),
            ];
        case 'jacksonville':
            return [
                generateUniqueContent({ model: 'Model S', trim: 'Plaid', exteriorColor: 'Diamond Black', interiorColor: 'Black and White / Walnut Decor', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: modelImages['Model S'] }, 19, storeCode),
                generateUniqueContent({ model: 'Model X', trim: 'Plaid', exteriorColor: 'Lunar Silver', interiorColor: 'Cream / Walnut Decor', status: 'Available', batteryLevel: 0, seats: '7-seater', imageUrl: modelImages['Model X'] }, 20, storeCode),
            ];
        case 'merritt-island':
            return [
                generateUniqueContent({ model: 'Cybertruck', trim: 'Cyberbeast', exteriorColor: 'Stainless Steel', interiorColor: 'White Decor', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: modelImages['Cybertruck'] }, 21, storeCode),
                generateUniqueContent({ model: 'Model 3', trim: 'Performance', exteriorColor: 'Ultra Red', interiorColor: 'Black and White', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model 3', 'Performance') }, 22, storeCode),
            ];
        case 'pensacola':
            return [
                generateUniqueContent({ model: 'Model Y', trim: 'All-Wheel Drive', exteriorColor: 'Stealth Grey', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model Y', 'All-Wheel Drive') }, 23, storeCode),
                generateUniqueContent({ model: 'Model 3', trim: 'Rear-Wheel Drive', exteriorColor: 'Pearl White Multi-Coat', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model 3', 'Rear-Wheel Drive') }, 24, storeCode),
            ];
        case 'tallahassee':
            return [
                generateUniqueContent({ model: 'Model X', trim: 'Plaid', exteriorColor: 'Ultra Red', interiorColor: 'Cream / Walnut Decor', status: 'Available', batteryLevel: 0, seats: '6-seater', imageUrl: modelImages['Model X'] }, 25, storeCode),
            ];
        case 'gainesville':
            return [
                generateUniqueContent({ model: 'Model S', trim: 'All-Wheel Drive', exteriorColor: 'Diamond Black', interiorColor: 'All black / Ebony Decor', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: modelImages['Model S'] }, 26, storeCode),
            ];
        case 'tampa-mall-showroom':
             return [
                generateUniqueContent({ model: 'Model Y', trim: 'Performance', exteriorColor: 'Ultra Red', interiorColor: 'Black and White', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model Y', 'Performance') }, 27, storeCode),
                generateUniqueContent({ model: 'Model S', trim: 'Plaid', exteriorColor: 'Diamond Black', interiorColor: 'Cream / Walnut Decor', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: modelImages['Model S'] }, 28, storeCode),
            ];
        case 'fort-lauderdale':
            return [
                generateUniqueContent({ model: 'Model Y', trim: 'Premium All-Wheel Drive', exteriorColor: 'Marine Blue', interiorColor: 'Black and White', status: 'Available', batteryLevel: 0, seats: '7-seater', imageUrl: getVehicleImage('Model Y', 'Premium All-Wheel Drive') }, 29, storeCode),
                generateUniqueContent({ model: 'Model 3', trim: 'Performance', exteriorColor: 'Pearl White Multi-Coat', interiorColor: 'Black', status: 'Available', batteryLevel: 0, seats: '5-seater', imageUrl: getVehicleImage('Model 3', 'Performance') }, 30, storeCode),
            ];
        default:
            return [];
    }
}


const getAdvisorsForStore = (storeCode: string): Omit<Advisor, 'id'>[] => {
    const advisorData: Record<string, Omit<Advisor, 'id' | 'storeId'>[]> = {
        'orlando-florida-mall': allAdvisors.filter(a => ['Alice Johnson', 'Bob Williams', 'Charlie Brown', 'Diana Miller', 'Ethan Davis', 'Marco Serrano'].includes(a.name)),
        'orlando-lee-vista-blvd': allAdvisors.filter(a => ['Diana Miller', 'Ethan Davis', 'Fiona Garcia', 'George Rodriguez', 'Hannah Martinez', 'Marco Serrano'].includes(a.name)),
        'orlando-john-young-pkwy': allAdvisors.filter(a => ['George Rodriguez', 'Hannah Martinez', 'Ian Hernandez', 'Jasmine Lopez', 'Alice Johnson', 'Marco Serrano'].includes(a.name)),
        'clermont': [allAdvisors.find(a=>a.name==='Alice Johnson')!, allAdvisors.find(a=>a.name==='Bob Williams')!, allAdvisors.find(a=>a.name==='Charlie Brown')!, allAdvisors.find(a=>a.name==='Diana Miller')!, allAdvisors.find(a=>a.name==='Ethan Davis')!, allAdvisors.find(a=>a.name==='Fiona Garcia')!, allAdvisors.find(a=>a.name==='George Rodriguez')!, allAdvisors.find(a => a.name === 'Marco Serrano')!],
        'kissimmee': allAdvisors.slice(1, 4),
        'jacksonville': allAdvisors.slice(6, 9),
        'merritt-island': [allAdvisors[2], allAdvisors[5], allAdvisors[8]],
        'pensacola': [allAdvisors[1], allAdvisors[4]],
        'tallahassee': [allAdvisors[7]],
        'gainesville': [allAdvisors[0], allAdvisors[8]],
        'tampa-mall-showroom': allAdvisors.filter(a => ['Fiona Garcia', 'Ian Hernandez', 'Marco Serrano'].includes(a.name)),
        'fort-lauderdale': allAdvisors.filter(a => ['Bob Williams', 'Fiona Garcia', 'Ian Hernandez', 'Marco Serrano'].includes(a.name)),
    };

    return (advisorData[storeCode] || []).map(advisor => ({
        ...advisor,
        storeId: storeCode,
    }));
}

export const regions: Record<string, string> = {
    'florida-north': 'Florida North Region',
    'florida-west': 'Florida West Region',
    'florida-south': 'Florida South Region',
};

const STORE_CONFIG: {
  [key: string]: Omit<Store, 'vehicles' | 'advisors' | 'region'> & { region: string };
} = {
  clermont: { code: 'clermont', name: 'Clermont', region: 'florida-north' },
  gainesville: { code: 'gainesville', name: 'Gainesville', region: 'florida-north' },
  jacksonville: { code: 'jacksonville', name: 'Jacksonville', region: 'florida-north' },
  kissimmee: { code: 'kissimmee', name: 'Kissimmee', region: 'florida-north' },
  'orlando-florida-mall': { code: 'orlando-florida-mall', name: 'Florida Mall', region: 'florida-north' },
  'orlando-john-young-pkwy': { code: 'orlando-john-young-pkwy', name: 'John Young Pkwy', region: 'florida-north' },
  'orlando-lee-vista-blvd': { code: 'orlando-lee-vista-blvd', name: 'Lee Vista Blvd', region: 'florida-north' },
  pensacola: { code: 'pensacola', name: 'Pensacola', region: 'florida-north' },
  tallahassee: { code: 'tallahassee', name: 'Tallahassee', region: 'florida-north' },
  'merritt-island': { code: 'merritt-island', name: 'Merritt Island', region: 'florida-north' },
  'tampa-mall-showroom': { code: 'tampa-mall-showroom', name: 'Tampa Mall Showroom', region: 'florida-west' },
  'fort-lauderdale': { code: 'fort-lauderdale', name: 'Fort Lauderdale', region: 'florida-south' },
};

export const initialDriveLogs: DriveLog[] = [
    {
        id: 'log-3',
        vehicleId: 'fm-3',
        vehicleModel: 'Model X',
        vehicleTrim: 'Plaid',
        vehicleVin: 'XP1003',
        vehicleSeats: '6-seater',
        coPilot: 'Charlie Brown',
        purpose: 'Demo',
        startTime: Date.now() - (45 * 60 * 1000),
        expectedDuration: 60,
        startBattery: 65,
    },
    {
        id: 'log-5',
        vehicleId: 'lv-1',
        vehicleModel: 'Cybertruck',
        vehicleTrim: 'Cyberbeast',
        vehicleVin: 'CC1005',
        vehicleSeats: '5-seater',
        coPilot: 'Fiona Garcia',
        purpose: 'Charging',
        startTime: Date.now() - (120 * 60 * 1000),
        expectedDuration: 180,
        startBattery: 20,
    }
]


export const stores: (StoreInfo & { region: string })[] = Object.values(STORE_CONFIG)
  .map((store) => ({
    code: store.code,
    name: store.name,
    region: store.region,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const getStoreData = (storeCode: string): Omit<Store, 'id'> | null => {
  if (!STORE_CONFIG[storeCode]) return null;

  const advisors = getAdvisorsForStore(storeCode);
  const vehicles = getVehiclesForStore(storeCode);

  return {
    ...STORE_CONFIG[storeCode],
    advisors: advisors as Advisor[],
    vehicles: vehicles as Vehicle[],
  };
};

