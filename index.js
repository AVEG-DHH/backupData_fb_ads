const getListAdsAccount = require("./src/funcs/getListAdsAccount");
const getAccountLevelReport = require("./src/funcs/getAccountLevelReport");
const getCampaignLevelReport = require("./src/funcs/getCampaignLevelReport");
const getAdSetLevelReport = require("./src/funcs/getAdSetLevelReport");
const getAdLevelReport = require("./src/funcs/getAdLevelReport");
const express = require('express');
const cron = require("node-cron");
const port = process.env.PORT || 8000;
const app = express();
app.use(express.json());

const backupDataCJ = async () => {
    console.log("Now time update!");
    console.log("--------Fb ads Acounts--------");
    await getListAdsAccount();
    await getAccountLevelReport();
    await getCampaignLevelReport();
    await getAdSetLevelReport();
    await getAdLevelReport();
};

cron.schedule("15 0 * * *", backupDataCJ, {
    timezone: "Asia/Ho_Chi_Minh",
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});