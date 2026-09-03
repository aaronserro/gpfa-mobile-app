import type { LibraryResource, ResourceType } from '../api/types';

export const ALL_RESOURCE_TYPES = 'all' as const;
export type ResourceTypeFilter = typeof ALL_RESOURCE_TYPES | ResourceType;

export function resourceTypeCounts(resources: LibraryResource[]): Map<ResourceType, number> {
  const counts = new Map<ResourceType, number>();
  for (const resource of resources) {
    counts.set(resource.type, (counts.get(resource.type) ?? 0) + 1);
  }
  return counts;
}

export function filterLibraryResources(
  resources: LibraryResource[],
  query: string,
  type: ResourceTypeFilter
): LibraryResource[] {
  const normalizedQuery = query.trim().toLowerCase();
  return resources.filter((resource) => {
    if (type !== ALL_RESOURCE_TYPES && resource.type !== type) return false;
    if (!normalizedQuery) return true;
    return [resource.title, resource.summary, resource.type, resource.authors, ...resource.tags]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function relatedResources(
  resources: LibraryResource[],
  current: LibraryResource,
  limit = 3
): LibraryResource[] {
  const tags = new Set(current.tags.map((tag) => tag.toLowerCase()));
  return resources
    .map((resource, index) => ({
      resource,
      index,
      shared: resource.tags.filter((tag) => tags.has(tag.toLowerCase())).length,
    }))
    .filter(({ resource }) => resource.id !== current.id)
    .sort((left, right) => {
      if (left.shared !== right.shared) return right.shared - left.shared;
      if (left.resource.mins !== undefined && right.resource.mins !== undefined) {
        return left.resource.mins - right.resource.mins || left.index - right.index;
      }
      return left.index - right.index;
    })
    .slice(0, Math.max(0, limit))
    .map(({ resource }) => resource);
}

export function externalResourceUrl(resource: LibraryResource): string | null {
  if (resource.artifact.kind !== 'external') return null;
  try {
    const url = new URL(resource.artifact.href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
