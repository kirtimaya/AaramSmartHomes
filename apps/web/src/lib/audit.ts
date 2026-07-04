import { supabaseAdmin } from './supabaseAdmin';

export type AuditActorRole = 'admin' | 'tenant' | 'guest' | 'system';
export type AuditSource = 'web' | 'mobile' | 'aara' | 'whatsapp' | 'alexa' | 'system';

export type AuditEntry = {
  actorId?: string | null;
  actorEmail: string;
  actorRole: AuditActorRole;
  action: string;        // dot-namespaced, e.g. 'tenant.add', 'bill.upload'
  entityType: string;    // 'tenant' | 'bill' | 'room' | 'admin' | ...
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  source?: AuditSource;  // defaults to 'web'
};

/**
 * Fire-and-forget audit_log insert via the service-role client (bypasses RLS —
 * audit_log has no client INSERT policy by design). Never throws: a failed
 * audit write must not fail the mutation it's describing. Errors are logged
 * so a broken SUPABASE_SERVICE_ROLE_KEY doesn't silently produce an empty
 * audit trail.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('audit_log').insert({
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail,
      actor_role: entry.actorRole,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      source: entry.source ?? 'web',
    });
    if (error) console.error('[audit] insert failed:', error.message);
  } catch (e) {
    console.error('[audit] insert threw:', e);
  }
}
