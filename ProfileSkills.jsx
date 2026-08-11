"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * ProfileSkills
 * Inventario táctil de habilidades y recursos del voluntario.
 * - Chips seleccionables de un toque (touch target >= 48px)
 * - Un solo color de acento para el estado "seleccionado"
 * - Guarda en `user_skills` y campos de `users` (vehículo, tiempo, ubicación)
 *
 * Props:
 *   userId: string (uuid del usuario autenticado)
 */
export default function ProfileSkills({ userId }) {
  const [allSkills, setAllSkills] = useState([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState(new Set());
  const [hasVehicle, setHasVehicle] = useState(false);
  const [availability, setAvailability] = useState(0); // horas/semana
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  // Carga catálogo de habilidades + selección actual del usuario
  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);

      const [{ data: skills }, { data: profile }, { data: userSkills }] =
        await Promise.all([
          supabase.from("skills").select("id, name, category").order("category"),
          supabase
            .from("users")
            .select("has_vehicle, weekly_availability_hours, location")
            .eq("id", userId)
            .maybeSingle(),
          supabase.from("user_skills").select("skill_id").eq("user_id", userId),
        ]);

      if (!isMounted) return;

      setAllSkills(skills ?? []);
      setSelectedSkillIds(new Set((userSkills ?? []).map((s) => s.skill_id)));
      if (profile) {
        setHasVehicle(!!profile.has_vehicle);
        setAvailability(profile.weekly_availability_hours ?? 0);
        setLocation(profile.location ?? "");
      }
      setLoading(false);
    }

    if (userId) load();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const skillsByCategory = useMemo(() => {
    const groups = {};
    for (const skill of allSkills) {
      groups[skill.category] = groups[skill.category] || [];
      groups[skill.category].push(skill);
    }
    return groups;
  }, [allSkills]);

  function toggleSkill(skillId) {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      next.has(skillId) ? next.delete(skillId) : next.add(skillId);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSavedMessage("");

    // 1. Actualiza datos base del perfil
    await supabase
      .from("users")
      .update({
        has_vehicle: hasVehicle,
        weekly_availability_hours: availability,
        location,
      })
      .eq("id", userId);

    // 2. Reemplaza el set de habilidades seleccionadas
    await supabase.from("user_skills").delete().eq("user_id", userId);
    const rows = Array.from(selectedSkillIds).map((skill_id) => ({
      user_id: userId,
      skill_id,
    }));
    if (rows.length > 0) {
      await supabase.from("user_skills").insert(rows);
    }

    setSaving(false);
    setSavedMessage("Perfil guardado");
    setTimeout(() => setSavedMessage(""), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-muted text-sm">Cargando tu perfil…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-28">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-xl font-semibold text-ink">Tu perfil de ayuda</h1>
        <p className="mt-1 text-sm text-muted leading-relaxed">
          Cuéntanos qué sabes hacer y con qué cuentas. Así podemos mostrarte
          causas donde realmente puedes ser útil.
        </p>
      </header>

      {/* Habilidades por categoría */}
      <section className="px-5 space-y-6">
        {Object.entries(skillsByCategory).map(([category, skills]) => (
          <div key={category}>
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted mb-2">
              {formatCategoryLabel(category)}
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => {
                const isSelected = selectedSkillIds.has(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    aria-pressed={isSelected}
                    className={[
                      "min-h-[48px] px-4 rounded-chip text-sm font-medium border transition-colors",
                      "flex items-center justify-center active:scale-[0.98]",
                      isSelected
                        ? "bg-accent text-white border-accent"
                        : "bg-white text-ink border-border",
                    ].join(" ")}
                  >
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Recursos y movilidad */}
      <section className="px-5 mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted mb-3">
          Recursos y disponibilidad
        </h2>

        <div className="bg-white border border-border rounded-card p-4 space-y-5">
          {/* Vehículo propio */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Vehículo propio</p>
              <p className="text-xs text-muted">
                Útil para logística y traslados
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hasVehicle}
              onClick={() => setHasVehicle((v) => !v)}
              className={[
                "w-14 h-8 rounded-full flex items-center px-1 transition-colors shrink-0",
                hasVehicle ? "bg-accent justify-end" : "bg-border justify-start",
              ].join(" ")}
            >
              <span className="w-6 h-6 bg-white rounded-full shadow" />
            </button>
          </div>

          {/* Disponibilidad semanal */}
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="availability">
              Horas disponibles por semana
            </label>
            <input
              id="availability"
              type="number"
              min={0}
              max={40}
              value={availability}
              onChange={(e) => setAvailability(Number(e.target.value))}
              className="mt-2 w-full min-h-[48px] rounded-lg border border-border px-3 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Ubicación / distrito */}
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="location">
              Ubicación / distrito
            </label>
            <input
              id="location"
              type="text"
              placeholder="Ej. Surco, Lima"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2 w-full min-h-[48px] rounded-lg border border-border px-3 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </section>

      {/* Guardar (fija sobre la bottom nav) */}
      <div className="fixed bottom-20 left-0 right-0 px-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full min-h-[52px] rounded-full bg-accent text-white text-sm font-semibold shadow-sm active:bg-accent-hover disabled:opacity-60"
        >
          {saving ? "Guardando…" : savedMessage || "Guardar perfil"}
        </button>
      </div>
    </div>
  );
}

function formatCategoryLabel(category) {
  const labels = {
    tecnica: "Técnicas",
    logistica: "Logística",
    salud: "Salud",
    emocional: "Apoyo emocional",
    creativa: "Creativas",
    administrativa: "Administrativas",
    otra: "Otras",
  };
  return labels[category] ?? category;
}
