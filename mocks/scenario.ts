import { delay, HttpResponse } from 'msw';

export const SCENARIOS = [
  'happy',
  'store_closed',
  'item_sold_out_mid_checkout',
  'outside_zone',
  'slow_3g',
  'network_fail',
  'double_tap',
  'payment_success',
  'payment_fail',
  'payment_pending_stuck',
] as const;
export type Scenario = (typeof SCENARIOS)[number];

const KEY = 'bp-mock-scenario';
const isScenario = (s: string | null): s is Scenario => SCENARIOS.includes(s as Scenario);

function initial(): Scenario {
  if (typeof window === 'undefined') return 'happy';
  const fromUrl = new URLSearchParams(window.location.search).get('scenario');
  try {
    if (isScenario(fromUrl)) sessionStorage.setItem(KEY, fromUrl);
    const stored = sessionStorage.getItem(KEY);
    return isScenario(stored) ? stored : 'happy';
  } catch {
    return isScenario(fromUrl) ? fromUrl : 'happy';
  }
}

let current: Scenario = initial();
const listeners = new Set<(s: Scenario) => void>();

export const getScenario = () => current;
export const is = (s: Scenario) => current === s;

export function setScenario(s: Scenario) {
  current = s;
  try {
    sessionStorage.setItem(KEY, s);
  } catch {}
  listeners.forEach((l) => l(s));
}

export function onScenarioChange(l: (s: Scenario) => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

let requestCount = 0;

/** slow_3g latency and network_fail (every 3rd request). Returns a response to short-circuit with. */
export async function networkConditions(): Promise<Response | null> {
  requestCount += 1;
  if (current === 'slow_3g') await delay(1500 + Math.random() * 1500);
  if (current === 'network_fail' && requestCount % 3 === 0) return HttpResponse.error();
  return null;
}
