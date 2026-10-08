// Cloud sync between the local Zustand store and Supabase tables.
// Strategy: cloud is source of truth per user. On login we hydrate the store
// from cloud, then subscribe to store changes and write through (debounced).
// On first login for a user whose cloud is empty, we import their existing
// local data once and mark `profiles.legacy_imported_at`.

import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import type { Activity, Project, Property, PropertyDocument, ViewingNote } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (id: string, map: Map<string, string>) => {
  if (UUID_RE.test(id)) return id;
  const existing = map.get(id);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  map.set(id, fresh);
  return fresh;
};

interface Snapshot {
  projects: Map<string, string>; // id -> JSON
  properties: Map<string, string>;
  viewings: Map<string, string>; // propertyId -> JSON of checks
  documents: Map<string, string>;
  activities: Map<string, string>;
}

const empty = (): Snapshot => ({
  projects: new Map(), properties: new Map(), viewings: new Map(),
  documents: new Map(), activities: new Map(),
});

let currentUserId: string | null = null;
let snapshot: Snapshot = empty();
let unsubscribe: (() => void) | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let saving = false;

function diff<T extends { id: string }>(
  prev: Map<string, string>,
  next: T[],
): { upserts: T[]; deletes: string[] } {
  const upserts: T[] = [];
  const seen = new Set<string>();
  for (const item of next) {
    seen.add(item.id);
    const json = JSON.stringify(item);
    if (prev.get(item.id) !== json) upserts.push(item);
  }
  const deletes: string[] = [];
  for (const id of prev.keys()) if (!seen.has(id)) deletes.push(id);
  return { upserts, deletes };
}

function diffViewings(prev: Map<string, string>, next: Record<string, ViewingNote>) {
  const upserts: ViewingNote[] = [];
  const seen = new Set<string>();
  for (const v of Object.values(next)) {
    seen.add(v.propertyId);
    const json = JSON.stringify(v.checks);
    if (prev.get(v.propertyId) !== json) upserts.push(v);
  }
  const deletes: string[] = [];
  for (const id of prev.keys()) if (!seen.has(id)) deletes.push(id);
  return { upserts, deletes };
}

async function pushChanges(userId: string) {
  if (saving) return;
  saving = true;
  try {
    const s = useStore.getState();

    // Projects
    {
      const d = diff(snapshot.projects, s.projects);
      if (d.upserts.length) {
        const rows = d.upserts.map((p) => ({
          id: p.id, user_id: userId, name: p.name, status: p.status,
          is_demo: !!p.isDemo, data: p as any,
        }));
        const { error } = await supabase.from("projects").upsert(rows);
        if (error) throw error;
        for (const p of d.upserts) snapshot.projects.set(p.id, JSON.stringify(p));
      }
      if (d.deletes.length) {
        await supabase.from("projects").delete().in("id", d.deletes).eq("user_id", userId);
        for (const id of d.deletes) snapshot.projects.delete(id);
      }
    }
    // Properties
    {
      const d = diff(snapshot.properties, s.properties);
      if (d.upserts.length) {
        const rows = d.upserts.map((p) => ({
          id: p.id, user_id: userId, project_id: p.projectId || null,
          title: p.title, status: p.status, is_demo: !!p.isDemo,
          data: p as any,
        }));
        const { error } = await supabase.from("properties").upsert(rows);
        if (error && /property_limit_reached/.test(error.message)) {
          // Ein neues Objekt über dem Plan-Limit darf die übrigen Änderungen nicht blockieren:
          // einzeln speichern und nur die abgelehnten Zeilen auslassen.
          for (let i = 0; i < rows.length; i++) {
            const { error: rowError } = await supabase.from("properties").upsert(rows[i]);
            if (rowError) { console.warn("[cloud-sync] property rejected:", rows[i].id, rowError.message); continue; }
            snapshot.properties.set(d.upserts[i].id, JSON.stringify(d.upserts[i]));
          }
        } else {
          if (error) throw error;
          for (const p of d.upserts) snapshot.properties.set(p.id, JSON.stringify(p));
        }
      }
      if (d.deletes.length) {
        await supabase.from("properties").delete().in("id", d.deletes).eq("user_id", userId);
        for (const id of d.deletes) snapshot.properties.delete(id);
      }
    }
    // Viewings
    {
      const d = diffViewings(snapshot.viewings, s.viewings);
      if (d.upserts.length) {
        const rows = d.upserts.map((v) => ({
          property_id: v.propertyId, user_id: userId, checks: v.checks as any,
        }));
        const { error } = await supabase.from("viewings").upsert(rows);
        if (error) throw error;
        for (const v of d.upserts) snapshot.viewings.set(v.propertyId, JSON.stringify(v.checks));
      }
      if (d.deletes.length) {
        await supabase.from("viewings").delete().in("property_id", d.deletes).eq("user_id", userId);
        for (const id of d.deletes) snapshot.viewings.delete(id);
      }
    }
    // Documents
    {
      const d = diff(snapshot.documents, s.documents);
      if (d.upserts.length) {
        const rows = d.upserts.map((x) => ({
          id: x.id, user_id: userId, property_id: x.propertyId || null,
          data: x as any,
        }));
        const { error } = await supabase.from("documents").upsert(rows);
        if (error) throw error;
        for (const x of d.upserts) snapshot.documents.set(x.id, JSON.stringify(x));
      }
      if (d.deletes.length) {
        await supabase.from("documents").delete().in("id", d.deletes).eq("user_id", userId);
        for (const id of d.deletes) snapshot.documents.delete(id);
      }
    }
    // Activities
    {
      const d = diff(snapshot.activities, s.activities);
      if (d.upserts.length) {
        const rows = d.upserts.map((a) => ({
          id: a.id, user_id: userId, property_id: a.propertyId || null,
          data: a as any,
        }));
        const { error } = await supabase.from("activities").upsert(rows);
        if (error) throw error;
        for (const a of d.upserts) snapshot.activities.set(a.id, JSON.stringify(a));
      }
      if (d.deletes.length) {
        await supabase.from("activities").delete().in("id", d.deletes).eq("user_id", userId);
        for (const id of d.deletes) snapshot.activities.delete(id);
      }
    }
  } catch (e) {
    console.error("[cloud-sync] push failed:", e);
  } finally {
    saving = false;
  }
}

/** Ausstehende Änderungen sofort speichern – z. B. vor einem harten Seitenwechsel. */
export async function flushCloudSync() {
  if (!currentUserId) return;
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  for (let i = 0; i < 20 && saving; i++) await new Promise((r) => setTimeout(r, 100));
  await pushChanges(currentUserId);
}

function scheduleWrite(userId: string) {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => pushChanges(userId), 600);
}

function captureSnapshot() {
  const s = useStore.getState();
  snapshot = empty();
  for (const p of s.projects) snapshot.projects.set(p.id, JSON.stringify(p));
  for (const p of s.properties) snapshot.properties.set(p.id, JSON.stringify(p));
  for (const v of Object.values(s.viewings)) snapshot.viewings.set(v.propertyId, JSON.stringify(v.checks));
  for (const d of s.documents) snapshot.documents.set(d.id, JSON.stringify(d));
  for (const a of s.activities) snapshot.activities.set(a.id, JSON.stringify(a));
}

async function loadFromCloud(userId: string) {
  const [{ data: projects }, { data: properties }, { data: viewings }, { data: documents }, { data: activities }] =
    await Promise.all([
      supabase.from("projects").select("data").eq("user_id", userId),
      supabase.from("properties").select("data").eq("user_id", userId),
      supabase.from("viewings").select("property_id, checks").eq("user_id", userId),
      supabase.from("documents").select("data").eq("user_id", userId),
      supabase.from("activities").select("data").eq("user_id", userId),
    ]);

  const projs = (projects ?? []).map((r) => r.data as unknown as Project);
  const props = (properties ?? []).map((r) => r.data as unknown as Property);
  const vws: Record<string, ViewingNote> = {};
  for (const v of viewings ?? []) {
    vws[v.property_id as string] = { propertyId: v.property_id as string, checks: (v.checks as any) ?? {} };
  }
  const docs = (documents ?? []).map((r) => r.data as unknown as PropertyDocument);
  const acts = (activities ?? []).map((r) => r.data as unknown as Activity);

  const activeProjectId = projs[0]?.id ?? "";
  useStore.setState({
    projects: projs,
    properties: props,
    viewings: vws,
    documents: docs,
    activities: acts,
    activeProjectId,
  } as any);
}

async function importLegacyToCloud(userId: string) {
  const s = useStore.getState();
  if (!s.projects.length && !s.properties.length) return false;

  // Map non-uuid ids → uuid so DB inserts succeed
  const idMap = new Map<string, string>();
  const projects: Project[] = s.projects.map((p) => ({
    ...p, id: asUuid(p.id, idMap), isDemo: !!p.isDemo,
  }));
  const properties: Property[] = s.properties.map((p) => ({
    ...p,
    id: asUuid(p.id, idMap),
    projectId: p.projectId ? asUuid(p.projectId, idMap) : "",
    isDemo: !!p.isDemo,
  }));
  const documents: PropertyDocument[] = s.documents.map((d) => ({
    ...d, id: asUuid(d.id, idMap), propertyId: d.propertyId ? asUuid(d.propertyId, idMap) : "",
  }));
  const activities: Activity[] = s.activities.map((a) => ({
    ...a, id: asUuid(a.id, idMap), propertyId: a.propertyId ? asUuid(a.propertyId, idMap) : "",
  }));
  const viewings: Record<string, ViewingNote> = {};
  for (const v of Object.values(s.viewings)) {
    const newId = asUuid(v.propertyId, idMap);
    viewings[newId] = { propertyId: newId, checks: v.checks };
  }

  // Apply remapped ids back to the store BEFORE pushing, so snapshot matches DB
  useStore.setState({
    projects, properties, documents, activities, viewings,
    activeProjectId: projects[0]?.id ?? "",
  } as any);

  // Push everything as upserts in dependency order
  if (projects.length) {
    await supabase.from("projects").upsert(projects.map((p) => ({
      id: p.id, user_id: userId, name: p.name, status: p.status,
      is_demo: !!p.isDemo, data: p as any,
    })));
  }
  if (properties.length) {
    await supabase.from("properties").upsert(properties.map((p) => ({
      id: p.id, user_id: userId, project_id: p.projectId || null,
      title: p.title, status: p.status, is_demo: !!p.isDemo,
      data: p as any,
    })));
  }
  if (Object.keys(viewings).length) {
    await supabase.from("viewings").upsert(Object.values(viewings).map((v) => ({
      property_id: v.propertyId, user_id: userId, checks: v.checks as any,
    })));
  }
  if (documents.length) {
    await supabase.from("documents").upsert(documents.map((x) => ({
      id: x.id, user_id: userId, property_id: x.propertyId || null,
      data: x as any,
    })));
  }
  if (activities.length) {
    await supabase.from("activities").upsert(activities.map((a) => ({
      id: a.id, user_id: userId, property_id: a.propertyId || null,
      data: a as any,
    })));
  }
  return true;
}

export async function initCloudSync(userId: string) {
  if (currentUserId === userId) return;
  await stopCloudSync();
  currentUserId = userId;

  try {
    // Load existing cloud data
    await loadFromCloud(userId);

    // First-login import check
    const { data: profile } = await supabase
      .from("profiles")
      .select("legacy_imported_at")
      .eq("id", userId)
      .maybeSingle();

    const cloudEmpty = useStore.getState().projects.length === 0
      && useStore.getState().properties.length === 0;

    if (cloudEmpty && !profile?.legacy_imported_at) {
      // Try to read legacy local persist (pre-auth single-tenant data)
      try {
        const raw = localStorage.getItem("immo-invest-store-v2");
        if (raw) {
          const parsed = JSON.parse(raw);
          const legacy = parsed?.state;
          if (legacy?.projects?.length || legacy?.properties?.length) {
            useStore.setState({
              projects: legacy.projects ?? [],
              properties: legacy.properties ?? [],
              viewings: legacy.viewings ?? {},
              documents: legacy.documents ?? [],
              activities: legacy.activities ?? [],
              activeProjectId: legacy.activeProjectId ?? (legacy.projects?.[0]?.id ?? ""),
            } as any);
          }
        }
      } catch (e) { console.warn("[cloud-sync] could not read legacy persist", e); }

      const imported = await importLegacyToCloud(userId);
      await supabase.from("profiles").update({ legacy_imported_at: new Date().toISOString() }).eq("id", userId);
      if (imported) console.info("[cloud-sync] legacy data imported to cloud");
    }

    // Ensure user always has at least one project
    if (useStore.getState().projects.length === 0) {
      const { DEFAULT_ASSUMPTIONS } = await import("@/lib/calc");
      // Werte aus dem Onboarding übernehmen, falls es vor dem ersten Laden abgeschlossen wurde.
      const { data: us } = await supabase
        .from("user_settings")
        .select("default_equity, default_interest_rate")
        .eq("user_id", userId)
        .maybeSingle();
      const ek = (us as any)?.default_equity as number | null | undefined;
      const zinsPct = (us as any)?.default_interest_rate as number | null | undefined;
      const confirmed = ek != null || zinsPct != null;
      const nowIso = new Date().toISOString();
      const proj: Project = {
        id: crypto.randomUUID(), name: "Mein erstes Projekt", description: "",
        investmentGoal: "", locationFocus: "Wien", budgetMin: null, budgetMax: null,
        maxNegativeCashflow: null, preferredSizeMin: null, preferredSizeMax: null,
        preferredDistricts: "", status: "Aktiv",
        assumptions: {
          ...DEFAULT_ASSUMPTIONS,
          ...(ek != null ? { eigenkapital: ek } : {}),
          ...(zinsPct != null ? { zinssatz: zinsPct / 100 } : {}),
        },
        ...(confirmed ? { assumptionsConfirmed: true } : {}),
        createdAt: nowIso, updatedAt: nowIso,
      } as Project;
      useStore.setState({ projects: [proj], activeProjectId: proj.id } as any);
      await supabase.from("projects").upsert({
        id: proj.id, user_id: userId, name: proj.name, status: proj.status,
        is_demo: false, data: proj as any,
      });
    } else if (!useStore.getState().activeProjectId) {
      useStore.setState({ activeProjectId: useStore.getState().projects[0].id } as any);
    }
  } catch (e) {
    console.error("[cloud-sync] init failed:", e);
  }

  captureSnapshot();
  unsubscribe = useStore.subscribe(() => {
    if (currentUserId) scheduleWrite(currentUserId);
  });
}

export async function stopCloudSync() {
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (currentUserId) {
    // Final flush
    try { await pushChanges(currentUserId); } catch {}
  }
  currentUserId = null;
  snapshot = empty();
  // Reset to empty so signed-out user doesn't see previous user's data
  useStore.setState({
    projects: [], properties: [], viewings: {}, documents: [], activities: [],
    activeProjectId: "",
  } as any);
}
