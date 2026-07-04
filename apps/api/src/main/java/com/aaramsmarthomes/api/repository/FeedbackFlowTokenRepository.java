package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.FeedbackFlowToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;

public interface FeedbackFlowTokenRepository extends JpaRepository<FeedbackFlowToken, String> {
    List<FeedbackFlowToken> findByExpiresAtBefore(OffsetDateTime cutoff);
}
