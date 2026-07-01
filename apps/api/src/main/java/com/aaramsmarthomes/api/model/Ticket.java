package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "tickets")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "requester_id", nullable = false)
    private String requesterId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category")
    private String category;

    @Column(name = "priority")
    @Enumerated(EnumType.STRING)
    private TicketPriority priority = TicketPriority.medium;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private TicketStatus status = TicketStatus.pending;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public enum TicketStatus  { pending, in_progress, resolved }
    public enum TicketPriority { low, medium, high }

    // Getters & setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String v) { this.requesterId = v; }

    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }

    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }

    public String getCategory() { return category; }
    public void setCategory(String v) { this.category = v; }

    public TicketPriority getPriority() { return priority; }
    public void setPriority(TicketPriority v) { this.priority = v; }

    public TicketStatus getStatus() { return status; }
    public void setStatus(TicketStatus v) { this.status = v; }

    public String getAdminNote() { return adminNote; }
    public void setAdminNote(String v) { this.adminNote = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
