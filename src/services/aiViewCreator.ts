import type {
  ActivityView,
  FilterGroup,
  SortCondition,
  ActivityViewLayout,
  KanbanGroupBy,
} from '../domain/types';
import { generateViewId } from '../features/activities/viewTemplates';
import { getEnvVar } from '../utils/getEnv';

const AI_PROXY_BASE_URL = getEnvVar('AI_PROXY_URL') || getEnvVar('EXPO_PUBLIC_AI_PROXY_URL');
const OPENAI_COMPLETIONS_URL = AI_PROXY_BASE_URL
  ? `${AI_PROXY_BASE_URL}/v1/chat/completions`
  : 'https://kwilt.invalid/v1/chat/completions';

const VIEW_CREATION_TIMEOUT_MS = 15000;
const LOG_PREFIX = '[aiViewCreator]';

/**
 * System prompt for AI view creation.
 */
const VIEW_CREATION_SYSTEM_PROMPT = `You are a helpful assistant that creates custom activity views for a personal productivity app.

Users describe what they want to see in natural language, and you translate that into a structured view configuration.

## Available Options

### Layout Types
- "list": Vertical scrolling list (default)
- "kanban": Horizontal board with columns

### Kanban Grouping (when layout is "kanban")
- "status": By status (To Do, In Progress, Done)
- "goal": By linked goal
- "priority": By priority level
- "phase": By planning phase

### Filter Fields
- "status": "todo" | "in_progress" | "completed"
- "priority": 1 (high) | 2 (medium) | 3 (low)
- "scheduledDate": Due date (use "today", "+7days", "+30days" for relative)
- "tags": Activity tags (array)
- "goalId": Linked goal ID

### Filter Operators
- "eq": Equals
- "neq": Not equals
- "gt": Greater than
- "gte": Greater than or equal
- "lt": Less than
- "lte": Less than or equal

### Sort Fields
- "priority", "scheduledDate", "title", "createdAt", "difficulty", "estimateMinutes"

### Sort Directions
- "asc": Ascending
- "desc": Descending

## Response Format

Respond with ONLY a valid JSON object (no markdown code blocks):

{
  "name": "Short descriptive name",
  "layout": "list" | "kanban",
  "kanbanGroupBy": "status" | "goal" | "priority" | "phase",
  "filters": [{ "logic": "and", "conditions": [{ "id": "c1", "field": "...", "operator": "...", "value": ... }] }],
  "sorts": [{ "field": "...", "direction": "asc" | "desc" }],
  "showCompleted": false
}

Keep it simple. Default to list layout. Hide completed unless asked. Generate concise names.`;

/**
 * Raw response from the AI
 */
type AiViewConfigResponse = {
  name: string;
  layout?: ActivityViewLayout;
  kanbanGroupBy?: KanbanGroupBy;
  filters?: FilterGroup[];
  sorts?: SortCondition[];
  showCompleted?: boolean;
};

/**
 * Parse AI response JSON, handling potential markdown code blocks
 */
function parseAiResponse(text: string): AiViewConfigResponse | null {
  // Try direct JSON parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Fall through
      }
    }
    
    // Try finding JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Fall through
      }
    }
  }
  return null;
}

/**
 * Validate and sanitize the AI response into a proper ActivityView
 */
function sanitizeViewConfig(raw: AiViewConfigResponse): Partial<ActivityView> {
  const validLayouts: ActivityViewLayout[] = ['list', 'kanban'];
  const validKanbanGroupBy: KanbanGroupBy[] = ['status', 'goal', 'priority', 'phase'];

  const layout: ActivityViewLayout = validLayouts.includes(raw.layout as ActivityViewLayout)
    ? (raw.layout as ActivityViewLayout)
    : 'list';

  const kanbanGroupBy: KanbanGroupBy | undefined =
    layout === 'kanban' && validKanbanGroupBy.includes(raw.kanbanGroupBy as KanbanGroupBy)
      ? (raw.kanbanGroupBy as KanbanGroupBy)
      : layout === 'kanban'
        ? 'status'
        : undefined;

  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Custom View',
    layout,
    kanbanGroupBy,
    filters: Array.isArray(raw.filters) ? raw.filters : undefined,
    sorts: Array.isArray(raw.sorts) ? raw.sorts : undefined,
    showCompleted: typeof raw.showCompleted === 'boolean' ? raw.showCompleted : false,
  };
}

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resolve the API key from environment or app store
 */
function resolveApiKey(): string | null {
  // Try environment variable first
  const envKey = getEnvVar('OPENAI_API_KEY') || getEnvVar('EXPO_PUBLIC_OPENAI_API_KEY');
  if (envKey) return envKey;
  
  // Try to get from app store (lazy import to avoid circular deps)
  try {
    const { useAppStore } = require('../store/useAppStore');
    const storeKey = useAppStore.getState().devOpenAiApiKey;
    if (storeKey) return storeKey;
  } catch {
    // Store not available
  }
  
  return null;
}

export type CreateViewFromPromptResult = {
  success: true;
  view: ActivityView;
} | {
  success: false;
  error: string;
};

/**
 * Create an activity view from a natural language prompt using AI.
 *
 * @param prompt - Natural language description of the desired view
 * @returns Promise resolving to the created view or an error
 */
export async function createViewFromPrompt(
  prompt: string,
): Promise<CreateViewFromPromptResult> {
  const apiKey = resolveApiKey();
  
  if (!apiKey) {
    console.warn(`${LOG_PREFIX} No API key available`);
    return {
      success: false,
      error: 'AI features require an API key. Please configure one in settings.',
    };
  }

  try {
    const response = await fetchWithTimeout(
      OPENAI_COMPLETIONS_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: VIEW_CREATION_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3, // Lower temperature for more consistent outputs
          max_tokens: 500,
        }),
      },
      VIEW_CREATION_TIMEOUT_MS,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${LOG_PREFIX} API error:`, response.status, errorText);
      return {
        success: false,
        error: response.status === 429
          ? 'AI rate limit reached. Please try again in a moment.'
          : 'Failed to create view. Please try again.',
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error(`${LOG_PREFIX} Empty response from AI`);
      return {
        success: false,
        error: 'AI returned an empty response. Please try a different description.',
      };
    }

    const parsed = parseAiResponse(content);
    
    if (!parsed) {
      console.error(`${LOG_PREFIX} Failed to parse AI response:`, content);
      return {
        success: false,
        error: 'Could not understand AI response. Please try rephrasing.',
      };
    }

    const sanitized = sanitizeViewConfig(parsed);
    
    const view: ActivityView = {
      id: generateViewId(),
      name: sanitized.name || 'Custom View',
      layout: sanitized.layout,
      kanbanGroupBy: sanitized.kanbanGroupBy,
      filterMode: 'all', // Legacy field
      sortMode: 'manual', // Legacy field
      filters: sanitized.filters,
      sorts: sanitized.sorts,
      showCompleted: sanitized.showCompleted,
      isSystem: false,
    };

    if (__DEV__) {
      console.log(`${LOG_PREFIX} Created view from prompt:`, {
        prompt,
        view,
      });
    }

    return { success: true, view };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    if (message.includes('aborted')) {
      return {
        success: false,
        error: 'Request timed out. Please try again.',
      };
    }

    console.error(`${LOG_PREFIX} Error creating view:`, error);
    return {
      success: false,
      error: 'Something went wrong. Please try again.',
    };
  }
}

