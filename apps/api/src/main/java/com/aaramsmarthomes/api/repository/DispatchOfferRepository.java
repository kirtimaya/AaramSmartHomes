package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.DispatchOffer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;

public interface DispatchOfferRepository extends JpaRepository<DispatchOffer, String> {
    List<DispatchOffer> findByDispatchId(String dispatchId);
    List<DispatchOffer> findByDispatchIdAndStatus(String dispatchId, String status);
    List<DispatchOffer> findByStatusAndExpiresAtBefore(String status, OffsetDateTime cutoff);
}
