package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.ExternalServiceFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ExternalServiceFeedbackRepository extends JpaRepository<ExternalServiceFeedback, String> {

    interface ServiceAggregate {
        String getServiceUsed();
        Long getTotal();
        Double getAvgCost();
        Double getAvgSpeed();
    }

    interface RegionAggregate {
        String getRegion();
        Long getTotal();
        Double getAvgCost();
        Double getAvgSpeed();
    }

    @Query("SELECT f.serviceUsed AS serviceUsed, COUNT(f) AS total, AVG(f.costScore) AS avgCost, AVG(f.speedScore) AS avgSpeed " +
           "FROM ExternalServiceFeedback f GROUP BY f.serviceUsed")
    List<ServiceAggregate> aggregateByService();

    @Query("SELECT f.region AS region, COUNT(f) AS total, AVG(f.costScore) AS avgCost, AVG(f.speedScore) AS avgSpeed " +
           "FROM ExternalServiceFeedback f WHERE f.region IS NOT NULL GROUP BY f.region")
    List<RegionAggregate> aggregateByRegion();
}
