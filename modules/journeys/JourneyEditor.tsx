"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/page-heading";
import { PlaceSearch } from "./PlaceSearch";
import { JourneyMap } from "./JourneyMap";
import { emptyJourney, journeyMetrics, journeyReady, type Journey, type JourneyPlace } from "./types";
import "./journey.css";
import { routeInputIssue } from "./route-input";
import { changeJourney, resolveJourneyPoint } from "./edit-journey";

export function JourneyEditor({value,onChange,meetingPoint,onMeetingPointChange,allowLegacy=false,isExcursion=false}:{
  value:Journey|null|undefined;onChange:(value:Journey|null)=>void;
  meetingPoint:string;onMeetingPointChange:(text:string)=>void;allowLegacy?:boolean;isExcursion?:boolean;
}) {
  const { t, language } = usePreferences();
  const initialEmpty=useRef(emptyJourney());
  const journey=value ?? initialEmpty.current;
  const current=useRef(journey); current.current=journey;
  const change=useRef(onChange);change.current=onChange;
  const reverseRequests=useRef(new Map<string,{controller:AbortController;lat:number;lon:number}>());
  const [editing,setEditing]=useState(false),[mapAction,setMapAction]=useState<"stop"|"origin"|"destination">("stop");
  const [mapNotice,setMapNotice]=useState("");
  const [resolving,setResolving]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  const key=JSON.stringify([journey.mode,journey.points.map(p=>p?[p.lat,p.lon]:null)]);
  const calculated=useRef(value?.geometry?key:"");
  function patch(update:Partial<Journey>,invalidate=true) {
    if(invalidate)setError("");
    onChange(changeJourney(current.current,update,invalidate));
  }
  useEffect(()=>()=>{reverseRequests.current.forEach(request=>request.controller.abort());},[]);
  useEffect(()=>{
    for(const [id,request] of reverseRequests.current){
      if(!journey.points.some(point=>point?.id===id && point.lat===request.lat && point.lon===request.lon)){
        request.controller.abort();reverseRequests.current.delete(id);
      }
    }
    setResolving(reverseRequests.current.size);
  },[key,journey.points]);
  useEffect(()=>{
    if(journey.meetingAtOrigin && journey.meetingDirectionsAuto && journey.meetingLocation && meetingPoint!==journey.meetingLocation.label)onMeetingPointChange(journey.meetingLocation.label);
  },[journey.meetingAtOrigin,journey.meetingDirectionsAuto,journey.meetingLocation,meetingPoint,onMeetingPointChange]);
  const resolveMapPoint=useCallback(async(point:JourneyPlace)=>{
    reverseRequests.current.get(point.id)?.controller.abort();
    const controller=new AbortController();reverseRequests.current.set(point.id,{controller,lat:point.lat,lon:point.lon});
    setResolving(reverseRequests.current.size);
    setMapNotice("Identificando la dirección del punto elegido…");
    try {
      const response=await fetch(`/api/maps/reverse?lat=${point.lat}&lon=${point.lon}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),credentials:"same-origin"});
      const body=await response.json().catch(()=>null) as {data?:JourneyPlace|null}|null;
      if(controller.signal.aborted)return;
      if(response.ok && body?.data) {
        const next=resolveJourneyPoint(current.current,point,body.data);
        if(next!==current.current)change.current(next);
        setMapNotice("Ubicación actualizada. Revisa el trazado y confírmalo nuevamente.");
      } else setMapNotice("No se obtuvo una dirección exacta. Conservamos las coordenadas elegidas en el mapa.");
    } catch {if(!controller.signal.aborted)setMapNotice("No se pudo consultar la dirección. Conservamos el punto elegido y sus coordenadas.");}
    finally {if(reverseRequests.current.get(point.id)?.controller===controller){reverseRequests.current.delete(point.id);setResolving(reverseRequests.current.size);}}
  },[]);
  const move=useCallback((index:number,lat:number,lon:number)=>{
    if(lat<5 || lat>11.5 || lon< -88 || lon> -82.4){setError("Selecciona un punto dentro de Costa Rica.");return;}
    const points=[...current.current.points],place=points[index];
    if(!place && !isExcursion)return;
    const adjusted={id:place?.id ?? "map:"+crypto.randomUUID(),lat,lon,type:"map_point",adjusted:true,name:index===0?"Salida elegida en el mapa":index===points.length-1?"Llegada elegida en el mapa":"Parada elegida en el mapa",label:`Punto en el mapa (${lat.toFixed(5)}, ${lon.toFixed(5)})`};
    points[index]=adjusted;setError("");
    change.current(changeJourney(current.current,{points}));
    void resolveMapPoint(adjusted);
  },[resolveMapPoint,isExcursion]);
  const pick=useCallback((lat:number,lon:number,legIndex?:number)=>{
    if(lat<5 || lat>11.5 || lon< -88 || lon> -82.4){setError("Selecciona un punto dentro de Costa Rica.");return;}
    const points=[...current.current.points];
    if(isExcursion && (!points[0] || !points.at(-1))){move(!points[0]?0:points.length-1,lat,lon);return;}
    if(mapAction!=="stop") {move(mapAction==="origin"?0:points.length-1,lat,lon);return;}
    const empty=points.findIndex((point,index)=>!point && index>0 && index<points.length-1);
    if(points.length>=12 && empty<0){setError("Puedes añadir hasta diez paradas intermedias.");return;}
    const point={id:"map:"+crypto.randomUUID(),name:"Parada elegida en el mapa",label:`Punto en el mapa (${lat.toFixed(5)}, ${lon.toFixed(5)})`,lat,lon,type:"map_point",adjusted:true};
    if(empty>=0)points[empty]=point;
    else points.splice(legIndex!==undefined && legIndex>=0 && legIndex<points.length-1?legIndex+1:points.length-1,0,point);
    setError("");change.current(changeJourney(current.current,{points}));void resolveMapPoint(point);
  },[mapAction,move,resolveMapPoint,isExcursion]);
  useEffect(()=>{
    const j=current.current;
    const inputIssue=routeInputIssue(j.points,j.mode);
    if(j.points.some(p=>!p)){setBusy(false);setError("");return;}
    if(inputIssue){setBusy(false);setError(inputIssue);return;}
    if(j.mode==="locations"){setBusy(false);setError("");return;}
    if(calculated.current===key && j.geometry){setBusy(false);setError("");return;}
    const controller=new AbortController();
    setBusy(true);setError("");
    const timer=setTimeout(async()=>{
      try {
        const r=await fetch("/api/maps/route",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},
          body:JSON.stringify({mode:j.mode,points:j.points}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});
        const body=await r.json().catch(()=>null) as {data?: Journey; error?: string}|null;
        if(!r.ok)throw new Error(body?.error || "No se pudo calcular el trayecto. Reintenta en unos momentos.");
        if(!body?.data)throw new Error("El servicio no devolvió un trayecto completo. Reintenta el cálculo.");
        if(!controller.signal.aborted && JSON.stringify([current.current.mode,current.current.points.map(p=>p?[p.lat,p.lon]:null)])===key) {
          calculated.current=key;
          change.current({...body.data,points:current.current.points,meetingLocation:current.current.meetingLocation,meetingAtOrigin:current.current.meetingAtOrigin,meetingDirectionsAuto:current.current.meetingDirectionsAuto,confirmedAt:null});
        }
      } catch(e) {if(!controller.signal.aborted)setError(e instanceof Error && e.name === "TimeoutError" ? "El cálculo tardó demasiado. Conservamos los puntos; vuelve a intentarlo." : e instanceof TypeError ? "No se pudo contactar el servicio de rutas. Revisa tu conexión y reintenta." : e instanceof Error?e.message:"No se pudo calcular el trayecto.");}
      finally {if(!controller.signal.aborted)setBusy(false);}
    },450);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[key,retry]);
  const ready=journeyReady(journey);
  function toggleEditing(){
    if(!isExcursion){setEditing(value=>!value);return;}
    if(!editing){patch({},false);setEditing(true);setMapNotice("");return;}
    const issue=routeInputIssue(journey.points,journey.mode);
    if(issue){setError(issue);return;}
    if(busy || resolving>0){setMapNotice("Espera a que termine el cálculo y la consulta de ubicaciones para terminar la ruta.");return;}
    if(error || (journey.mode!=="locations" && (!journey.geometry || !journey.integrity))){setMapNotice("Revisa el aviso del trayecto y vuelve a calcular antes de terminar la ruta.");return;}
    onChange({...journey,confirmedAt:new Date().toISOString()});setEditing(false);setMapNotice("");
  }
  function selectPoint(index:number,place:JourneyPlace|null) {
    const points=[...journey.points];points[index]=place;patch({points});
  }
  function reorder(index:number,direction:number) {
    const points=[...journey.points];[points[index],points[index+direction]]=[points[index+direction],points[index]];patch({points});
  }
  return <Card className="lr-journey-editor">
    <CardHeader><SectionHeading title={t("Define el trayecto")} description={t("Selecciona los lugares, revisa el recorrido y confirma antes de continuar.")}/></CardHeader>
    <CardContent>
      <div className="lr-journey-workspace">
        <div className="lr-journey-controls">
          <div className="lr-place-search"><label htmlFor="journey-mode">{t("Tipo de recorrido")}</label>
            <select id="journey-mode" className="lr-journey-select" value={journey.mode}
              onChange={e=>patch({mode:e.target.value as Journey["mode"]})}>
              <option value="drive">{t("En vehículo")}</option><option value="walk">{t("A pie")}</option><option value="hike">{t("Senderismo")}</option>
              <option value="locations">{t("Acuático u otro: solo ubicaciones")}</option>
            </select>
          </div>
          {journey.points.map((place,index)=><div key={index} className="lr-journey-stop">
            <PlaceSearch label={index===0?t("A · Salida"):index===journey.points.length-1?t("B · Llegada"):t("Parada ")+index} value={place} onChange={p=>selectPoint(index,p)}/>
            {index>0 && index<journey.points.length-1 && <div className="lr-journey-stop-actions">
              <Button type="button" size="sm" variant="ghost" disabled={index===1} aria-label={t("Subir parada ")+index} onClick={()=>reorder(index,-1)}><ArrowUp size={16}/></Button>
              <Button type="button" size="sm" variant="ghost" disabled={index===journey.points.length-2} aria-label={t("Bajar parada ")+index} onClick={()=>reorder(index,1)}><ArrowDown size={16}/></Button>
              <Button type="button" size="sm" variant="ghost" aria-label={t("Eliminar parada ")+index} onClick={()=>patch({points:journey.points.filter((_,i)=>i!==index)})}><Trash2 size={16}/></Button>
            </div>}
          </div>)}
          <Button type="button" variant="outline" disabled={journey.points.length>=12} onClick={()=>patch({points:[...journey.points.slice(0,-1),null,journey.points.at(-1)??null]})}><Plus size={16}/>{t(" Añadir parada")}</Button>
          <div className="lr-journey-meeting"><h3 className="font-semibold text-sm">{t("Punto de encuentro")}</h3>
            <p>{t("Puede ser distinto del inicio del recorrido.")}</p>
            <label htmlFor="journey-meeting-note">{t("Indicaciones del punto de encuentro")}</label>
            <Input id="journey-meeting-note" value={meetingPoint} placeholder={t("Ej. Frente a la iglesia, 15 minutos antes")}
              onChange={e=>{onMeetingPointChange(e.target.value);patch({meetingDirectionsAuto:false},false);}}/>
            <Button type="button" variant="ghost" size="sm" disabled={!journey.points[0]} className="mt-2" onClick={()=>{
              const origin=journey.points[0];if(origin){onMeetingPointChange(origin.label);patch({meetingLocation:origin,meetingAtOrigin:true,meetingDirectionsAuto:true},false);}
            }}>{t("El encuentro será en la salida")}</Button>
            <details className="mt-3"><summary>{t("Ubicar otro punto de encuentro en el mapa")}</summary>
              <div className="mt-3"><PlaceSearch label={t("E · Ubicación del encuentro (opcional)")} value={journey.meetingLocation} onChange={meetingLocation=>patch({meetingLocation,meetingAtOrigin:false,meetingDirectionsAuto:false},false)}/></div>
              {journey.meetingLocation && <Button type="button" variant="ghost" size="sm" onClick={()=>patch({meetingLocation:null,meetingAtOrigin:false,meetingDirectionsAuto:false},false)}>{t("Quitar ubicación del encuentro")}</Button>}
            </details>
          </div>
        </div>
        <div className="lr-journey-preview">
          <div className="lr-route-edit-toolbar">
            <Button type="button" variant="outline" aria-pressed={editing} disabled={!isExcursion && (!journey.points[0] || !journey.points.at(-1))} onClick={toggleEditing}>{isExcursion?(editing?t("Terminar ruta"):t("Empezar edición")):(editing?t("Terminar edición del mapa"):t("Editar trayecto en el mapa"))}</Button>
            {editing && journey.points[0] && journey.points.at(-1) && <div><label htmlFor="journey-map-action">{t("Al hacer clic en el mapa")}</label><select id="journey-map-action" className="lr-journey-select" value={mapAction} onChange={event=>setMapAction(event.target.value as typeof mapAction)}><option value="stop">{t("Añadir parada")}</option><option value="origin">{t("Mover salida")}</option><option value="destination">{t("Mover llegada")}</option></select></div>}
          </div>
          {editing && <p className="lr-place-help">{isExcursion && !journey.points[0]?t("Haz clic en el mapa para elegir la salida. El siguiente clic definirá la llegada."):isExcursion && !journey.points.at(-1)?t("Haz clic en el mapa para elegir la llegada. Después podrás añadir paradas y ajustar el recorrido."):t("Haz clic sobre un tramo para insertar una parada allí; sobre el fondo se añade antes de la llegada. También puedes arrastrar los marcadores. Cada cambio recalcula el recorrido.")}{busy?t(" Espera a que termine este cálculo para añadir otro punto con un clic."):""}</p>}
          <JourneyMap points={journey.points} geometry={journey.geometry} meetingLocation={journey.meetingLocation} onMove={!isExcursion || editing?move:undefined} onPick={editing && !busy?pick:undefined}/>
          {mapNotice && <p className="lr-place-help" role="status">{t(mapNotice)}</p>}
          <p className="lr-place-help">{t("A: salida · B: llegada · números: paradas · E: encuentro. ")}{isExcursion && !editing?t("Pulsa Empezar edición para ajustar el recorrido."):t("Puedes arrastrar los marcadores del recorrido para precisarlos.")}</p>
          <div className="lr-journey-status" aria-live="polite">
            {busy?<p role="status">{t("Calculando el trayecto…")}</p>:journey.mode==="locations"?
              <p>{t("Se mostrarán las ubicaciones, sin dibujar una ruta ni estimar distancia o tiempo. Esta opción sirve para actividades acuáticas u otros recorridos sin cobertura.")}</p>:
              journey.geometry?<><strong>{journeyMetrics(journey, language)}</strong><p>{t("Estimación del recorrido; no representa la duración total de la actividad ni tráfico en tiempo real.")}</p></>:
              <p>{journey.points.some(p=>!p) ? t("Selecciona salida y llegada para calcular una propuesta.") : error ? t("El trayecto no se ha podido calcular. Revisa la indicación siguiente.") : t("Preparando el cálculo del trayecto…")}</p>}
          </div>
          {error && <div className="lr-journey-error" role="alert"><p>{t(error)}</p><Button type="button" variant="outline" size="sm" onClick={()=>setRetry(n=>n+1)}>{t("Reintentar cálculo")}</Button></div>}
          {(!isExcursion || !editing) && <Button type="button" className="lr-journey-confirm" disabled={busy || resolving>0 || !!error || !!routeInputIssue(journey.points,journey.mode) || (journey.mode!=="locations" && (!journey.geometry || !journey.integrity))}
            onClick={()=>onChange({...journey,confirmedAt:new Date().toISOString()})}>
            {resolving>0?t("Consultando la ubicación…"):ready?<><Check size={18}/>{t(" Trayecto confirmado")}</>:t("Confirmar este trayecto")}
          </Button>}
          {ready && <p className="lr-place-help" role="status">{t("El viajero verá este recorrido. Cualquier ajuste requiere confirmarlo nuevamente.")}</p>}
        </div>
      </div>
      {allowLegacy && <div className="lr-journey-legacy"><p>{t("Esta publicación ya tenía información de ubicación sin mapa.")}</p>
        <Button type="button" variant="ghost" onClick={()=>onChange(null)}>{t("Conservar la ubicación anterior sin añadir trayecto")}</Button>
      </div>}
    </CardContent>
  </Card>;
}
