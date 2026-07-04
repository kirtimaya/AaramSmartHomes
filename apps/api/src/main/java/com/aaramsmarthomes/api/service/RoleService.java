package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.model.UserPrincipal.Role;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class RoleService {

    private final JdbcTemplate jdbc;
    private final AppProperties props;

    public RoleService(JdbcTemplate jdbc, AppProperties props) {
        this.jdbc = jdbc;
        this.props = props;
    }

    public UserPrincipal resolve(Jwt jwt) {
        String userId = jwt.getSubject();
        String email  = jwt.getClaimAsString("email");

        Role role = determineRole(userId, email);
        return new UserPrincipal(userId, email, role);
    }

    private Role determineRole(String userId, String email) {
        // Root admin check (env-configured email)
        if (props.getAdminEmail() != null && props.getAdminEmail().equalsIgnoreCase(email)) {
            return Role.ADMIN;
        }

        // Check admins table (keyed by email — matches web's requireAdmin() and the
        // auth_is_admin() SQL function; the admins table has no user_id column)
        Integer adminCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM admins WHERE lower(email) = lower(?)", Integer.class, email);
        if (adminCount != null && adminCount > 0) return Role.ADMIN;

        // Check tenants table — tenants.id IS the Supabase auth user id (see comment
        // "== auth.uid() / tenants.id" in 20260606_tenant_meal_preferences.sql and the
        // tenant_profiles.tenant_id FK into tenants(id)); there is no separate user_id column
        Integer tenantCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM tenants WHERE id = ?::uuid", Integer.class, userId);
        if (tenantCount != null && tenantCount > 0) return Role.TENANT;

        return Role.GUEST;
    }
}
