package com.aaramsmarthomes.api.model;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "menus")
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "meal_block", nullable = false)
    private String mealBlock;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate v) { this.date = v; }

    public String getMealBlock() { return mealBlock; }
    public void setMealBlock(String v) { this.mealBlock = v; }

    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
