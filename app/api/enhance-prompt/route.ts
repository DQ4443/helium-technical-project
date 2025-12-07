import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const maxDuration = 30;

const ENHANCE_PROMPT_SYSTEM = `You are a technical prompt enhancer. Your job is to take a user's simple, non-technical description of a React component and transform it into a more detailed, technical prompt that will help an AI create a better component.

Guidelines:
1. Keep the core intent of the original prompt
2. Add specific technical details like:
   - UI elements (buttons, inputs, cards, etc.)
   - Styling suggestions (colors, spacing, typography)
   - Interactive features (hover states, animations, transitions)
   - Layout patterns (flexbox, grid, responsive design)
   - Accessibility considerations
3. Mention modern React patterns when appropriate
4. Suggest Tailwind CSS classes that would work well
5. Keep the enhanced prompt concise but specific (2-3 sentences max)
6. Don't add features the user didn't imply they wanted

Examples:
- Input: "make a button"
  Output: "Create a modern button component with rounded corners, a blue background color that darkens on hover, smooth transitions, and clear text that's easily readable. Include proper padding and a subtle shadow for depth."

- Input: "I want something to show user info"
  Output: "Build a user profile card component with a circular avatar image, the user's name in bold text, their role/title below, and a brief bio section. Add a subtle border, rounded corners, and hover effect that slightly elevates the card."

- Input: "need a form for logging in"
  Output: "Create a login form with email and password input fields featuring clean labels, proper validation states, a prominent submit button, and a 'Forgot password?' link. Include focus states and error message styling."

Return ONLY the enhanced prompt, nothing else.`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: ENHANCE_PROMPT_SYSTEM,
      prompt: prompt,
    });

    return Response.json({ enhancedPrompt: result.text.trim() });
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    return Response.json(
      { error: 'Failed to enhance prompt', enhancedPrompt: null },
      { status: 500 }
    );
  }
}
