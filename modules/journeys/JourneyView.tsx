"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { Card, CardContent } from "@/components/ui/card";
import { JourneyMap } from "./JourneyMap";
import { journeyMetrics, journeyReady, placeContext, type Journey } from "./types";
import "./journey.css";
export function JourneyView({journey,meetingPoint}: {journey?:Journey|null;meetingPoint?:string|null}) {
  const { t, language } = usePreferences();
  const ready=journeyReady(journey);
  if(!ready || !journey)return meetingPoint?<p><strong>{t("Punto de encuentro:")}</strong> {meetingPoint}</p>:null;
  return <Card className="lr-journey-view"><CardContent>
    <JourneyMap points={journey.points} geometry={journey.geometry} meetingLocation={journey.meetingLocation}/>
    <ol className="lr-journey-locations">{journey.points.map((p,i)=>p?<li key={i}>
      <span className="lr-journey-location-badge">{i===0?"A":i===journey.points.length-1?"B":i}</span>
      <div><strong>{i===0?t("Salida"):i===journey.points.length-1?t("Llegada"):t("Parada ")+i}: {p.name}</strong>
        <p>{p.adjusted?p.label:placeContext(p, t)||p.label}</p></div>
    </li>:null)}</ol>
    <p className="lr-journey-metrics">{journeyMetrics(journey, language)}</p>
    {journey.mode!=="locations" && <p className="lr-place-help">{t("Tiempo estimado de traslado, distinto de la duración total de la actividad.")}</p>}
    {(meetingPoint || journey.meetingLocation) && <div className="lr-journey-meeting-view"><strong>{t("Punto de encuentro")}</strong>
      {journey.meetingLocation && <p>E · {journey.meetingLocation.label}</p>}
      {meetingPoint && <p>{meetingPoint}</p>}
    </div>}
  </CardContent></Card>;
}
