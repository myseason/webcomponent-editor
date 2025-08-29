/**
 * figmaV4/project/dataSources.ts
 * Data source definitions and simple test-call helpers (to be run in app runtime).
 */
import type { DataSourceRef } from '../core/types';

export type RestConfig = {
  baseUrl: string;
  headers?: Record<string,string>;
};

export type GraphQLConfig = {
  endpoint: string;
  headers?: Record<string,string>;
};

export function createRestSource(id: string, name: string, baseUrl: string, headers?: Record<string,string>): DataSourceRef {
  const cfg: RestConfig = { baseUrl, headers };
  return { id, type: 'rest', name, config: cfg as any };
}

export function createGraphQLSource(id: string, name: string, endpoint: string, headers?: Record<string,string>): DataSourceRef {
  const cfg: GraphQLConfig = { endpoint, headers };
  return { id, type: 'graphql', name, config: cfg as any };
}
