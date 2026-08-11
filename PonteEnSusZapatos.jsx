"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * PonteEnSusZapatos
 * Dinámica de sensibilización interactiva: presenta una causa real,
 * cruza las habilidades del usuario con lo que la causa necesita, y
 * ofrece un reto personalizado con una llamada a la acción clara.
 *
 * Props:
 *   causeId: string (uuid de la causa a mostrar)
 *   userId: string (uuid del usuario autenticado)
 */
export default function PonteEnSusZapatos({ causeId, userId }) {
  const [cause, setCause] = useState(null);
  const [userSkillNames, setUserSkillNames] = useState([]);
  const [matchedSkillNames, setMatchedSkillNames] = useState([]);
  const [aiMatch, setAiMatch] = useState(null); // resultado de Gemini (opcional)
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);

      const [{ data: causeData }, { data: needSkills }, { data: userSkillRows }] =
        await Promise.all([
          supabase.from("causes").select("*").eq("id", causeId).maybeSingle(),
          supabase
            .from("need_skills")
            .select("quantity_needed, skills(id, name)")
            .eq("cause_id", causeId),
          supabase
            .from("user_skills")
            .select("skills(id, name)")
            .eq("user_id", userId),
        ]);

      if (!isMounted) return;

      const userNames = (userSkillRows ?? []).map((r) => r.skills?.name).filter(Boolean);
      const neededNames = (needSkills ?? []).map((r) => r.skills?.name).filter(Boolean);
      const overlap = neededNames.filter((name) => userNames.includes(name));

      setCause(causeData);
      setUserSkillNames(userNames);
      setMatchedSkillNames(overlap);
      setLoading(false);
    }

    if (causeId && userId) load();
    return () => {
      isMounted = false;
    };
  }, [causeId, userId]);

  // Consulta opcional al backend (Gemini) para un match más matizado
  async function requestSmartMatch() {
    setLoadingMatch(true);
    try {
      const res = await fetch("/api/smart-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          causeText: `${cause.title}. ${cause.human_story}`,
          userSkills: userSkillNames,
        }),
      });
      const data = await res.json();
      setAiMatch(data);
    } catch (err) {
      console.error("Error consultando smart-match:", err);
    } finally {
      setLoadingMatch(false);
    }
  }

  async function handleActivate() {
    // Aquí se registraría la acción del voluntario (tabla intermedia
    // volunteer_actions, fuera del alcance del esquema mínimo del MVP).
    setActivated(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-muted text-sm">Cargando la causa…</p>
      </div>
    );
  }

  if (!cause) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6 text-center">
        <p className="text-muted text-sm">No encontramos esta causa.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Imagen y encabezado */}
      <div className="w-full aspect-[4/3] bg-border overflow-hidden">
        {cause.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cause.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="px-5 -mt-6 relative">
        <div className="bg-white rounded-card border border-border p-5 shadow-sm">
          <p className="text-xs font-medium text-accent uppercase tracking-wide">
            Ponte en sus zapatos
          </p>
          <h1 className="mt-1 text-lg font-semibold text-ink leading-snug">
            {cause.title}
          </h1>
          <p className="mt-3 text-sm text-ink leading-relaxed">
            {cause.human_story}
          </p>
          <p className="mt-3 text-xs text-muted">{cause.location}</p>
        </div>

        {/* Reto personalizado */}
        <div className="mt-5">
          <h2 className="text-sm font-semibold text-ink">
            ¿Cómo podrías ayudar tú hoy?
          </h2>

          {matchedSkillNames.length > 0 ? (
            <p className="mt-2 text-sm text-ink leading-relaxed">
              Detectamos que sabes de{" "}
              <span className="font-medium text-accent">
                {matchedSkillNames.join(" y ")}
              </span>
              . Esta causa necesita justamente eso.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Aún no tienes habilidades registradas que calcen directamente,
              pero siempre puedes ayudar difundiendo esta causa.
            </p>
          )}

          {/* Opciones sugeridas */}
          <div className="mt-4 space-y-2">
            {matchedSkillNames.map((name) => (
              <div
                key={name}
                className="border border-accent/30 bg-accent-soft rounded-card p-3"
              >
                <p className="text-sm font-medium text-ink">
                  Opción: apoyar en {name.toLowerCase()}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Basado en tu perfil, aquí puedes tener el mayor impacto.
                </p>
              </div>
            ))}

            <div className="border border-border bg-white rounded-card p-3">
              <p className="text-sm font-medium text-ink">
                Opción: difusión consciente
              </p>
              <p className="text-xs text-muted mt-0.5">
                Comparte esta causa con una persona que conozcas. Un toque, un
                impacto real.
              </p>
            </div>
          </div>

          {/* Match asistido por IA (opcional, bajo demanda) */}
          {aiMatch?.role && (
            <div className="mt-4 border border-accent bg-accent-soft rounded-card p-3">
              <p className="text-xs font-medium text-accent uppercase tracking-wide">
                Rol sugerido
              </p>
              <p className="text-sm text-ink mt-1">{aiMatch.role}</p>
              {aiMatch.reason && (
                <p className="text-xs text-muted mt-1">{aiMatch.reason}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={requestSmartMatch}
            disabled={loadingMatch}
            className="mt-3 text-xs font-medium text-accent underline underline-offset-2 disabled:opacity-50"
          >
            {loadingMatch ? "Analizando tu perfil…" : "Ver sugerencia detallada"}
          </button>
        </div>
      </div>

      {/* CTA principal, fijo sobre la bottom nav */}
      <div className="fixed bottom-20 left-0 right-0 px-5">
        <button
          type="button"
          onClick={handleActivate}
          disabled={activated}
          className="w-full min-h-[52px] rounded-full bg-accent text-white text-sm font-semibold shadow-sm active:bg-accent-hover disabled:opacity-70"
        >
          {activated
            ? "Voluntariado activado"
            : "ACTIVAR MI VOLUNTARIADO EN ESTA CAUSA REAL"}
        </button>
      </div>
    </div>
  );
}
