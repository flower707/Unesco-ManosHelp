import { NextResponse } from "next/server";
import { getSmartSkillMatch } from "../../lib/geminiMatching";

// POST /api/smart-match
// body: { causeText: string, userSkills: string[] }
export async function POST(request) {
  try {
    const { causeText, userSkills } = await request.json();

    if (!causeText || !Array.isArray(userSkills)) {
      return NextResponse.json(
        { error: "causeText (string) y userSkills (array) son requeridos." },
        { status: 400 }
      );
    }

    const match = await getSmartSkillMatch(causeText, userSkills);
    return NextResponse.json(match, { status: 200 });
  } catch (err) {
    console.error("Error en /api/smart-match:", err);
    return NextResponse.json(
      { error: "No se pudo generar la sugerencia. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
