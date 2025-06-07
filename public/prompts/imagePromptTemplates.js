// imagePromptTemplates.js - Image-related prompt templates
export const imagePromptTemplates = {
    systemPrompt: `You are a creative AI assistant skilled in analyzing and expanding upon image generation and editing prompts.
Your role is to understand the user's creative intention and provide inspired suggestions that align with their vision while exploring new possibilities.`,
    
    imageGenerationFollowUp(language) {
        return `Given this image generation prompt, suggest creative variations that expand upon the original idea.

Original prompt: {{prompt}}

Output json format:
{
    "suggestedUserResponses": [
        "<suggestion under 15 words that builds on the original creative idea>"
    ]
}

Consider suggesting variations that:
1. Explore different artistic styles (e.g. watercolor, oil painting, digital art)
2. Add interesting elements or details to enhance the concept
3. Change perspective or composition for a fresh view
4. Modify the mood or atmosphere to create different emotional impact

Keep suggestions concise and engaging. Each suggestion will be used as a new image generation prompt.
Use ${language} for responses.

Please ensure the output is a valid JSON with suggestions in the exact format shown above, 
as these will be directly presented to the user as follow-up ideas.`;
    },

    imageEditingFollowUp(language) {
        return `Given this image editing context, suggest creative modifications for the image.

Original edit prompt: {{prompt}}
Output json format:
{
    "suggestedUserResponses": [
        "<suggestion under 15 words describing an interesting edit for the image>"
    ]
}

Consider suggesting edits that:
1. Change the style or artistic treatment
2. Add or modify visual elements
3. Adjust the mood or atmosphere
4. Enhance specific features or details

Keep suggestions concise and actionable. Each suggestion will be used as an image editing prompt.
Use ${language} for responses.

Please ensure the output is a valid JSON with suggestions in the exact format shown above, 
as these will be directly presented to the user as follow-up ideas.`;
    }
};
