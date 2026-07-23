/** Home Assistant helpers — LAN URLs are called from the browser; public URLs go through our proxy. */

const PRIVATE_HOST =
  /^(localhost|127\.0\.0\.1|\[::1\]|.*\.local)$/i;
const PRIVATE_IPV4 =
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/;

export function isPrivateHaUrl(baseUrl: string): boolean {
  try {
    const { hostname } = new URL(baseUrl);
    return PRIVATE_HOST.test(hostname) || PRIVATE_IPV4.test(hostname);
  } catch {
    return false;
  }
}

export function normalizeHaBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Derive the HA service call from an entity_id domain. */
export function serviceForEntity(entityId: string): string {
  const domain = entityId.split(".")[0] ?? "";
  switch (domain) {
    case "scene":
      return "scene.turn_on";
    case "script":
      return "script.turn_on";
    case "automation":
      return "automation.trigger";
    case "light":
    case "switch":
    case "input_boolean":
    case "fan":
      return "homeassistant.toggle";
    default:
      return "homeassistant.toggle";
  }
}

export function splitService(service: string): { domain: string; service: string } {
  const [domain, ...rest] = service.split(".");
  return { domain: domain || "homeassistant", service: rest.join(".") || "toggle" };
}

const ENTITY_DOMAINS = new Set(["scene", "script", "switch", "light", "automation", "input_boolean", "fan"]);

export interface HaEntityOption {
  entity_id: string;
  friendly_name: string;
  domain: string;
}

export function filterHaEntities(states: { entity_id: string; attributes?: { friendly_name?: string } }[]): HaEntityOption[] {
  return states
    .filter((s) => ENTITY_DOMAINS.has(s.entity_id.split(".")[0] ?? ""))
    .map((s) => ({
      entity_id: s.entity_id,
      friendly_name: s.attributes?.friendly_name || s.entity_id,
      domain: s.entity_id.split(".")[0] ?? "",
    }))
    .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
}

/** Call HA REST from the browser (LAN) or return null to signal the caller should use the server proxy. */
export async function callHaServiceDirect({
  baseUrl,
  token,
  service,
  entityId,
}: {
  baseUrl: string;
  token: string;
  service: string;
  entityId: string;
}): Promise<void> {
  const { domain, service: svc } = splitService(service);
  const res = await fetch(`${normalizeHaBaseUrl(baseUrl)}/api/services/${domain}/${svc}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ entity_id: entityId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Home Assistant returned ${res.status}`);
  }
}

export async function fetchHaStatesDirect(baseUrl: string, token: string): Promise<HaEntityOption[]> {
  const res = await fetch(`${normalizeHaBaseUrl(baseUrl)}/api/states`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Couldn't reach Home Assistant (${res.status})`);
  const states = (await res.json()) as { entity_id: string; attributes?: { friendly_name?: string } }[];
  return filterHaEntities(states);
}

/** Curated lucide icon names for HA buttons. */
export const HA_ICON_OPTIONS = [
  "zap",
  "lightbulb",
  "lamp",
  "power",
  "home",
  "door-open",
  "lock",
  "unlock",
  "moon",
  "sun",
  "film",
  "music",
  "fan",
  "thermometer",
  "car",
  "shield",
  "coffee",
  "bed",
  "tv",
  "speaker",
] as const;
