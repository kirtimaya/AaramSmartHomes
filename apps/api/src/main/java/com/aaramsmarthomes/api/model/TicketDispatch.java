package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "ticket_dispatches")
public class TicketDispatch {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "ticket_id", nullable = false, unique = true)
    private String ticketId;

    @Column(name = "status", nullable = false)
    private String status = "PENDING_ASSIGNMENT";

    @Column(name = "trade")
    private String trade;

    @Column(name = "professional_id")
    private String professionalId;

    @Column(name = "scheduled_slot")
    private String scheduledSlot;

    @Column(name = "scheduled_at")
    private OffsetDateTime scheduledAt;

    @Column(name = "external_service")
    private String externalService;

    @Column(name = "feedback_received", nullable = false)
    private boolean feedbackReceived = false;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTicketId() { return ticketId; }
    public void setTicketId(String v) { this.ticketId = v; }

    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }

    public String getTrade() { return trade; }
    public void setTrade(String v) { this.trade = v; }

    public String getProfessionalId() { return professionalId; }
    public void setProfessionalId(String v) { this.professionalId = v; }

    public String getScheduledSlot() { return scheduledSlot; }
    public void setScheduledSlot(String v) { this.scheduledSlot = v; }

    public OffsetDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(OffsetDateTime v) { this.scheduledAt = v; }

    public String getExternalService() { return externalService; }
    public void setExternalService(String v) { this.externalService = v; }

    public boolean isFeedbackReceived() { return feedbackReceived; }
    public void setFeedbackReceived(boolean v) { this.feedbackReceived = v; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String v) { this.createdBy = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime v) { this.updatedAt = v; }
}
