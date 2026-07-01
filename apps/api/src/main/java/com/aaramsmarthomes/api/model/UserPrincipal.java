package com.aaramsmarthomes.api.model;

/**
 * Resolved identity after JWT validation + role lookup.
 * Populated by RoleResolutionService; injected via @AuthenticationPrincipal.
 */
public record UserPrincipal(
        String userId,
        String email,
        Role role
) {
    public enum Role { ADMIN, TENANT, GUEST }

    public boolean isAdmin()  { return role == Role.ADMIN;  }
    public boolean isTenant() { return role == Role.TENANT; }
}
