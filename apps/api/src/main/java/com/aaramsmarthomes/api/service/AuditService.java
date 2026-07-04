package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.model.AuditLog;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

/**
 * Records one audit_log row per admin mutation / Aara-executed action.
 * repository.save() joins the caller's transaction via Spring Data JPA's
 * default REQUIRED propagation (same reasoning as OutboxService) — an audit
 * row is only ever committed alongside the business change that produced it.
 */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * @param action      dot-namespaced, e.g. "menu.upsert", "ticket.resolve"
     * @param entityType  "menu" | "ticket" | "room" | "dish" | "pantry_item" | "bill" | "tenant" | ...
     * @param before      pre-mutation snapshot, or null for creates
     * @param after       post-mutation snapshot, or null for deletes
     * @param source      "web" | "mobile" | "aara" | "whatsapp" | "alexa" | "system"
     */
    public void record(UserPrincipal actor, String action, String entityType, String entityId,
                        Object before, Object after, String source) {
        try {
            AuditLog log = new AuditLog();
            log.setActorId(actor.userId());
            log.setActorEmail(actor.email());
            log.setActorRole(actor.role().name().toLowerCase());
            log.setAction(action);
            log.setEntityType(entityType);
            log.setEntityId(entityId);
            log.setBefore(before != null ? objectMapper.writeValueAsString(before) : null);
            log.setAfter(after != null ? objectMapper.writeValueAsString(after) : null);
            log.setSource(source);
            auditLogRepository.save(log);
        } catch (Exception e) {
            throw new RuntimeException("Failed to record audit log for action " + action, e);
        }
    }
}
