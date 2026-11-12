'use client';

import { usePreferences } from "@/lib/preferences/Preferences";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CurrencyNotice } from '@/components/preferences/PreferenceControls';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PublicShell } from './PublicShell';
import { type Experience } from './types';

type DurationFilter = 'SHORT' | 'HALF' | 'FULL';

function durationMatches(durationMinutes: number, filters: DurationFilter[]) {
  if (filters.length === 0) return true;

  return filters.some((filter) => {
    if (filter === 'SHORT') return durationMinutes <= 120;
    if (filter === 'HALF') return durationMinutes > 120 && durationMinutes <= 300;
    return durationMinutes > 300;
  });
}

function departureMatchesDate(startAt: string, date: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startAt)) === date;
}

export function Catalog() {
  const { t, money, dateLabel } = usePreferences();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get('search') ?? '';
  const initialType = searchParams.get('type') ?? '';

  const [items, setItems] = useState<Experience[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState(initialSearch);
  const [type, setType] = useState(initialType);
  const [retry, setRetry] = useState(0);

  const minPrice = Number(searchParams.get('minPrice') ?? '');
  const maxPrice = Number(searchParams.get('maxPrice') ?? '');
  const date = searchParams.get('date') ?? '';
  const people = Number(searchParams.get('people') ?? '0');
  const availableOnly = searchParams.get('available') === '1';

  const durations = useMemo(() => {
    const raw = searchParams.get('durations') ?? '';
    return raw
      .split(',')
      .filter((value): value is DurationFilter =>
        value === 'SHORT' || value === 'HALF' || value === 'FULL',
      );
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError('');
      }
    });

    fetch('/api/catalog', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async response => {
        const body = await response.json() as { data: Experience[]; error?: string };
        if (!response.ok) throw new Error(body.error);
        setItems(body.data);
      })
      .catch(cause => {
        if (cause.name !== 'AbortError') {
          setError('No pudimos cargar las experiencias. Intenta de nuevo.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [retry]);

  const visible = useMemo(() => {
    const normalizedDestination = destination.trim().toLocaleLowerCase();

    return items.filter((publication) => {
      const matchesType = !type || publication.serviceType === type;
      const matchesDestination = !normalizedDestination ||
        `${publication.title} ${publication.destination}`
          .toLocaleLowerCase()
          .includes(normalizedDestination);

      const matchesMinPrice = !Number.isFinite(minPrice) || minPrice <= 0 || publication.price >= minPrice;
      const matchesMaxPrice = !Number.isFinite(maxPrice) || maxPrice <= 0 || publication.price <= maxPrice;
      const matchesDuration = durationMatches(publication.duration, durations);

      const departures = publication.departures ?? [];
      const matchesAvailability = !availableOnly || departures.some((departure) => departure.available > 0);

      const matchesDateAndPeople = (!date && !people) || departures.some((departure) =>
        departure.available >= (people || 1) &&
        (!date || departureMatchesDate(departure.startAt, date)),
      );

      return matchesType &&
        matchesDestination &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesDuration &&
        matchesAvailability &&
        matchesDateAndPeople;
    });
  }, [availableOnly, date, destination, durations, items, maxPrice, minPrice, people, type]);

  return (
    <PublicShell>
      <main id="contenido" tabIndex={-1}>
        <section className="booking-hero">
          <div>
            <p className="booking-eyebrow">{t("CERCA DE LO QUE TE MUEVE")}</p>
            <h1>{t("Tu próxima historia")}<br/>{t("empieza en Costa Rica.")}</h1>
            <p>{t("Encuentra una excursión o transporte, elige tu salida y solicita tu reserva con un proveedor local.")}</p>
            <a className="booking-hero-link" href="#experiencias">{t("Encuentra tu próxima salida")}</a>
          </div>
          <img src="/playa.jpg" alt={t("Playa y costa de Costa Rica")} fetchPriority="high"/>
        </section>

        <section className="booking-container" id="experiencias">
          <div className="booking-section-heading">
            <div>
              <p className="booking-eyebrow">{t("SAL A EXPLORAR")}</p>
              <h2>{t("Un plan para tu próxima escapada")}</h2>
            </div>
            <p>{t("Precios por persona en dólares estadounidenses (USD).")}</p>
          </div>

          <CurrencyNotice />

          <div className="booking-search">
            <label>
              {t("¿A dónde quieres ir?")}
              <input
                type="search"
                placeholder={t("Busca un destino o experiencia")}
                value={destination}
                onChange={event => setDestination(event.target.value)}
              />
            </label>

            <label>
              {t("Tipo de experiencia")}
              <select value={type} onChange={event => setType(event.target.value)}>
                <option value="">{t("Todas las experiencias")}</option>
                <option value="EXCURSION">{t("Excursiones")}</option>
                <option value="TRANSPORT">{t("Transporte")}</option>
              </select>
            </label>
          </div>

          {loading ? (
            <p role="status" className="booking-empty">{t("Buscando próximas salidas…")}</p>
          ) : error ? (
            <div className="booking-empty" role="alert">
              <p>{t(error)}</p>
              <Button onClick={() => setRetry(current => current + 1)}>{t("Volver a intentar")}</Button>
            </div>
          ) : (
            <>
              <p className="booking-results" role="status">
                {visible.length} {visible.length === 1 ? t('experiencia') : t('experiencias')}
              </p>

              <div className="booking-grid">
                {visible.map(publication => (
                  <article className="booking-card" key={publication.id}>
                    <Link href={`/experiencias/${publication.id}`} className="booking-card-image">
                      <img src={publication.image || '/playa.jpg'} alt={publication.title} loading="lazy"/>
                      <span>{publication.serviceType === 'TRANSPORT' ? t("Transporte") : t("Excursión")}</span>
                    </Link>

                    <div className="booking-card-body">
                      <p className="booking-eyebrow">{publication.destination}</p>
                      <h3><Link href={`/experiencias/${publication.id}`}>{publication.title}</Link></h3>
                      <p>{publication.agency}</p>
                      <p className="booking-next">
                        {publication.departures.find(departure => departure.available > 0)
                          ? `${t("Próxima salida:")} ${dateLabel(publication.departures.find(departure => departure.available > 0)!.startAt)}`
                          : t("Sin salidas disponibles por ahora")}
                      </p>
                      <div className="booking-card-bottom">
                        <p><strong>{money(publication.price)}</strong><small>{t("por persona")}</small></p>
                        <Button asChild variant="outline"><Link href={`/experiencias/${publication.id}`}>{t("Ver detalles")}</Link></Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {visible.length === 0 && (
                <div className="booking-empty">
                  <h3>{items.length ? t("No encontramos ese plan") : t("Estamos preparando nuevas salidas")}</h3>
                  <p>{items.length ? t("Prueba con otro destino o revisa todas las experiencias.") : t("Vuelve pronto para consultar las experiencias disponibles.")}</p>
                  {items.length > 0 && (
                    <Button variant="outline" onClick={() => {
                      setDestination('');
                      setType('');
                    }}>
                      {t("Limpiar filtros")}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <section className="booking-how booking-container" id="como-reservar">
          <h2>{t("De la idea al viaje, paso a paso")}</h2>
          <div className="booking-grid">
            <div><b>{t("01 · Elige tu plan")}</b><p>{t("Revisa los detalles, la fecha y el cupo antes de reservar.")}</p></div>
            <div><b>{t("02 · Confirma tu reserva")}</b><p>{t("Inicia sesión, revisa el total y paga con tarjeta al reservar.")}</p></div>
            <div><b>{t("03 · Consulta tu viaje")}</b><p>{t("Encuentra la fecha, el punto de encuentro y los datos del proveedor en Mis reservas.")}</p></div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
