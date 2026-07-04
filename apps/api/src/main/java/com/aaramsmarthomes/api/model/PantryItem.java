package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "pantry_items")
public class PantryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "category", nullable = false)
    private String category = "General";

    @Column(name = "quantity")
    private String quantity;

    @Column(name = "unit")
    private String unit;

    @Column(name = "status", nullable = false)
    private String status = "In Stock";

    @Column(name = "min_threshold")
    private String minThreshold;

    @Column(name = "min_threshold_unit")
    private String minThresholdUnit;

    @Column(name = "last_updated_at")
    private OffsetDateTime lastUpdatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String v) { this.name = v; }

    public String getCategory() { return category; }
    public void setCategory(String v) { this.category = v; }

    public String getQuantity() { return quantity; }
    public void setQuantity(String v) { this.quantity = v; }

    public String getUnit() { return unit; }
    public void setUnit(String v) { this.unit = v; }

    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }

    public String getMinThreshold() { return minThreshold; }
    public void setMinThreshold(String v) { this.minThreshold = v; }

    public String getMinThresholdUnit() { return minThresholdUnit; }
    public void setMinThresholdUnit(String v) { this.minThresholdUnit = v; }

    public OffsetDateTime getLastUpdatedAt() { return lastUpdatedAt; }
    public void setLastUpdatedAt(OffsetDateTime v) { this.lastUpdatedAt = v; }
}
