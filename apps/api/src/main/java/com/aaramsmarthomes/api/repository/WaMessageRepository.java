package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.WaMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WaMessageRepository extends JpaRepository<WaMessage, String> {

    List<WaMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);

    List<WaMessage> findByTicketIdOrderByCreatedAtAsc(String ticketId);

    /**
     * Idempotent insert keyed by the Meta wamid. Returns 1 if a new row was
     * inserted, 0 if wa_message_id already existed (duplicate webhook delivery
     * — Meta retries on any non-2xx or slow response). Callers must treat a
     * 0 result as "already processed" and return 200 without re-enqueueing.
     */
    @Modifying
    @Query(value = "INSERT INTO wa_messages (wa_message_id, direction, phone_e164, message_type, payload) " +
                   "VALUES (:waMessageId, :direction, :phoneE164, :messageType, CAST(:payload AS jsonb)) " +
                   "ON CONFLICT (wa_message_id) DO NOTHING", nativeQuery = true)
    int insertIfNewWamid(@Param("waMessageId") String waMessageId,
                          @Param("direction") String direction,
                          @Param("phoneE164") String phoneE164,
                          @Param("messageType") String messageType,
                          @Param("payload") String payload);
}
