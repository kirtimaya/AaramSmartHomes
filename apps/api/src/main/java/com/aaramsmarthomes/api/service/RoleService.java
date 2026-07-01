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

        // Check admins table
        Integer adminCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM admins WHERE user_id = ?", Integer.class, userId);
        if (adminCount != null && adminCount > 0) return Role.ADMIN;

        // Check tenants table
        Integer tenantCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM tenants WHERE user_id = ?", Integer.class, userId);
        if (tenantCount != null && tenantCount > 0) return Role.TENANT;

        return Role.GUEST;
    }
}
