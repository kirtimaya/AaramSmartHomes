package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "menu_ingredients")
public class MenuIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "menu_id", nullable = false)
    private String menuId;

    @Column(name = "ingredient_name", nullable = false)
    private String ingredientName;

    @Column(name = "quantity")
    private String quantity;

    @Column(name = "unit")
    private String unit;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMenuId() { return menuId; }
    public void setMenuId(String v) { this.menuId = v; }

    public String getIngredientName() { return ingredientName; }
    public void setIngredientName(String v) { this.ingredientName = v; }

    public String getQuantity() { return quantity; }
    public void setQuantity(String v) { this.quantity = v; }

    public String getUnit() { return unit; }
    public void setUnit(String v) { this.unit = v; }

    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
