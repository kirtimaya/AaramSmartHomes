package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.Professional;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProfessionalRepository extends JpaRepository<Professional, String> {
    Optional<Professional> findByPhoneE164AndActiveTrue(String phoneE164);
    List<Professional> findByRoleAndActiveTrueOrderByName(String role);
    List<Professional> findByRoleAndTradeAndActiveTrueOrderByName(String role, String trade);
}
