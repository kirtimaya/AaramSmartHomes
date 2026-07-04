package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "dish_catalog")
public class DishCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "name_hi")
    private String nameHi;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_fallback", nullable = false)
    private boolean isFallback = false;

    @Column(name = "fallback_priority", nullable = false)
    private int fallbackPriority = 0;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String v) { this.name = v; }

    public String getNameHi() { return nameHi; }
    public void setNameHi(String v) { this.nameHi = v; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String v) { this.imageUrl = v; }

    public boolean isFallback() { return isFallback; }
    public void setFallback(boolean v) { this.isFallback = v; }

    public int getFallbackPriority() { return fallbackPriority; }
    public void setFallbackPriority(int v) { this.fallbackPriority = v; }

    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
