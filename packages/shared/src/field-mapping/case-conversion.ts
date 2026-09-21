/**
 * Converts camelCase string to snake_case
 * Examples: firstName -> first_name, dateOfBirth -> date_of_birth
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Converts snake_case string to camelCase
 * Examples: first_name -> firstName, date_of_birth -> dateOfBirth
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts all keys in an object from camelCase to snake_case (for database)
 * Preserves nested objects and arrays
 */
export function keysToSnakeCase<T extends Record<string, any>>(
  obj: T,
): Record<string, any> {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnakeCase(item));
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      result[snakeKey] = keysToSnakeCase(value);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item =>
        item && typeof item === 'object' ? keysToSnakeCase(item) : item,
      );
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
}

/**
 * Converts all keys in an object from snake_case to camelCase (from database)
 * Preserves nested objects and arrays
 */
export function keysToCamelCase<T extends Record<string, any>>(
  obj: T,
): Record<string, any> {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamelCase(item));
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      result[camelKey] = keysToCamelCase(value);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item =>
        item && typeof item === 'object' ? keysToCamelCase(item) : item,
      );
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

/** Alias: converts a database row (snake_case) to entity format (camelCase) */
export function rowToEntity<TRow extends Record<string, any>>(
  row: TRow,
): Record<string, any> {
  return keysToCamelCase(row);
}

/** Alias: converts an entity (camelCase) to database row format (snake_case) */
export function entityToRow<TEntity extends Record<string, any>>(
  entity: TEntity,
): Record<string, any> {
  return keysToSnakeCase(entity);
}

/** Converts an array of database rows to entities */
export function rowsToEntities<TRow extends Record<string, any>>(
  rows: TRow[],
): Record<string, any>[] {
  return rows.map(row => rowToEntity(row));
}

/** Converts an array of entities to database rows */
export function entitiesToRows<TEntity extends Record<string, any>>(
  entities: TEntity[],
): Record<string, any>[] {
  return entities.map(entity => entityToRow(entity));
}
