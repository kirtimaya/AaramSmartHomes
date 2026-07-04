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
    /** Shared secret required in the X-Tasks-Secret header for /api/internal/tasks/**. */
    private String tasksSecret;
    /** This service's own public URL, e.g. https://aaram-api-xxxx.run.app — used to build
     *  absolute links (e.g. media URLs) where WhatsApp needs a reachable HTTPS URL. */
    private String publicBaseUrl;
    private String googleTtsApiKey;
    private String googleTtsVoice = "hi-IN-Wavenet-D";
    /** WhatsApp number a cook is told to call when the menu-agreement loop is exhausted. */
    private String emergencyContactNumber;

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

    public String getTasksSecret() { return tasksSecret; }
    public void setTasksSecret(String v) { this.tasksSecret = v; }

    public String getPublicBaseUrl() { return publicBaseUrl; }
    public void setPublicBaseUrl(String v) { this.publicBaseUrl = v; }

    public String getGoogleTtsApiKey() { return googleTtsApiKey; }
    public void setGoogleTtsApiKey(String v) { this.googleTtsApiKey = v; }

    public String getGoogleTtsVoice() { return googleTtsVoice; }
    public void setGoogleTtsVoice(String v) { this.googleTtsVoice = v; }

    public String getEmergencyContactNumber() { return emergencyContactNumber; }
    public void setEmergencyContactNumber(String v) { this.emergencyContactNumber = v; }
}
