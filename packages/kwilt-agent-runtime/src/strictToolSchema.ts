type JsonSchema = Record<string, unknown>;

const SUPPORTED_SCHEMA_KEYWORDS = new Set([
  'type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const',
  'description', 'title', 'format', 'pattern',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'minLength', 'maxLength', 'minItems', 'maxItems', 'uniqueItems',
  'minProperties', 'maxProperties',
]);

const SUPPORTED_TYPES = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']);

function isRecord(value: unknown): value is JsonSchema {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function schemaTypes(schema: JsonSchema, path: string): string[] {
  const rawType = schema.type;
  const types = typeof rawType === 'string'
    ? [rawType]
    : Array.isArray(rawType) && rawType.every((value) => typeof value === 'string')
      ? [...rawType]
      : null;
  if (!types || types.length === 0 || types.some((type) => !SUPPORTED_TYPES.has(type))) {
    throw new Error(`Strict tool schema requires an explicit supported type at ${path}`);
  }
  if (new Set(types).size !== types.length) {
    throw new Error(`Strict tool schema has duplicate types at ${path}`);
  }
  return types;
}

function assertSupportedKeywords(schema: JsonSchema, path: string): void {
  for (const keyword of Object.keys(schema)) {
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(keyword)) {
      throw new Error(`Unsupported JSON Schema keyword at ${path}: ${keyword}`);
    }
  }
}

function cloneJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item)]));
  }
  return value;
}

function addWireNull(schema: JsonSchema): JsonSchema {
  const type = schema.type;
  const types = Array.isArray(type) ? [...type] : [type];
  if (!types.includes('null')) types.push('null');
  const result: JsonSchema = { ...schema, type: types };
  if (Array.isArray(result.enum) && !result.enum.includes(null)) {
    result.enum = [...result.enum, null];
  }
  return result;
}

function convertSchema(schema: JsonSchema, path: string, wireOptional: boolean): JsonSchema {
  assertSupportedKeywords(schema, path);
  const types = schemaTypes(schema, path);
  let converted: JsonSchema = Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => !['properties', 'required', 'additionalProperties', 'items'].includes(key))
      .map(([key, value]) => [key, cloneJsonValue(value)]),
  );

  if (types.includes('object')) {
    if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
      throw new Error(`Strict tool schema cannot preserve additionalProperties at ${path}`);
    }
    if (!isRecord(schema.properties)) {
      throw new Error(`Strict tool object requires properties at ${path}`);
    }
    const propertyEntries = Object.entries(schema.properties);
    const semanticRequired = schema.required === undefined
      ? []
      : Array.isArray(schema.required) && schema.required.every((value) => typeof value === 'string')
        ? schema.required
        : null;
    if (!semanticRequired) throw new Error(`Strict tool object has invalid required list at ${path}`);
    const propertyNames = new Set(propertyEntries.map(([name]) => name));
    if (new Set(semanticRequired).size !== semanticRequired.length
      || semanticRequired.some((name) => !propertyNames.has(name))) {
      throw new Error(`Strict tool object has invalid required property at ${path}`);
    }
    converted = {
      ...converted,
      properties: Object.fromEntries(propertyEntries.map(([name, propertySchema]) => {
        if (!isRecord(propertySchema)) {
          throw new Error(`Strict tool property requires a schema at ${path}.properties.${name}`);
        }
        return [
          name,
          convertSchema(propertySchema, `${path}.properties.${name}`, !semanticRequired.includes(name)),
        ];
      })),
      required: propertyEntries.map(([name]) => name),
      additionalProperties: false,
    };
  } else if (schema.properties !== undefined || schema.required !== undefined
    || schema.additionalProperties !== undefined) {
    throw new Error(`Non-object strict tool schema has object keywords at ${path}`);
  }

  if (types.includes('array')) {
    if (!isRecord(schema.items)) throw new Error(`Strict tool array requires one item schema at ${path}`);
    converted.items = convertSchema(schema.items, `${path}.items`, false);
  } else if (schema.items !== undefined) {
    throw new Error(`Non-array strict tool schema has items at ${path}`);
  }

  return wireOptional && !types.includes('null') ? addWireNull(converted) : converted;
}

/** Derive an OpenAI strict-mode wire schema without weakening the semantic contract. */
export function toStrictToolInputSchema(schema: JsonSchema): JsonSchema {
  if (!isRecord(schema)) throw new Error('Strict tool input schema must be an object schema');
  const types = schemaTypes(schema, '$');
  if (!types.includes('object') || types.includes('null')) {
    throw new Error('Strict tool input schema root must be a non-null object');
  }
  return convertSchema(schema, '$', false);
}

function acceptsAuthoredNull(schema: JsonSchema, path: string): boolean {
  return schemaTypes(schema, path).includes('null');
}

function normalizeValue(schema: JsonSchema, value: unknown, path: string): unknown {
  if (value === null) return null;
  const types = schemaTypes(schema, path);
  if (types.includes('object') && isRecord(value) && isRecord(schema.properties)) {
    const semanticRequired = Array.isArray(schema.required)
      ? new Set(schema.required.filter((item): item is string => typeof item === 'string'))
      : new Set<string>();
    const properties = schema.properties;
    return Object.fromEntries(Object.entries(value).flatMap(([name, propertyValue]) => {
      const propertySchema = properties[name];
      if (!isRecord(propertySchema)) return [[name, cloneJsonValue(propertyValue)]];
      const isWireNull = propertyValue === null
        && !semanticRequired.has(name)
        && !acceptsAuthoredNull(propertySchema, `${path}.properties.${name}`);
      return isWireNull
        ? []
        : [[name, normalizeValue(propertySchema, propertyValue, `${path}.properties.${name}`)]];
    }));
  }
  if (types.includes('array') && Array.isArray(value) && isRecord(schema.items)) {
    return value.map((item, index) => normalizeValue(schema.items as JsonSchema, item, `${path}.items[${index}]`));
  }
  return cloneJsonValue(value);
}

/** Restore strict wire arguments to the original semantic optional-field shape. */
export function normalizeStrictToolArguments(schema: JsonSchema, args: unknown): unknown {
  toStrictToolInputSchema(schema);
  return normalizeValue(schema, args, '$');
}
