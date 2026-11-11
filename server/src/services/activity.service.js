import { ActivityLog } from '../models/index.js';

/**
 * Every admin write is logged with who did it, what changed (before/after) and from where
 * (CLAUDE.md non-negotiable 4). Failures to log are reported, never silently ignored.
 */
export async function logActivity({
  actor,
  action,
  entity,
  entityId = null,
  before = null,
  after = null,
  ip = null,
}) {
  await ActivityLog.create({
    actor: actor?._id ?? null,
    actorEmail: actor?.email ?? null,
    action,
    entity,
    entityId: entityId ? String(entityId) : null,
    before,
    after,
    ip,
  });
}

/** Convenience: pulls actor and IP from the request. */
export const logFromRequest = (req, data) => logActivity({ actor: req.user, ip: req.ip, ...data });

/** Plain-object snapshot of a Mongoose document for before/after diffs (drops internal noise). */
export function snapshot(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete obj.__v;
  delete obj.updatedAt;
  return JSON.parse(JSON.stringify(obj));
}
