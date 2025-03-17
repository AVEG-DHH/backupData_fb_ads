const getListAdsAccount = require("./src/funcs/getListAdsAccount");
const getCampaignLevelReport = require("./src/funcs/getCampaignLevelReport");
const getCampaignLevelReportAveFactory11 = require("./src/funcs/getCampaignLevelReportAveFactory11");
const express = require('express');
const cron = require("node-cron");
const port = process.env.PORT || 8000;
const app = express();
app.use(express.json());

const backupDataCJ = async () => {
    console.log("Now time update!");
    console.log("--------Fb ads Acounts--------");
    await getListAdsAccount();
    await getCampaignLevelReport();
    await getCampaignLevelReportAveFactory11();
};

cron.schedule("59 11 * * *", backupDataCJ, {
    timezone: "Asia/Ho_Chi_Minh",
});

cron.schedule("59 23 * * *", backupDataCJ, {
    timezone: "Asia/Ho_Chi_Minh",
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});