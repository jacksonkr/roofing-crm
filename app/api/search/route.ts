import { numbers, respond } from "@/lib/http";
import { callOracle, type PermitSearch, type PropertySearch } from "@/lib/oracle";

export const maxDuration = 60;

/**
 * Lead candidates around a point: older roofs and open roofing permits.
 * Both lists come from the Oracle pipeline's MCP tools, called in parallel.
 */
export async function GET(request: Request) {
  return respond(async () => {
    const q = numbers(request, ["lat", "lon", "miles", "minRoofAge", "minYearsOpen", "minYearsSinceSale"]);
    const area = { lat: q.lat, lon: q.lon, miles: q.miles ?? 1 };
    const params = new URL(request.url).searchParams;
    const ownerLocation = params.get("ownerLocation");
    const contractorLicence = params.get("contractorLicence");
    const [roofs, permits] = await Promise.all([
      callOracle<PropertySearch>("search_properties", {
        ...area,
        minRoofAge: q.minRoofAge ?? 15,
        ...(q.minYearsSinceSale ? { minYearsSinceSale: q.minYearsSinceSale } : {}),
        ...(ownerLocation ? { ownerLocation: ownerLocation.split(",") } : {}),
        limit: 50,
      }),
      callOracle<PermitSearch>("search_permits", {
        ...area,
        roofingOnly: true,
        openOnly: true,
        ...(q.minYearsOpen ? { minDaysOpen: Math.round(q.minYearsOpen * 365.25) } : {}),
        ...(contractorLicence ? { contractorLicence } : {}),
        limit: 50,
      }),
    ]);
    return { roofs, permits };
  });
}
