import cron from 'node-cron';
import { format } from 'date-fns';
import { reportService } from './reportService';

console.log('Starting Automation Worker...');

// Check every minute
cron.schedule('* * * * *', async () => {
    const now = new Date();
    const currentGenericTime = format(now, 'HH:mm');
    const currentDay = now.getDay().toString();
    const todayStr = format(now, 'yyyy-MM-dd');

    console.log(`[${currentGenericTime}] Checking automations...`);

    try {
        // Daily Report
        const dailyConfigStr = await reportService.getSetting('report_auto_daily', '{}');
        const dailyConfig = JSON.parse(dailyConfigStr);

        if (dailyConfig.enabled && dailyConfig.time) {
            // Check if time matches OR if it passed but report wasn't sent (Catch-up logic)
            // Ideally we stick to match for simple cron, but strict equality is what we had.
            // Since this runs every minute on server, strict equality is safer than client-side.
            // However, to be robust against downtime, let's implement "If time >= scheduled AND not run today".

            if (currentGenericTime >= dailyConfig.time) {
                const lastRun = await reportService.getSetting('last_run_daily', '');

                if (lastRun !== todayStr) {
                    console.log("Triggering Daily Report...");
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);

                    const stats = await reportService.fetchStatsForRange(yesterday, yesterday);
                    await reportService.sendToWebhook({
                        type: 'daily_report',
                        reportDate: format(yesterday, 'yyyy-MM-dd'),
                        triggerTime: now.toISOString(),
                        stats
                    });
                    await reportService.saveSetting('last_run_daily', todayStr);
                    console.log("Daily Report Sent!");
                }
            }
        }

        // Weekly Report
        const weeklyConfigStr = await reportService.getSetting('report_auto_weekly', '{}');
        const weeklyConfig = JSON.parse(weeklyConfigStr);

        if (weeklyConfig.enabled && weeklyConfig.day === currentDay && weeklyConfig.time) {
            if (currentGenericTime >= weeklyConfig.time) {
                const lastRun = await reportService.getSetting('last_run_weekly', '');
                if (lastRun !== todayStr) {
                    console.log("Triggering Weekly Report...");
                    const endWeek = new Date();
                    endWeek.setDate(endWeek.getDate() - 1);
                    const startWeek = new Date();
                    startWeek.setDate(startWeek.getDate() - 7);

                    const stats = await reportService.fetchStatsForRange(startWeek, endWeek);
                    await reportService.sendToWebhook({
                        type: 'weekly_report',
                        reportDate: `${format(startWeek, 'yyyy-MM-dd')} to ${format(endWeek, 'yyyy-MM-dd')}`,
                        triggerTime: now.toISOString(),
                        stats
                    });
                    await reportService.saveSetting('last_run_weekly', todayStr);
                    console.log("Weekly Report Sent!");
                }
            }
        }

    } catch (error) {
        console.error("Error in automation loop:", error);
    }
});
