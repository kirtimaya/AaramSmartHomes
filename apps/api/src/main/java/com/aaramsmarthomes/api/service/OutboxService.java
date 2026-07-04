package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.model.OutboxEvent;
import com.aaramsmarthomes.api.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

/**
 * Enqueues outbox events within the caller's transaction (repository.save()
 * joins whatever transaction is already open via Spring Data JPA's default
 * REQUIRED propagation) so an event is only ever committed alongside the
 * business change that produced it.
 */
@Service
public class OutboxService {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public OutboxService(OutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    /** Enqueues an event for the next outbox tick. */
    public OutboxEvent enqueue(String eventType, String aggregateType, String aggregateId, Object payload) {
        return enqueueAt(eventType, aggregateType, aggregateId, payload, OffsetDateTime.now());
    }

    /** Enqueues an event that must not be claimed before notBefore — used for delayed timers
     *  (offer expiry, confirmation timeout, feedback-token expiry, conversation expiry). */
    public OutboxEvent enqueueAt(String eventType, String aggregateType, String aggregateId, Object payload, OffsetDateTime notBefore) {
        try {
            OutboxEvent event = new OutboxEvent();
            event.setEventType(eventType);
            event.setAggregateType(aggregateType);
            event.setAggregateId(aggregateId);
            event.setPayload(objectMapper.writeValueAsString(payload));
            event.setStatus("PENDING");
            event.setNextAttemptAt(notBefore);
            return outboxEventRepository.save(event);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize outbox event payload for " + eventType, e);
        }
    }
}
