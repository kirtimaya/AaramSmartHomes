package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "dispatch_offers")
public class DispatchOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "dispatch_id", nullable = false)
    private String dispatchId;

    @Column(name = "professional_id", nullable = false)
    private String professionalId;

    // Raw JSON array text, e.g. [{"id":"s1","label":"Today 2-4 PM"}, ...] — max 3 (WhatsApp's
    // interactive-button limit). Managed via ObjectMapper in TicketDispatchService.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "slots", nullable = false, columnDefinition = "jsonb")
    private String slots;

    @Column(name = "status", nullable = false)
    private String status = "PENDING";

    @Column(name = "chosen_slot")
    private String chosenSlot;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDispatchId() { return dispatchId; }
    public void setDispatchId(String v) { this.dispatchId = v; }

    public String getProfessionalId() { return professionalId; }
    public void setProfessionalId(String v) { this.professionalId = v; }

    public String getSlots() { return slots; }
    public void setSlots(String v) { this.slots = v; }

    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }

    public String getChosenSlot() { return chosenSlot; }
    public void setChosenSlot(String v) { this.chosenSlot = v; }

    public OffsetDateTime getSentAt() { return sentAt; }
    public void setSentAt(OffsetDateTime v) { this.sentAt = v; }

    public OffsetDateTime getRespondedAt() { return respondedAt; }
    public void setRespondedAt(OffsetDateTime v) { this.respondedAt = v; }

    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime v) { this.expiresAt = v; }
}
