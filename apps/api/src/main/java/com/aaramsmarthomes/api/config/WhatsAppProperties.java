package com.aaramsmarthomes.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.whatsapp")
public class WhatsAppProperties {

    /** Master feature flag — every send path in WhatsAppService no-ops when false. */
    private boolean enabled = false;
    private String token;
    private String phoneNumberId;
    private String verifyToken;
    private String appSecret;
    private String apiVersion = "v23.0";
    private String feedbackFlowId;
    private String ticketOfferTemplate = "ticket_offer";
    private String ticketConfirmTemplate = "ticket_confirm";
    private String feedbackRequestTemplate = "feedback_request";

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean v) { this.enabled = v; }

    public String getToken() { return token; }
    public void setToken(String v) { this.token = v; }

    public String getPhoneNumberId() { return phoneNumberId; }
    public void setPhoneNumberId(String v) { this.phoneNumberId = v; }

    public String getVerifyToken() { return verifyToken; }
    public void setVerifyToken(String v) { this.verifyToken = v; }

    public String getAppSecret() { return appSecret; }
    public void setAppSecret(String v) { this.appSecret = v; }

    public String getApiVersion() { return apiVersion; }
    public void setApiVersion(String v) { this.apiVersion = v; }

    public String getFeedbackFlowId() { return feedbackFlowId; }
    public void setFeedbackFlowId(String v) { this.feedbackFlowId = v; }

    public String getTicketOfferTemplate() { return ticketOfferTemplate; }
    public void setTicketOfferTemplate(String v) { this.ticketOfferTemplate = v; }

    public String getTicketConfirmTemplate() { return ticketConfirmTemplate; }
    public void setTicketConfirmTemplate(String v) { this.ticketConfirmTemplate = v; }

    public String getFeedbackRequestTemplate() { return feedbackRequestTemplate; }
    public void setFeedbackRequestTemplate(String v) { this.feedbackRequestTemplate = v; }

    /** Base URL for the Graph API, e.g. https://graph.facebook.com/v23.0 */
    public String graphBaseUrl() {
        return "https://graph.facebook.com/" + apiVersion;
    }
}
