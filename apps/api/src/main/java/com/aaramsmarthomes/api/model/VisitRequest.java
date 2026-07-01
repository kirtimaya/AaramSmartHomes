package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "visit_requests")
public class VisitRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "requester_id", nullable = false)
    private String requesterId;

    @Column(name = "requester_type")
    private String requesterType = "guest";

    @Column(name = "property_id")
    private String propertyId;

    @Column(name = "room_id")
    private String roomId;

    @Column(name = "preferred_date")
    private String preferredDate;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private VisitStatus status = VisitStatus.pending;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public enum VisitStatus { pending, confirmed, cancelled }

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }

    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String v) { this.requesterId = v; }

    public String getRequesterType() { return requesterType; }
    public void setRequesterType(String v) { this.requesterType = v; }

    public String getPropertyId() { return propertyId; }
    public void setPropertyId(String v) { this.propertyId = v; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String v) { this.roomId = v; }

    public String getPreferredDate() { return preferredDate; }
    public void setPreferredDate(String v) { this.preferredDate = v; }

    public String getMessage() { return message; }
    public void setMessage(String v) { this.message = v; }

    public VisitStatus getStatus() { return status; }
    public void setStatus(VisitStatus v) { this.status = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
