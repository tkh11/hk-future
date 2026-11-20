import type { Payload } from 'payload';

/**
 * Users may read only their own account. A lock needs its owner's ID, not an
 * expanded user document: expansion would be filtered to null by that rule,
 * suppressing Payload's concurrent-editor warning. Keep account access intact.
 * Config-only initialization; no database field or dependency code is changed.
 */
export function configurePrivateLockOwners(payload: Payload) {
  const fields = payload.collections['payload-locked-documents']?.config.fields;
  const owner = fields?.find(field => 'name' in field && field.name === 'user');
  if (!owner || owner.type !== 'relationship') throw new Error('Payload lock owner configuration changed. Review concurrent editing before starting CMS.');
  owner.maxDepth = 0;
}
