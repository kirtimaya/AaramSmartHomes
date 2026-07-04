package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "menu_items")
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "menu_id", nullable = false)
    private String menuId;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "dish_id")
    private String dishId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMenuId() { return menuId; }
    public void setMenuId(String v) { this.menuId = v; }

    public String getItemName() { return itemName; }
    public void setItemName(String v) { this.itemName = v; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int v) { this.sortOrder = v; }

    public String getDishId() { return dishId; }
    public void setDishId(String v) { this.dishId = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
