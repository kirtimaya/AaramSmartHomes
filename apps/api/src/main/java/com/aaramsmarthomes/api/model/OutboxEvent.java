package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "outbox_events")
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "aggregate_type")
    private String aggregateType;

    @Column(name = "aggregate_id")
    private String aggregateId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(name = "status", nullable = false)
    private String status = "PENDING";

    @Column(name = "attempts", nullable = false)
    private int attempts = 0;

    @Column(name = "next_attempt_at")
    private OffsetDateTime nextAttemptAt;

    @Column(name = "locked_until")
    private OffsetDateTime lockedUntil;

    @Column(name = "locked_by")
    private String lockedBy;

    @Column(name = "last_error")
    private String lastError;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "processed_at")
    private OffsetDateTime processedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEventType() { return eventType; }
    public void setEventType(String v) { this.eventType = v; }

    public String getAggregateType() { return aggregateType; }
    public void setAggregateType(String v) { this.aggregateType = v; }

    public String getAggregateId() { return aggregateId; }
    public void setAggregateId(String v) { this.aggregateId = v; }

    public String getPayload() { return payload; }
    public void setPayload(String v) { this.payload = v; }

    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }

    public int getAttempts() { return attempts; }
    public void setAttempts(int v) { this.attempts = v; }

    public OffsetDateTime getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(OffsetDateTime v) { this.nextAttemptAt = v; }

    public OffsetDateTime getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(OffsetDateTime v) { this.lockedUntil = v; }

    public String getLockedBy() { return lockedBy; }
    public void setLockedBy(String v) { this.lockedBy = v; }

    public String getLastError() { return lastError; }
    public void setLastError(String v) { this.lastError = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }

    public OffsetDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(OffsetDateTime v) { this.processedAt = v; }
}
