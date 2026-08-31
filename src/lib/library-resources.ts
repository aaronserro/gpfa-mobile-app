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

export function formatBytes(value: number | undefined): string | null {
  if (value === undefined || !Number.isFinite(value) || value < 0) return null;
  if (value < 1024) return `${value} B`;

  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = size >= 10 ? 0 : 1;
  return `${size.toFixed(precision).replace(/\.0$/, '')} ${units[unitIndex]}`;
}

export function resourceFileFormat(resource: LibraryResource): string | null {
  if (resource.artifact.kind !== 'file') return null;
  const extension = resource.artifact.fileName?.match(/\.([a-z0-9]+)$/i)?.[1];
  if (extension) return extension.toUpperCase();
  const subtype = resource.artifact.contentType?.split('/')[1];
  return subtype ? subtype.toUpperCase() : 'File';
}

export function resourceFileFacts(resource: LibraryResource): string | null {
  if (resource.artifact.kind !== 'file') return null;
  return [resourceFileFormat(resource), formatBytes(resource.artifact.byteSize)]
    .filter(Boolean)
    .join(' · ');
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
