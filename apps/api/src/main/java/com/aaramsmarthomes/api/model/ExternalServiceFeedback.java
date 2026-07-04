package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.LocalDate;

/**
 * Anonymous by design — never add a ticket id, user id, phone number, or
 * exact location field here. See FeedbackAnonymizationService, the only
 * writer of this entity.
 */
@Entity
@Table(name = "external_service_feedback")
public class ExternalServiceFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "service_used", nullable = false)
    private String serviceUsed;

    @Column(name = "cost_score", nullable = false)
    private int costScore;

    @Column(name = "speed_score", nullable = false)
    private int speedScore;

    @Column(name = "consent", nullable = false)
    private boolean consent;

    @Column(name = "property_id")
    private String propertyId;

    @Column(name = "region")
    private String region;

    @Column(name = "ticket_category")
    private String ticketCategory;

    @Column(name = "created_month", insertable = false, updatable = false)
    private LocalDate createdMonth;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getServiceUsed() { return serviceUsed; }
    public void setServiceUsed(String v) { this.serviceUsed = v; }

    public int getCostScore() { return costScore; }
    public void setCostScore(int v) { this.costScore = v; }

    public int getSpeedScore() { return speedScore; }
    public void setSpeedScore(int v) { this.speedScore = v; }

    public boolean isConsent() { return consent; }
    public void setConsent(boolean v) { this.consent = v; }

    public String getPropertyId() { return propertyId; }
    public void setPropertyId(String v) { this.propertyId = v; }

    public String getRegion() { return region; }
    public void setRegion(String v) { this.region = v; }

    public String getTicketCategory() { return ticketCategory; }
    public void setTicketCategory(String v) { this.ticketCategory = v; }

    public LocalDate getCreatedMonth() { return createdMonth; }
}
