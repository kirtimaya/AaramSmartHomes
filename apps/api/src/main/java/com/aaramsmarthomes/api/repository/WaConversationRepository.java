package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.WaConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface WaConversationRepository extends JpaRepository<WaConversation, String> {
    Optional<WaConversation> findByPhoneE164AndActiveTrue(String phoneE164);

    @Query("SELECT c FROM WaConversation c WHERE c.active = true AND c.expiresAt <= :now")
    List<WaConversation> findExpiredActive(@Param("now") OffsetDateTime now);

    List<WaConversation> findByFlowOrderByCreatedAtDesc(String flow);

    @Query("SELECT c FROM WaConversation c WHERE c.flow = :flow AND c.createdAt >= :from AND c.createdAt < :to ORDER BY c.createdAt DESC")
    List<WaConversation> findByFlowAndCreatedAtBetween(@Param("flow") String flow,
                                                         @Param("from") OffsetDateTime from,
                                                         @Param("to") OffsetDateTime to);
}
