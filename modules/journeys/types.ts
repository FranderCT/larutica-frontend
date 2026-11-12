import { routeInputIssue } from "./route-input";
export type JourneyMode = "drive" | "walk" | "hike" | "locations";
export type JourneyPlace = {
  id: string; name: string; label: string; lat: number; lon: number;
  country?: string; province?: string; canton?: string; district?: string;
  address?: string; adjusted?: boolean;
  type?: string; locality?: string;
};
export type JourneyGeometry = { type: "MultiLineString"; coordinates: number[][][] };
export type Journey = {
  version: 1; mode: JourneyMode; points: (JourneyPlace | null)[];
  meetingLocation: JourneyPlace | null;
  geometry: JourneyGeometry | null; distance: number | null; duration: number | null;
  integrity: string | null; confirmedAt: string | null;
  meetingAtOrigin?: boolean;
  meetingDirectionsAuto?: boolean;
};
export const emptyJourney = (): Journey => ({
  version: 1, mode: "drive", points: [null, null], meetingLocation: null,
  geometry: null, distance: null, duration: null, integrity: null, confirmedAt: null,
});
export function journeyReady(journey: Journey | null | undefined): boolean {
  return !!journey && !routeInputIssue(journey.points,journey.mode)
    && !!journey.confirmedAt
    && (journey.mode === "locations" || (!!journey.geometry && !!journey.integrity));
}
export function placeContext(place: JourneyPlace, t = (label: string) => label): string {
  return [place.district && `${t("Distrito")}: ${place.district}`, place.canton && `${t("Cantón")}: ${place.canton}`,
    place.province && `${t("Provincia")}: ${place.province}`, place.locality && !place.district && `${t("Localidad")}: ${place.locality}`,
    place.country].filter(Boolean).join(" · ");
}
export function placeTypeLabel(place: JourneyPlace): string {
  const labels: Record<string,string> = {city:"Ciudad o localidad",street:"Calle",amenity:"Lugar de interés",building:"Edificio",suburb:"Barrio",district:"Distrito",state:"Provincia",county:"Cantón",postcode:"Zona postal",country:"País"};
  return place.type ? labels[place.type] ?? "Ubicación" : "Ubicación";
}
export function journeyMetrics(journey: Journey, language: "es" | "en" = "es"): string {
  if (journey.mode === "locations") return language === "en" ? "Reference locations · no automatic route" : "Ubicaciones de referencia · sin trazado automático";
  const km = ((journey.distance ?? 0) / 1000).toLocaleString(language === "en" ? "en-US" : "es-CR", { maximumFractionDigits: 1 });
  const min = Math.max(1, Math.round((journey.duration ?? 0) / 60));
  const time = `${Math.floor(min / 60) ? Math.floor(min / 60) + " h " : ""}${min % 60} min`;
  return language === "en" ? `${km} km · ${time} estimated travel time` : `${km} km · ${time} de recorrido estimado`;
}
