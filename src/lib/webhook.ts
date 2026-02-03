import { settingsService } from "./settingsService";

export async function sendToWebhook(data: any) {
    // Get URL using service (Supabase -> LocalStorage -> Env)
    const webhookUrl = await settingsService.getSetting('mini_painel_webhook_url', import.meta.env.VITE_N8N_WEBHOOK_URL || "");

    if (!webhookUrl || webhookUrl.includes('your-endpoint-here')) {
        console.warn('Webhook URL not configured');
        return;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString(),
                ...data
            }),
        });

        if (!response.ok) {
            console.error('Webhook error:', response.statusText);
            throw new Error(`Webhook failed: ${response.statusText} (${response.status})`);
        }
    } catch (error) {
        console.error('Failed to send webhook:', error);
        throw error;
    }
}
