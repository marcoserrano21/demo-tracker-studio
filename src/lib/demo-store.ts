/** Portfolio one-click Demo Store — isolated from real showroom store codes. */
export const DEMO_STORE_CODE = 'demo-hub';
export const DEMO_STORE_NAME = 'Demo Store';
export const DEMO_REGION_CODE = 'demo';
/** Store password for Try Demo Store server auth (not the manager PIN). */
export const DEMO_STORE_PASSWORD = 'demo2026';

export function isPortfolioDemoStore(storeCode: string | null | undefined): boolean {
  return storeCode === DEMO_STORE_CODE;
}
