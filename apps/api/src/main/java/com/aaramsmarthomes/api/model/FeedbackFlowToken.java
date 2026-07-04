package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "feedback_flow_tokens")
public class FeedbackFlowToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "token")
    private String token;

    @Column(name = "dispatch_id", nullable = false)
    private String dispatchId;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    public String getToken() { return token; }
    public void setToken(String v) { this.token = v; }

    public String getDispatchId() { return dispatchId; }
    public void setDispatchId(String v) { this.dispatchId = v; }

    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime v) { this.expiresAt = v; }
}
