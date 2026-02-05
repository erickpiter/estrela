import cron from 'node-cron';
import { format } from 'date-fns';
import { reportService } from './reportService';
import express from 'express';
import path from 'path';

const app = express();
const port = process.env.PORT || 80;

// Serve static files from the React app build directory
// In Docker, we will copy the React build to '../client' or similar
const clientBuildPath = path.join(__dirname, '../../dist');
app.use(express.static(clientBuildPath));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Serving static files from: ${clientBuildPath}`);
});

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
