package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "wa_messages")
public class WaMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "wa_message_id", unique = true)
    private String waMessageId;

    @Column(name = "direction", nullable = false)
    private String direction;

    @Column(name = "phone_e164")
    private String phoneE164;

    @Column(name = "message_type", nullable = false)
    private String messageType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb")
    private String payload;

    @Column(name = "conversation_id")
    private String conversationId;

    @Column(name = "ticket_id")
    private String ticketId;

    @Column(name = "purged_at")
    private OffsetDateTime purgedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWaMessageId() { return waMessageId; }
    public void setWaMessageId(String v) { this.waMessageId = v; }

    public String getDirection() { return direction; }
    public void setDirection(String v) { this.direction = v; }

    public String getPhoneE164() { return phoneE164; }
    public void setPhoneE164(String v) { this.phoneE164 = v; }

    public String getMessageType() { return messageType; }
    public void setMessageType(String v) { this.messageType = v; }

    public String getPayload() { return payload; }
    public void setPayload(String v) { this.payload = v; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String v) { this.conversationId = v; }

    public String getTicketId() { return ticketId; }
    public void setTicketId(String v) { this.ticketId = v; }

    public OffsetDateTime getPurgedAt() { return purgedAt; }
    public void setPurgedAt(OffsetDateTime v) { this.purgedAt = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
