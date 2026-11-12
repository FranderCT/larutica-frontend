"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { placeContext, placeTypeLabel, type JourneyPlace } from "./types";
import "./journey.css";

const cached = new Map<string, JourneyPlace[]>();
export function PlaceSearch({label,value,onChange,disabled=false}:{
  label:string;value:JourneyPlace|null;onChange:(place:JourneyPlace|null)=>void;disabled?:boolean;
}) {
  const { t } = usePreferences();
  const id=useId();
  const [query,setQuery]=useState(value?.name ?? "");
  const [options,setOptions]=useState<JourneyPlace[]>([]);
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const [active,setActive]=useState(-1);
  const [retry,setRetry]=useState(0);
  const typing=useRef(false);
  useEffect(()=>{if(value){setQuery(value.name);typing.current=false;}else if(!typing.current)setQuery("");},[value]);
  useEffect(()=>{
    if(!open || value || query.trim().length<3) {setOptions([]);setLoading(false);return;}
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      const q=query.trim();setLoading(true);setError("");setActive(-1);
      try {
        const hit=cached.get(q.toLocaleLowerCase());
        let data=hit;
        if(!data) {
          const r=await fetch("/api/maps/places?v=2&q="+encodeURIComponent(q),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)]),credentials:"same-origin"});
          const body=await r.json().catch(()=>null) as {data?: JourneyPlace[];error?: string}|null;
          if(!r.ok) throw new Error(body?.error || "No se pudieron buscar los lugares.");
          if(!Array.isArray(body?.data)) throw new Error("La búsqueda devolvió una respuesta incompleta. Intenta nuevamente.");
          data=body.data;
          if(cached.size>=80)cached.delete(cached.keys().next().value!);
          cached.set(q.toLocaleLowerCase(),data);
        }
        if(!controller.signal.aborted)setOptions(data);
      } catch(e) {if(!controller.signal.aborted)setError(e instanceof Error && e.name === "TimeoutError" ? "La búsqueda tardó demasiado. Intenta de nuevo." : e instanceof Error?e.message:"No se pudo buscar.");}
      finally {if(!controller.signal.aborted)setLoading(false);}
    },400);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[query,value,open,retry]);
  function choose(place:JourneyPlace) {setQuery(place.name);setOpen(false);setOptions([]);onChange(place);}
  return <div className="lr-place-search">
    <label htmlFor={id}>{label}</label>
    <Input id={id} role="combobox" autoComplete="off" disabled={disabled} value={query}
      aria-expanded={open && options.length>0} aria-controls={id+"-options"} aria-autocomplete="list"
      aria-activedescendant={active>=0 && open ? id+"-option-"+active:undefined} aria-describedby={id+"-help"}
      placeholder={t("Busca un lugar de Costa Rica")}
      onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)}
      onChange={e=>{typing.current=true;setQuery(e.target.value);setOpen(true);setError("");setActive(-1);setOptions([]);if(value)onChange(null);}}
      onKeyDown={e=>{
        if(e.key==="Escape"){setOpen(false);return;}
        if(e.key==="ArrowDown" && options.length){e.preventDefault();setOpen(true);setActive(n=>(n+1)%options.length);}
        if(e.key==="ArrowUp" && options.length){e.preventDefault();setActive(n=>(n<=0?options.length-1:n-1));}
        if(e.key==="Enter" && open && active>=0 && options[active]){e.preventDefault();choose(options[active]);}
      }}/>
    {open && options.length>0 && <ul id={id+"-options"} className="lr-place-options" role="listbox" aria-label={`${t("Sugerencias de")} ${label}`}>
      {options.map((place,index)=><li id={id+"-option-"+index} key={place.id} role="option" aria-selected={active===index}>
        <button type="button" tabIndex={-1} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(place)}
          onMouseEnter={()=>setActive(index)}><strong>{place.name}</strong>
          <small>{t(placeTypeLabel(place))}</small>
          <span>{placeContext(place, t) || place.label}</span>
          {place.address && <small>{place.address}</small>}
          {placeContext(place, t) && place.label !== place.name && <small>{place.label}</small>}
        </button>
      </li>)}
    </ul>}
    <p id={id+"-help"} className="lr-place-help" role="status">
      {loading ? t("Buscando lugares…") : error ? t(error) : value
        ? (value.adjusted ? t("Ubicación ajustada en el mapa.") : placeContext(value, t) || value.label)
        : open && query.trim().length >= 3 && !options.length
          ? t("Selecciona un resultado; si no aparece, precisa el nombre o la localidad.")
          : t("Escribe al menos 3 caracteres y selecciona una sugerencia.")}
    </p>
    {error && !loading && <Button type="button" variant="outline" size="sm"
      onMouseDown={event=>event.preventDefault()}
      onClick={()=>{setOpen(true);setRetry(n=>n+1);}}>{t("Reintentar búsqueda")}</Button>}
  </div>;
}
