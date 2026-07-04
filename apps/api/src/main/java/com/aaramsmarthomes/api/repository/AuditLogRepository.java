package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
}
