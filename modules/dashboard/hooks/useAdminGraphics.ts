"use client";

import { useCallback, useEffect, useState } from "react";
import { listProfiles } from "@/modules/crm/users/services/usersService";
import { getAdminAgencies } from "@/modules/agency/services/admin/admin-agency.service";
import { getAdminPublications } from "@/modules/publications/services/admin/admin-publication.service";
import { listReservations, type Reservation } from "@/modules/transport/reservations/services/reservation.service";
import type { SystemUser } from "@/modules/crm/users/models/User";

type Resource<T> = { data: T | null; loading: boolean; error: boolean };
type Agencies = Awaited<ReturnType<typeof getAdminAgencies>>;
type Publications = Awaited<ReturnType<typeof getAdminPublications>>;
const initial = <T,>(): Resource<T> => ({ data: null, loading: true, error: false });

/** Datos de las gráficas de admin. A diferencia del inicio, no pide el detalle de cada publicación. */
export function useAdminGraphics() {
  const [users, setUsers] = useState(initial<SystemUser[]>);
  const [agencies, setAgencies] = useState(initial<Agencies>);
  const [publications, setPublications] = useState(initial<Publications>);
  const [reservations, setReservations] = useState(initial<Reservation[]>);
  const [today, setToday] = useState("");
  const [request, setRequest] = useState(0);
  const reload = useCallback(() => setRequest((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    async function load<T>(fetcher: () => Promise<T>, update: (value: Resource<T>) => void) {
      update(initial<T>());
      try {
        const data = await fetcher();
        if (active) update({ data, loading: false, error: false });
      } catch {
        if (active) update({ data: null, loading: false, error: true });
      }
    }
    queueMicrotask(() => {
      if (!active) return;
      setToday(new Date().toISOString());
      void Promise.all([
        load(listProfiles, setUsers), load(getAdminAgencies, setAgencies),
        load(getAdminPublications, setPublications), load(listReservations, setReservations),
      ]);
    });
    return () => { active = false; };
  }, [request]);

  return { users, agencies, publications, reservations, today, reload };
}
