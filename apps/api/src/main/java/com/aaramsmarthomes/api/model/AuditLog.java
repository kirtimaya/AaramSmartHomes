package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "actor_id")
    private String actorId;

    @Column(name = "actor_email", nullable = false)
    private String actorEmail;

    @Column(name = "actor_role", nullable = false)
    private String actorRole;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id")
    private String entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before", columnDefinition = "jsonb")
    private String before;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after", columnDefinition = "jsonb")
    private String after;

    @Column(name = "source", nullable = false)
    private String source;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }

    public String getActorId() { return actorId; }
    public void setActorId(String v) { this.actorId = v; }

    public String getActorEmail() { return actorEmail; }
    public void setActorEmail(String v) { this.actorEmail = v; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String v) { this.actorRole = v; }

    public String getAction() { return action; }
    public void setAction(String v) { this.action = v; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String v) { this.entityType = v; }

    public String getEntityId() { return entityId; }
    public void setEntityId(String v) { this.entityId = v; }

    public String getBefore() { return before; }
    public void setBefore(String v) { this.before = v; }

    public String getAfter() { return after; }
    public void setAfter(String v) { this.after = v; }

    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
