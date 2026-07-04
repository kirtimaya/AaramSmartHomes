package com.aaramsmarthomes.api.model;

import com.aaramsmarthomes.api.model.converter.TicketPriorityConverter;
import com.aaramsmarthomes.api.model.converter.TicketStatusConverter;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "tickets")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "requester_id", nullable = false)
    private String requesterId;

    @Column(name = "requester_type", nullable = false)
    private String requesterType = "tenant";

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "category", nullable = false)
    private String category;

    @Convert(converter = TicketPriorityConverter.class)
    @Column(name = "priority", nullable = false)
    private TicketPriority priority = TicketPriority.MEDIUM;

    @Convert(converter = TicketStatusConverter.class)
    @Column(name = "status", nullable = false)
    private TicketStatus status = TicketStatus.PENDING;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "booking_id")
    private String bookingId;

    @Column(name = "room_id")
    private String roomId;

    @Column(name = "preferred_move_in")
    private LocalDate preferredMoveIn;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public enum TicketStatus {
        PENDING("Pending"),
        IN_PROGRESS("In-Progress"),
        RESOLVED("Resolved"),
        CANCELLED("Cancelled");

        private final String dbValue;

        TicketStatus(String dbValue) { this.dbValue = dbValue; }

        @JsonValue
        public String getDbValue() { return dbValue; }

        @JsonCreator
        public static TicketStatus fromDbValue(String value) {
            for (TicketStatus s : values()) {
                if (s.dbValue.equalsIgnoreCase(value) || s.name().equalsIgnoreCase(value)) return s;
            }
            throw new IllegalArgumentException("Unknown ticket status: " + value);
        }
    }

    public enum TicketPriority {
        LOW("Low"),
        MEDIUM("Medium"),
        HIGH("High"),
        URGENT("Urgent");

        private final String dbValue;

        TicketPriority(String dbValue) { this.dbValue = dbValue; }

        @JsonValue
        public String getDbValue() { return dbValue; }

        @JsonCreator
        public static TicketPriority fromDbValue(String value) {
            for (TicketPriority p : values()) {
                if (p.dbValue.equalsIgnoreCase(value) || p.name().equalsIgnoreCase(value)) return p;
            }
            throw new IllegalArgumentException("Unknown ticket priority: " + value);
        }
    }

    // Getters & setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String v) { this.requesterId = v; }

    public String getRequesterType() { return requesterType; }
    public void setRequesterType(String v) { this.requesterType = v; }

    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }

    public String getCategory() { return category; }
    public void setCategory(String v) { this.category = v; }

    public TicketPriority getPriority() { return priority; }
    public void setPriority(TicketPriority v) { this.priority = v; }

    public TicketStatus getStatus() { return status; }
    public void setStatus(TicketStatus v) { this.status = v; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String v) { this.imageUrl = v; }

    public String getAdminNote() { return adminNote; }
    public void setAdminNote(String v) { this.adminNote = v; }

    public String getBookingId() { return bookingId; }
    public void setBookingId(String v) { this.bookingId = v; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String v) { this.roomId = v; }

    public LocalDate getPreferredMoveIn() { return preferredMoveIn; }
    public void setPreferredMoveIn(LocalDate v) { this.preferredMoveIn = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
