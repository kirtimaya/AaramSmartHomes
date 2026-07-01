package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.VisitRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VisitRequestRepository extends JpaRepository<VisitRequest, String> {
    List<VisitRequest> findByRequesterIdOrderByCreatedAtDesc(String requesterId);
}
