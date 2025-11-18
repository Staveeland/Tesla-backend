import { TESLA_FLEET_BASE_URL } from "./teslaConfig";

async function teslaFetch(
  path: string,
  method: "GET" | "POST",
  teslaAccessToken: string,
  body?: any
) {
  // Ensure no double slashes if base ends with /
  const baseUrl = TESLA_FLEET_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${teslaAccessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();

  let json: any;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    console.error("Tesla command error", res.status, json);
    throw new Error(`Tesla command failed: ${res.status}`);
  }

  return json;
}

export async function lockVehicle(teslaAccessToken: string, vehicleId: string | number) {
  return teslaFetch(`/api/1/vehicles/${vehicleId}/command/door_lock`, "POST", teslaAccessToken);
}

export async function unlockVehicle(teslaAccessToken: string, vehicleId: string | number) {
  return teslaFetch(`/api/1/vehicles/${vehicleId}/command/door_unlock`, "POST", teslaAccessToken);
}

export async function honkHorn(teslaAccessToken: string, vehicleId: string | number) {
  return teslaFetch(`/api/1/vehicles/${vehicleId}/command/honk_horn`, "POST", teslaAccessToken);
}

export async function flashLights(teslaAccessToken: string, vehicleId: string | number) {
  return teslaFetch(`/api/1/vehicles/${vehicleId}/command/flash_lights`, "POST", teslaAccessToken);
}

export async function startClimate(teslaAccessToken: string, vehicleId: string | number) {
  return teslaFetch(
    `/api/1/vehicles/${vehicleId}/command/auto_conditioning_start`,
    "POST",
    teslaAccessToken
  );
}

export async function stopClimate(teslaAccessToken: string, vehicleId: string | number) {
  return teslaFetch(
    `/api/1/vehicles/${vehicleId}/command/auto_conditioning_stop`,
    "POST",
    teslaAccessToken
  );
}

