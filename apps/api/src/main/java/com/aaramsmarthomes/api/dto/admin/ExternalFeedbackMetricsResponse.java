package com.aaramsmarthomes.api.dto.admin;

import java.util.List;

public record ExternalFeedbackMetricsResponse(List<ServiceStat> byService, List<RegionStat> byRegion) {
    public record ServiceStat(String service, long count, double avgCost, double avgSpeed) {}
    public record RegionStat(String region, long count, double avgCost, double avgSpeed) {}
}
