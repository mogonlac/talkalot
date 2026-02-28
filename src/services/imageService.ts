/**
 * imageService.ts
 * Generates background and character images using Gemini's image generation API.
 * Style: flat, minimal, Duolingo-esque — colored lines and fills, no gradients.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const IMAGE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;

export interface ScenarioImages {
  backgroundUrl: string | null;
  characterUrl: string | null;
}

const STYLE_SUFFIX =
  "flat vector illustration, Duolingo app style, bold colored outlines, solid color fills, no gradients, no shadows, white background, playful and friendly, minimal detail, corporate clean design";

/**
 * Generates a single image via Imagen 3 and returns a data URL.
 */
async function generateImage(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(IMAGE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: `${prompt}, ${STYLE_SUFFIX}` }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
        },
      }),
    });

    if (!response.ok) {
      console.error("[ImageService] API error:", await response.text());
      return null;
    }

    const data = await response.json();
    const base64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64) return null;

    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error("[ImageService] Failed to generate image:", err);
    return null;
  }
}

/**
 * Generates both background and character images for a scenario in parallel.
 * Returns null values gracefully if generation fails — app continues without images.
 */
export async function generateScenarioImages(
  character: string,
  setting: string,
  title: string
): Promise<ScenarioImages> {
  const backgroundPrompt = `Scene background: ${setting} from "${title}", wide establishing shot, no characters, no text`;
  const characterPrompt = `Character portrait: ${character} from "${title}", centered, full body, simple background, expressive face`;

  const [backgroundUrl, characterUrl] = await Promise.all([
    generateImage(backgroundPrompt),
    generateImage(characterPrompt),
  ]);

  return { backgroundUrl, characterUrl };
}
