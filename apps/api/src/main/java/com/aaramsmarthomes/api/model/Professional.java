package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "professionals")
public class Professional {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "phone_e164", nullable = false, unique = true)
    private String phoneE164;

    @Column(name = "role", nullable = false)
    private String role = "professional";

    @Column(name = "trade")
    private String trade;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String v) { this.name = v; }

    public String getPhoneE164() { return phoneE164; }
    public void setPhoneE164(String v) { this.phoneE164 = v; }

    public String getRole() { return role; }
    public void setRole(String v) { this.role = v; }

    public String getTrade() { return trade; }
    public void setTrade(String v) { this.trade = v; }

    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active = v; }

    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime v) { this.updatedAt = v; }
}
