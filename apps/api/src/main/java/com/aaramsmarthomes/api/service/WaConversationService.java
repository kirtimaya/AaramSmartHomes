package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.model.Professional;
import com.aaramsmarthomes.api.model.WaConversation;
import com.aaramsmarthomes.api.repository.ProfessionalRepository;
import com.aaramsmarthomes.api.repository.WaConversationRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class WaConversationService {

    private final WaConversationRepository conversationRepository;
    private final ProfessionalRepository professionalRepository;
    private final JdbcTemplate jdbc;

    public WaConversationService(WaConversationRepository conversationRepository,
                                  ProfessionalRepository professionalRepository,
                                  JdbcTemplate jdbc) {
        this.conversationRepository = conversationRepository;
        this.professionalRepository = professionalRepository;
        this.jdbc = jdbc;
    }

    public record ResolvedActor(String actorType, String actorId) {}

    /** Resolves a phone number to an actor: the professionals/cooks roster first, then tenants
     *  by phone, else "unknown". Professionals are checked first because a person could plausibly
     *  be both a tenant and on the roster; the roster relationship is the more specific one. */
    public ResolvedActor resolveActor(String phoneE164) {
        Optional<Professional> professional = professionalRepository.findByPhoneE164AndActiveTrue(phoneE164);
        if (professional.isPresent()) {
            Professional p = professional.get();
            return new ResolvedActor("cook".equals(p.getRole()) ? "cook" : "professional", p.getId());
        }

        List<String> tenantIds = jdbc.queryForList(
            "SELECT id FROM tenants WHERE phone = ? LIMIT 1", String.class, phoneE164);
        if (!tenantIds.isEmpty()) {
            return new ResolvedActor("tenant", tenantIds.get(0));
        }

        return new ResolvedActor("unknown", null);
    }

    public Optional<WaConversation> findActive(String phoneE164) {
        return conversationRepository.findByPhoneE164AndActiveTrue(phoneE164);
    }

    /** tickets.requester_id is a Supabase auth id, not a phone number — resolved via
     *  tenants.phone or guests.phone depending on requesterType (both tables use their auth
     *  uid as id). Returns null if no phone is on file. */
    public String resolvePhoneForRequester(String requesterId, String requesterType) {
        String table = "guest".equals(requesterType) ? "guests" : "tenants";
        List<String> phones = jdbc.queryForList(
            "SELECT phone FROM " + table + " WHERE id = ?::uuid AND phone IS NOT NULL",
            String.class, requesterId);
        return phones.isEmpty() ? null : phones.get(0);
    }

    @Transactional
    public WaConversation getOrCreate(String phoneE164, String flow, String initialState) {
        return findActive(phoneE164).orElseGet(() -> startNew(phoneE164, flow, initialState));
    }

    @Transactional
    public WaConversation startNew(String phoneE164, String flow, String initialState) {
        ResolvedActor actor = resolveActor(phoneE164);
        WaConversation conversation = new WaConversation();
        conversation.setPhoneE164(phoneE164);
        conversation.setActorType(actor.actorType());
        conversation.setActorId(actor.actorId());
        conversation.setFlow(flow);
        conversation.setState(initialState);
        conversation.setContext("{}");
        conversation.setActive(true);
        conversation.setExpiresAt(OffsetDateTime.now().plusHours(24));
        conversation.setUpdatedAt(OffsetDateTime.now());
        return conversationRepository.save(conversation);
    }

    @Transactional
    public void transitionState(WaConversation conversation, String newState, String newContextJson) {
        conversation.setState(newState);
        if (newContextJson != null) conversation.setContext(newContextJson);
        conversation.setUpdatedAt(OffsetDateTime.now());
        conversationRepository.save(conversation);
    }

    @Transactional
    public void end(WaConversation conversation) {
        conversation.setActive(false);
        conversation.setUpdatedAt(OffsetDateTime.now());
        conversationRepository.save(conversation);
    }

    @Transactional
    public int expireStaleConversations() {
        List<WaConversation> expired = conversationRepository.findExpiredActive(OffsetDateTime.now());
        for (WaConversation conversation : expired) {
            end(conversation);
        }
        return expired.size();
    }
}
