package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "wa_conversations")
public class WaConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "phone_e164", nullable = false)
    private String phoneE164;

    @Column(name = "actor_type", nullable = false)
    private String actorType;

    @Column(name = "actor_id")
    private String actorId;

    @Column(name = "flow", nullable = false)
    private String flow;

    @Column(name = "state", nullable = false)
    private String state;

    // Raw JSON text, managed explicitly via ObjectMapper in service code —
    // this Java type + SqlTypes.JSON pairing is Hibernate's documented
    // pass-through mode: the String is bound as-is (no double-encoding).
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "context", nullable = false, columnDefinition = "jsonb")
    private String context = "{}";

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    // No DB trigger refreshes this on UPDATE (none exists in this schema) —
    // callers must set it explicitly whenever they mutate the conversation.
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPhoneE164() { return phoneE164; }
    public void setPhoneE164(String v) { this.phoneE164 = v; }

    public String getActorType() { return actorType; }
    public void setActorType(String v) { this.actorType = v; }

    public String getActorId() { return actorId; }
    public void setActorId(String v) { this.actorId = v; }

    public String getFlow() { return flow; }
    public void setFlow(String v) { this.flow = v; }

    public String getState() { return state; }
    public void setState(String v) { this.state = v; }

    public String getContext() { return context; }
    public void setContext(String v) { this.context = v; }

    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active = v; }

    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime v) { this.expiresAt = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime v) { this.updatedAt = v; }
}
