package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.Menu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MenuRepository extends JpaRepository<Menu, String> {
    Optional<Menu> findByDateAndMealBlock(LocalDate date, String mealBlock);
    List<Menu> findByDateBetweenOrderByDateAscMealBlockAsc(LocalDate from, LocalDate to);
}
