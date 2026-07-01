package com.aaramsmarthomes.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String supabaseUrl;
    private String supabaseServiceRoleKey;
    private String adminEmail;
    private String groqApiKey;
    private String groqModel = "llama-3.3-70b-versatile";
    private String corsOrigins = "http://localhost:3000";

    public String getSupabaseUrl() { return supabaseUrl; }
    public void setSupabaseUrl(String v) { this.supabaseUrl = v; }

    public String getSupabaseServiceRoleKey() { return supabaseServiceRoleKey; }
    public void setSupabaseServiceRoleKey(String v) { this.supabaseServiceRoleKey = v; }

    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String v) { this.adminEmail = v; }

    public String getGroqApiKey() { return groqApiKey; }
    public void setGroqApiKey(String v) { this.groqApiKey = v; }

    public String getGroqModel() { return groqModel; }
    public void setGroqModel(String v) { this.groqModel = v; }

    public String getCorsOrigins() { return corsOrigins; }
    public void setCorsOrigins(String v) { this.corsOrigins = v; }
}
