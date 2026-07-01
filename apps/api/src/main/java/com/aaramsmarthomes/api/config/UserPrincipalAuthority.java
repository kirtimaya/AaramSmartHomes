package com.aaramsmarthomes.api.config;

import com.aaramsmarthomes.api.model.UserPrincipal;
import org.springframework.security.core.GrantedAuthority;

/**
 * Wraps UserPrincipal as a GrantedAuthority so Spring Security's
 * JwtAuthenticationConverter can carry it through the authentication pipeline.
 * Retrieved via SecurityContextHolder in controllers.
 */
public class UserPrincipalAuthority implements GrantedAuthority {

    private final UserPrincipal principal;

    public UserPrincipalAuthority(UserPrincipal principal) {
        this.principal = principal;
    }

    public UserPrincipal getPrincipal() {
        return principal;
    }

    @Override
    public String getAuthority() {
        return "ROLE_" + principal.role().name();
    }
}
