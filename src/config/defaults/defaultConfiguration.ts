import { ConfigurationKeys } from '../configurationKeys';
import { ModelSettings } from '../../models/ai/aiModels';

export const DEFAULT_MODEL_ID = 'openai/gpt-4o';
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 1024;
export const DEFAULT_LOG_LEVEL = 'info';
export const DEFAULT_ENABLE_TELEMETRY = true;
export const DEFAULT_API_ENDPOINT = 'https://openrouter.ai/api/v1';
export const DEFAULT_REQUIRE_CONFIRMATION = true;
export const DEFAULT_AUTO_SAVE_DELAY = 1000;
export const DEFAULT_SHOW_WELCOME_ON_STARTUP = true;
export const DEFAULT_FREQUENCY_PENALTY = 0;
export const DEFAULT_PRESENCE_PENALTY = 0;
export const DEFAULT_TOP_P = 1;

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
    modelId: DEFAULT_MODEL_ID,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
    frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
    presencePenalty: DEFAULT_PRESENCE_PENALTY,
    topP: DEFAULT_TOP_P
};

export const DefaultConfiguration = {
    [ConfigurationKeys.MODEL_ID]: DEFAULT_MODEL_ID,
    [ConfigurationKeys.TEMPERATURE]: DEFAULT_TEMPERATURE,
    [ConfigurationKeys.MAX_TOKENS]: DEFAULT_MAX_TOKENS,
    [ConfigurationKeys.LOG_LEVEL]: DEFAULT_LOG_LEVEL,
    [ConfigurationKeys.ENABLE_TELEMETRY]: DEFAULT_ENABLE_TELEMETRY,
    [ConfigurationKeys.REQUIRE_CONFIRMATION]: DEFAULT_REQUIRE_CONFIRMATION
}; 