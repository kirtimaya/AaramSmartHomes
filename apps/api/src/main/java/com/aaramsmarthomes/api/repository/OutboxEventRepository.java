package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, String> {
}
