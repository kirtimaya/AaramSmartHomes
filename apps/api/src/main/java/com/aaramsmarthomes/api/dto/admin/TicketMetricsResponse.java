package com.aaramsmarthomes.api.dto.admin;

import java.util.Map;

public record TicketMetricsResponse(
        Map<String, Long> byCoarseStatus,
        Map<String, Long> byDispatchStatus
) {}
