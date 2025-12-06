import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(req: Request) {
  try {
    const { texts }: { texts: Record<string, string> } = await req.json();

    // texts is an object like { "button.submit": "Submit", "button.cancel": "Cancel" }
    const keys = Object.keys(texts);

    if (keys.length === 0) {
      return Response.json({ translations: {} });
    }

    const prompt = `Translate the following English UI text strings to Spanish (es), French (fr), German (de), Japanese (ja), and Chinese Simplified (zh).

Return ONLY a valid JSON object with this exact structure, no markdown or explanation:
{
  "key.name": {
    "es": "Spanish translation",
    "fr": "French translation",
    "de": "German translation",
    "ja": "Japanese translation",
    "zh": "Chinese translation"
  }
}

Text strings to translate:
${JSON.stringify(texts, null, 2)}`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    });

    // Parse the JSON response
    let translations: Record<string, Record<string, string>> = {};
    try {
      // Remove any markdown code blocks if present
      let jsonText = result.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      translations = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse translation response:', result.text);
      // Return empty translations on parse error
      return Response.json({ translations: {} });
    }

    return Response.json({ translations });
  } catch (error) {
    console.error('Translation error:', error);
    return Response.json({ error: 'Translation failed' }, { status: 500 });
  }
}
