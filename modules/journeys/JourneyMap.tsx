"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { useEffect, useRef, useState } from "react";
import type { Map as LibreMap, Marker } from "maplibre-gl";
import { Button } from "@/components/ui/button";
import type { JourneyGeometry, JourneyPlace } from "./types";
import "maplibre-gl/dist/maplibre-gl.css";
import "./journey.css";

export function JourneyMap({ points, geometry, meetingLocation, onMove, onPick }: {
  points: (JourneyPlace|null)[]; geometry: JourneyGeometry|null;
  meetingLocation?: JourneyPlace|null; onMove?: (index:number,lat:number,lon:number)=>void;
  onPick?: (lat:number,lon:number,legIndex?:number)=>void;
}) {
  const { t } = usePreferences();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap|null>(null);
  const markers = useRef<Marker[]>([]);
  const latest = useRef({points,geometry,meetingLocation,onMove,onPick});
  latest.current = {points,geometry,meetingLocation,onMove,onPick};
  const [ready,setReady] = useState(false);
  const [error,setError] = useState("");
  const [attempt,setAttempt] = useState(0);
  useEffect(()=>{
    let cancelled = false;
    setReady(false); setError("");
    import("maplibre-gl").then(lib=>{
      if (cancelled || !container.current) return;
      lib.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs?v=6.15.0");
      const map = new lib.Map({
        container:container.current, center:[-84.2,9.95],zoom:7,maxZoom:19,
        style:{version:8,sources:{basemap:{type:"raster",tiles:[window.location.origin+"/api/maps/tiles/{z}/{x}/{y}"],tileSize:256,
          attribution:'© <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}},
          layers:[{id:"basemap",type:"raster",source:"basemap"}]},
        cooperativeGestures:true,
      });
      mapRef.current = map;
      map.on("click",event=>{
        const pick=latest.current.onPick;if(!pick)return;
        const hit=map.getLayer("journey-line") ? map.queryRenderedFeatures([[event.point.x-6,event.point.y-6],[event.point.x+6,event.point.y+6]],{layers:["journey-line"]})[0] : undefined;
        const leg=Number(hit?.properties?.legIndex);
        pick(event.lngLat.lat,event.lngLat.lng,Number.isInteger(leg)?leg:undefined);
      });
      map.addControl(new lib.NavigationControl({showCompass:false}),"top-right");
      map.on("load",()=>{if(!cancelled) setReady(true);});
      map.on("error",event=>{if(!cancelled){console.error("No se pudo dibujar el mapa:",event.error?.message);setError("No se pudo cargar una parte del mapa. Las ubicaciones siguen disponibles debajo.");}});
    }).catch(()=>{if(!cancelled) setError("No se pudo abrir el mapa en este navegador.");});
    return ()=>{cancelled=true;markers.current.forEach(m=>m.remove());markers.current=[];mapRef.current?.remove();mapRef.current=null;};
  },[attempt]);
  useEffect(()=>{if(mapRef.current)mapRef.current.getCanvas().style.cursor=onPick?"crosshair":"";},[onPick,ready]);
  useEffect(()=>{
    if (!ready || !mapRef.current) return;
    let cancelled=false;
    import("maplibre-gl").then(lib=>{
      const map=mapRef.current;
      if(cancelled || !map) return;
      const data={type:"FeatureCollection" as const,features:(geometry?.coordinates ?? []).map((coordinates,index)=>({type:"Feature" as const,properties:geometry?.coordinates.length===points.length-1?{legIndex:index}:{},geometry:{type:"LineString" as const,coordinates}}))};
      const source=map.getSource("journey") as import("maplibre-gl").GeoJSONSource|undefined;
      if(source) source.setData(data);
      else {
        map.addSource("journey",{type:"geojson",data});
        const color=getComputedStyle(container.current!).getPropertyValue("--brand-forest").trim();
        map.addLayer({id:"journey-outline",type:"line",source:"journey",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"white","line-width":8}});
        map.addLayer({id:"journey-line",type:"line",source:"journey",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":color,"line-width":5}});
      }
      markers.current.forEach(marker=>marker.remove()); markers.current=[];
      function marker(place:JourneyPlace,label:string,index:number|null) {
        const element=document.createElement("button");
        element.type="button";element.className="lr-map-marker";
        element.textContent=label; element.setAttribute("aria-label",label+": "+place.label+(onMove && index!==null?". Arrastra para ajustar.":""));
        element.title=place.label;
        element.addEventListener("click",event=>event.stopPropagation());
        const m=new lib.Marker({element,draggable:!!onMove && index!==null}).setLngLat([place.lon,place.lat]).addTo(map!);
        if(onMove && index!==null) m.on("dragend",()=>{const p=m.getLngLat();if(p.lat<5||p.lat>11.5||p.lng< -88||p.lng> -82.4)m.setLngLat([place.lon,place.lat]);latest.current.onMove?.(index,p.lat,p.lng);});
        markers.current.push(m);
      }
      points.forEach((p,i)=>{if(p)marker(p,i===0?"A":i===points.length-1?"B":String(i),i);});
      if(meetingLocation) marker(meetingLocation,"E",null);
      const bounds=new lib.LngLatBounds();
      geometry?.coordinates.forEach(line=>line.forEach(p=>bounds.extend([p[0],p[1]])));
      points.forEach(p=>{if(p)bounds.extend([p.lon,p.lat]);});
      if(meetingLocation) bounds.extend([meetingLocation.lon,meetingLocation.lat]);
      if(!bounds.isEmpty()) map.fitBounds(bounds,{padding:64,maxZoom:15,duration:0});
      map.resize();
    });
    return ()=>{cancelled=true;};
  },[ready,points,geometry,meetingLocation,onMove]);
  return <div className="lr-map-frame">
    <div ref={container} className="lr-journey-map" role="region" aria-label={t("Mapa del trayecto")}/>
    {!ready && !error && <p className="lr-map-loading" role="status">{t("Cargando mapa…")}</p>}
    {error && <div className="lr-map-error" role="status"><p>{error}</p><Button type="button" variant="outline" size="sm" onClick={()=>setAttempt(n=>n+1)}>{t("Reintentar mapa")}</Button></div>}
  </div>;
}
