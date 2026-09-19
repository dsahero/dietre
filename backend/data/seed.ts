import type { DietResponse, DietreEvent, HostRecord, MenuItem, Restaurant } from "@/shared/lib/types";

// Placeholder seed arrays are intentionally empty. Live paths use empty
// collections until real guest submit / restaurant acquisition / matchEvent.
// DEMO_EVENT_ID remains as a string constant for host-access checks.
// Optional demo load (DIETRE_SEED=1 + seedDemoDataIfEnabled) no-ops when
// SEED_RESTAURANTS is empty.

export const DEMO_EVENT_ID = "demo-vt-hacks";

export const SEED_RESTAURANTS: Restaurant[] = [];
export const SEED_MENU_ITEMS: MenuItem[] = [];
export const SEED_EVENT_RESPONSES: DietResponse[] = [];
export const SEED_EVENTS: DietreEvent[] = [];
export const SEED_HOSTS: HostRecord[] = [];
