package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "title")
    private String title;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @Column(name = "type")
    private String type;

    @Column(name = "read")
    private boolean read = false;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }

    public String getUserId() { return userId; }
    public void setUserId(String v) { this.userId = v; }

    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }

    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }

    public String getType() { return type; }
    public void setType(String v) { this.type = v; }

    public boolean isRead() { return read; }
    public void setRead(boolean v) { this.read = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
