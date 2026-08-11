/**
 * geminiMatching.js
 * Función de servidor que consulta la API de Gemini para hacer
 * "Smart Skill-Matching": dado el texto de una causa/emergencia y las
 * habilidades de un usuario, devuelve el rol exacto donde el usuario
 * puede ser más útil.
 *
 * Requiere la variable de entorno GEMINI_API_KEY (server-side only,
 * nunca la expongas en el cliente).
 *
 * Modelo: usamos un modelo "flash" por costo/latencia. Revisa la
 * documentación de Google AI (ai.google.dev) por si el nombre del
 * modelo cambió desde que se escribió este código.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * @param {string} causeText - Título + historia humana de la causa.
 * @param {string[]} userSkills - Lista de nombres de habilidades del usuario.
 * @returns {Promise<{ role: string, reason: string, confidence: "alta"|"media"|"baja" }>}
 */
export async function getSmartSkillMatch(causeText, userSkills) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en las variables de entorno del servidor.");
  }

  if (!causeText || !Array.isArray(userSkills)) {
    throw new Error("causeText (string) y userSkills (array) son requeridos.");
  }

  const prompt = buildPrompt(causeText, userSkills);

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  return safeParseMatch(rawText);
}

function buildPrompt(causeText, userSkills) {
  return `Eres un coordinador de voluntariado experto en emergencias sociales y ambientales.

CAUSA / EMERGENCIA:
"""
${causeText}
"""

HABILIDADES DEL VOLUNTARIO:
${userSkills.length > 0 ? userSkills.map((s) => `- ${s}`).join("\n") : "- (sin habilidades registradas)"}

Tarea: identifica el ROL EXACTO donde este voluntario sería más útil para
esta causa específica. Sé concreto y accionable (evita roles genéricos como
"ayudante"). Si sus habilidades no calzan bien, sugiere igualmente la mejor
opción razonable (por ejemplo, difusión o apoyo logístico básico).

Responde ÚNICAMENTE con un objeto JSON, sin texto adicional, con esta forma:
{
  "role": "string corto, el rol sugerido",
  "reason": "1-2 frases explicando por qué, en tono cálido y directo",
  "confidence": "alta" | "media" | "baja"
}`;
}

function safeParseMatch(rawText) {
  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      role: parsed.role ?? "Apoyo general",
      reason: parsed.reason ?? "",
      confidence: parsed.confidence ?? "media",
    };
  } catch (err) {
    console.error("No se pudo parsear la respuesta de Gemini:", rawText, err);
    return {
      role: "Apoyo general",
      reason: "No pudimos generar una sugerencia detallada en este momento.",
      confidence: "baja",
    };
  }
}
