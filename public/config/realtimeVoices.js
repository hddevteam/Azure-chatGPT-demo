/**
 * Realtime API Voice Options Configuration
 * Supported voices for GPT Realtime models (8 voices total)
 * Reference: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/realtime-audio-quickstart
 */

export const REALTIME_VOICES = [
    {
        value: "alloy",
        label: "Alloy",
        description: "Neutral, balanced voice",
        isNew: false
    },
    {
        value: "ash",
        label: "Ash",
        description: "Calm, professional voice",
        isNew: true
    },
    {
        value: "ballad",
        label: "Ballad",
        description: "Elegant, narrative voice",
        isNew: true
    },
    {
        value: "coral",
        label: "Coral",
        description: "Gentle, warm voice",
        isNew: true
    },
    {
        value: "echo",
        label: "Echo",
        description: "Warm, friendly voice",
        isNew: false
    },
    {
        value: "sage",
        label: "Sage",
        description: "Wise, mature voice",
        isNew: true
    },
    {
        value: "shimmer",
        label: "Shimmer",
        description: "Bright, lively voice",
        isNew: false
    },
    {
        value: "verse",
        label: "Verse",
        description: "Expressive voice",
        isNew: true
    }
];

export const DEFAULT_VOICE = "alloy";

/**
 * Get voice option by value
 * @param {string} value - Voice value
 * @returns {object|null} Voice option or null if not found
 */
export function getVoiceByValue(value) {
    return REALTIME_VOICES.find(voice => voice.value === value) || null;
}

/**
 * Get voice label by value
 * @param {string} value - Voice value
 * @returns {string} Voice label or the value itself
 */
export function getVoiceLabel(value) {
    const voice = getVoiceByValue(value);
    return voice ? voice.label : value;
}
