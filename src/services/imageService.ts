/**
 * imageService.ts
 *
 * Generates background and character images using Imagen 3 via Vertex AI.
 *
 * Style DNA (Duolingo):
 *  - Geometric abstraction: every object = circle / square / squircle
 *  - Uniform-width vector outlines (same digital-marker stroke throughout)
 *  - Flat shading: NO gradients, NO shadows, NO highlights
 *  - Candy-colored palette on a pure white background
 *  - Hard negative prompting to strip UI elements / text / gradients
 */

// ── Vertex AI config ─────────────────────────────────────────────────────────
// Required env vars:
//   VITE_VERTEX_PROJECT_ID   — GCP project ID
//   VITE_VERTEX_LOCATION     — e.g. "us-central1"
//   VITE_VERTEX_ACCESS_TOKEN — short-lived OAuth2 bearer token (or use a proxy)
//
// Fallback: if Vertex creds are missing we fall back to Gemini Imagen 3 Fast
//           via the generativelanguage endpoint (requires VITE_GEMINI_API_KEY).
const VERTEX_PROJECT  = import.meta.env.VITE_VERTEX_PROJECT_ID  ?? "";
const VERTEX_LOCATION = import.meta.env.VITE_VERTEX_LOCATION    ?? "us-central1";
const VERTEX_TOKEN    = import.meta.env.VITE_VERTEX_ACCESS_TOKEN ?? "";
const GEMINI_KEY      = import.meta.env.VITE_GEMINI_API_KEY      ?? "";

const USE_VERTEX = Boolean(VERTEX_PROJECT && VERTEX_TOKEN);

// Vertex AI – Imagen 3 endpoint
const VERTEX_URL = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/imagen-3.0-generate-002:predict`;

// Fallback – Gemini API – Imagen 3 Fast
const GEMINI_IMG_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:predict?key=${GEMINI_KEY}`;

export interface ScenarioImages {
  backgroundUrl: string | null;
  characterUrl:  string | null;
}

// ── Style constants ──────────────────────────────────────────────────────────

/**
 * POSITIVE style suffix — enforces the Duolingo "DNA":
 * geometric, flat, uniform outlines, candy palette, white bg.
 */
const STYLE_POSITIVE =
  "flat vector illustration, Duolingo art style, " +
  "geometric shapes only (circles squares squircles), " +
  "thick uniform-width black outlines (same stroke weight everywhere like a digital marker), " +
  "solid candy-colored fills only, " +
  "pure white background, " +
  "vibrant saturated colors, " +
  "2D orthographic view, " +
  "playful friendly character design, " +
  "clean simple minimal";

/**
 * NEGATIVE prompt — explicitly excludes UI contamination and bad art styles.
 * Imagen 3 / Vertex respects negativePrompt as a first-class parameter.
 */
const NEGATIVE_PROMPT =
  "UI elements, buttons, progress bars, status bars, navigation bars, " +
  "text overlays, labels, banners, captions, watermarks, logos, " +
  "language toggles, app interface, screenshot, mobile app, " +
  "gradients, drop shadows, inner shadows, highlights, specularity, " +
  "3D rendering, depth of field, bokeh, lens flare, " +
  "crosshatching, sketch lines, pencil strokes, brush bristles, " +
  "wood grain, fabric texture, noise, grain, JPEG artifacts, " +
  "thin lines, jittery lines, inconsistent line weight, " +
  "photorealistic, photograph, painting, watercolor, oil paint, " +
  "anime, manga, chibi, realistic human anatomy, " +
  "complex backgrounds, busy patterns, clutter, " +
  "multiple characters (for character prompt), " +
  "dark background, black background, colored background";

// ── Core fetch helpers ───────────────────────────────────────────────────────

async function generateViaVertex(positivePrompt: string): Promise<string | null> {
  try {
    const body = {
      instances: [{ prompt: positivePrompt }],
      parameters: {
        sampleCount:     1,
        negativePrompt:  NEGATIVE_PROMPT,
        aspectRatio:     "1:1",
        safetyFilterLevel: "block_some",
        personGeneration: "allow_adult",
      },
    };

    const res = await fetch(VERTEX_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${VERTEX_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[ImageService/Vertex] API error:", await res.text());
      return null;
    }

    const data = await res.json();
    const base64 = data.predictions?.[0]?.bytesBase64Encoded;
    return base64 ? `data:image/png;base64,${base64}` : null;
  } catch (err) {
    console.error("[ImageService/Vertex] Failed:", err);
    return null;
  }
}

async function generateViaGemini(positivePrompt: string): Promise<string | null> {
  try {
    // Gemini Imagen endpoint doesn't accept negativePrompt as a separate field,
    // so we prepend a strong negative instruction in the prompt text itself.
    const fullPrompt =
      `${positivePrompt}, ${STYLE_POSITIVE}. ` +
      `AVOID: ${NEGATIVE_PROMPT.split(", ").slice(0, 12).join(", ")}`;

    const res = await fetch(GEMINI_IMG_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances:  [{ prompt: fullPrompt }],
        parameters: { sampleCount: 1 },
      }),
    });

    if (!res.ok) {
      console.error("[ImageService/Gemini] API error:", await res.text());
      return null;
    }

    const data = await res.json();
    const base64 = data.predictions?.[0]?.bytesBase64Encoded;
    return base64 ? `data:image/png;base64,${base64}` : null;
  } catch (err) {
    console.error("[ImageService/Gemini] Failed:", err);
    return null;
  }
}

async function generateImage(positivePrompt: string): Promise<string | null> {
  if (USE_VERTEX) {
    console.log("[ImageService] Using Vertex AI Imagen 3");
    return generateViaVertex(positivePrompt);
  }
  console.log("[ImageService] Using Gemini Imagen 3 Fast (fallback)");
  return generateViaGemini(positivePrompt);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a background scene and a character avatar for a scenario.
 *
 * Separation of layers is enforced via prompt design:
 *  - Background: scene only, explicitly "no people, no characters, no faces"
 *  - Character:  isolated figure on pure white, no background scene elements
 */
export async function generateScenarioImages(
  character: string,
  setting:   string,
  _title:    string,   // reserved for future use
): Promise<ScenarioImages> {

  // ── BACKGROUND prompt ──────────────────────────────────────────────────
  // Strict geometric abstraction of the environment.
  // No characters, no text, no UI — pure scene geometry.
  const backgroundPrompt =
    `${setting} environment, flat vector illustration, Duolingo art style, ` +
    `geometric shapes (rectangles circles squircles), ` +
    `thick uniform black outlines, solid candy-colored fills, ` +
    `pure white background, 2D top-down or front-facing orthographic view, ` +
    `2 to 3 vibrant colors maximum, extremely simple, no characters, no people, ` +
    `no faces, no text, no signs, no UI, no buttons, no labels`;

  // ── CHARACTER prompt ───────────────────────────────────────────────────
  // Bean/squircle body with dot eyes. Fully isolated on white.
  // No scene, no background elements whatsoever.
  const characterPrompt =
    `${character}, Duolingo-style character, ` +
    `bean-shaped or squircle body, large dot eyes, simple curved smile, ` +
    `stubby round limbs, thick uniform black outlines (same stroke weight everywhere), ` +
    `single flat candy-color fill (no shading no gradient), ` +
    `centered on pure white background, isolated figure, ` +
    `full body visible, no accessories, no background scenery, no text`;

  const [backgroundUrl, characterUrl] = await Promise.all([
    generateImage(backgroundPrompt),
    generateImage(characterPrompt),
  ]);

  return { backgroundUrl, characterUrl };
}
