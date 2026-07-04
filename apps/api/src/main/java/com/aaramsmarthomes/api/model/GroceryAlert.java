package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "grocery_alerts")
public class GroceryAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "menu_id")
    private String menuId;

    @Column(name = "meal_block")
    private String mealBlock;

    @Column(name = "raw_utterance", nullable = false)
    private String rawUtterance;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "extracted_items", columnDefinition = "text[]")
    private String[] extractedItems = new String[0];

    @Column(name = "logged_at", insertable = false, updatable = false)
    private OffsetDateTime loggedAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "resolved_by")
    private String resolvedBy;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMenuId() { return menuId; }
    public void setMenuId(String v) { this.menuId = v; }

    public String getMealBlock() { return mealBlock; }
    public void setMealBlock(String v) { this.mealBlock = v; }

    public String getRawUtterance() { return rawUtterance; }
    public void setRawUtterance(String v) { this.rawUtterance = v; }

    public String[] getExtractedItems() { return extractedItems; }
    public void setExtractedItems(String[] v) { this.extractedItems = v; }

    public OffsetDateTime getLoggedAt() { return loggedAt; }

    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime v) { this.resolvedAt = v; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String v) { this.resolvedBy = v; }
}
