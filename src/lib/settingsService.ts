import { supabase } from "@/lib/supabase";
import { Database } from "@/types";

type SettingsKey = 'mini_painel_daily_goal' | 'mini_painel_webhook_url' | 'report_auto_daily' | 'report_auto_weekly' | 'last_run_daily' | 'last_run_weekly';

export const settingsService = {
    /**
     * Get a setting value.
     * Tries to fetch from Supabase first, falls back to localStorage, then environment variables.
     */
    async getSetting(key: SettingsKey, defaultValue: string): Promise<string> {
        try {
            // 1. Try Supabase
            const { data, error } = await supabase
                .from('settings')
                .select('value')
                .eq('key', key)
                .single();

            const setting = data as any;

            if (setting?.value) {
                // Cache in localStorage for offline/faster subsequent access
                localStorage.setItem(key, String(setting.value));
                return String(setting.value);
            }

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
                console.warn(`Error fetching setting ${key}:`, error);
            }

        } catch (err) {
            console.error(`Unexpected error fetching setting ${key}:`, err);
        }

        // 2. Try LocalStorage
        const localValue = localStorage.getItem(key);
        if (localValue) return localValue;

        // 3. Return Default
        return defaultValue;
    },

    /**
     * Save a setting value.
     * Updates Supabase and localStorage.
     */
    async saveSetting(key: SettingsKey, value: string): Promise<void> {
        try {
            // 1. Update localStorage immediately
            localStorage.setItem(key, value);

            // 2. Update Supabase
            const { error } = await supabase
                .from('settings')
                .upsert({
                    key,
                    value,
                    updated_at: new Date().toISOString()
                } as any);

            if (error) throw error;

        } catch (err) {
            console.error(`Error saving setting ${key}:`, err);
            throw err;
        }
    }
};
