package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "food_suggestions")
public class FoodSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "suggestion", nullable = false)
    private String suggestion;

    @Column(name = "source", nullable = false)
    private String source = "web";

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "status", nullable = false)
    private String status = "pending";

    @Column(name = "admin_note")
    private String adminNote;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSuggestion() { return suggestion; }
    public void setSuggestion(String v) { this.suggestion = v; }

    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String v) { this.tenantId = v; }

    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }

    public String getAdminNote() { return adminNote; }
    public void setAdminNote(String v) { this.adminNote = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
