package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
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

    // ── Nutrition (Phase 3) — additive, never touches cook-engine fields above ──

    @Column(name = "serving_size")
    private String servingSize;

    @Column(name = "calories")
    private BigDecimal calories;

    @Column(name = "protein_g")
    private BigDecimal proteinG;

    @Column(name = "carbs_g")
    private BigDecimal carbsG;

    @Column(name = "fats_g")
    private BigDecimal fatsG;

    @Column(name = "fiber_g")
    private BigDecimal fiberG;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "micros", columnDefinition = "jsonb")
    private String micros; // JSON array: [{name,value,unit,rdv,benefit,color}]

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "whole_spices", columnDefinition = "jsonb")
    private String wholeSpices; // JSON array of strings

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "benefits", columnDefinition = "jsonb")
    private String benefits; // JSON array of strings

    @Column(name = "cooking_tip", columnDefinition = "TEXT")
    private String cookingTip;

    @Column(name = "nutrition_status", nullable = false)
    private String nutritionStatus = "none"; // none | estimated | approved

    @Column(name = "nutrition_updated_at")
    private OffsetDateTime nutritionUpdatedAt;

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

    public String getServingSize() { return servingSize; }
    public void setServingSize(String v) { this.servingSize = v; }

    public BigDecimal getCalories() { return calories; }
    public void setCalories(BigDecimal v) { this.calories = v; }

    public BigDecimal getProteinG() { return proteinG; }
    public void setProteinG(BigDecimal v) { this.proteinG = v; }

    public BigDecimal getCarbsG() { return carbsG; }
    public void setCarbsG(BigDecimal v) { this.carbsG = v; }

    public BigDecimal getFatsG() { return fatsG; }
    public void setFatsG(BigDecimal v) { this.fatsG = v; }

    public BigDecimal getFiberG() { return fiberG; }
    public void setFiberG(BigDecimal v) { this.fiberG = v; }

    public String getMicros() { return micros; }
    public void setMicros(String v) { this.micros = v; }

    public String getWholeSpices() { return wholeSpices; }
    public void setWholeSpices(String v) { this.wholeSpices = v; }

    public String getBenefits() { return benefits; }
    public void setBenefits(String v) { this.benefits = v; }

    public String getCookingTip() { return cookingTip; }
    public void setCookingTip(String v) { this.cookingTip = v; }

    public String getNutritionStatus() { return nutritionStatus; }
    public void setNutritionStatus(String v) { this.nutritionStatus = v; }

    public OffsetDateTime getNutritionUpdatedAt() { return nutritionUpdatedAt; }
    public void setNutritionUpdatedAt(OffsetDateTime v) { this.nutritionUpdatedAt = v; }
}
