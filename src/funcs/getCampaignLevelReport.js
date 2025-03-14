require("dotenv").config();
const axios = require('axios');
const refreshTokenLark = require("../tokens/refreshTokenLark");

let LARK_ACCESS_TOKEN = "danghuuhung";
let listNewAdsAccounts = [];
let listUpdateAdsAccounts = [];

let date_start = "";
let date_stop = "";

const callAPIInsightsCampaignFirst = async (adAccountId) => {
    const urlInsights = `https://graph.facebook.com/v19.0/${adAccountId}/insights/`;
    try {
        const response = await axios.get(urlInsights, {
            params: {
                fields: "account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values,cost_per_action_type,ctr,cpc,reach,conversion_values",
                level: "campaign",
                access_token: process.env.ACCESS_TOKEN_FB_ADS
            }
        });
        date_start = response.data.data[0].date_start;
        date_stop = response.data.data[0].date_stop;
    } catch (error) {
        console.error(`🚨 Lỗi khi gọi API`, error.response?.data || error.message);
    }
};

const callAPIInsightsCampaign = async (adAccountId) => {
    let currentDate = new Date(date_start);
    const lastDate = new Date(date_stop);
    let allData = [];

    while (currentDate <= lastDate) {
        const date = currentDate.toISOString().split("T")[0]; // Format YYYY-MM-DD
        console.log(`📅 Đang lấy dữ liệu cho ngày: ${date}`);

        const urlInsights = `https://graph.facebook.com/v19.0/${adAccountId}/insights/`;

        try {
            const response = await axios.get(urlInsights, {
                params: {
                    fields: "account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values,cost_per_action_type,ctr,cpc,reach,conversion_values",
                    level: "campaign",
                    time_range: JSON.stringify({ "since": date, "until": date }),
                    access_token: process.env.ACCESS_TOKEN_FB_ADS
                }
            });

            if (response.data.data.length > 0) {
                allData.push(...response.data.data); // Gom dữ liệu vào mảng
            }
        } catch (error) {
            console.error(`🚨 Lỗi khi gọi API ngày ${date}:`, error.response?.data || error.message);
        }

        // Tăng ngày hiện tại lên 1
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return allData;
};

const LARK_API_FB_ADS = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_APP_TOKEN_FB_ADS}/tables/${process.env.LARK_TABLE_ID_INSIGHT_CAMPAIGN_1_2_2}/records`;
const getDataLarkBase = async () => {
    let allDataLB = [];
    let pageToken = "" || null;

    try {
        do {
            const response = await axios.get(
                `${LARK_API_FB_ADS}`,  // Cập nhật với đường dẫn lấy dữ liệu
                {
                    headers: {
                        Authorization: `Bearer ${LARK_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    params: {
                        "page_token": pageToken,
                        "page_size": 500
                    }
                }
            );

            allDataLB.push(...response.data?.data?.items);
            pageToken = response.data?.data?.page_token || null;
        } while (pageToken)

        return allDataLB;
    } catch (error) {
        // 📌 Nếu token hết hạn (code: 99991663), lấy token mới rồi thử lại
        if (error.response?.data?.code === 99991663 || error.response?.data?.code === 99991661 || error.response?.data?.code === 99991668) {
            LARK_ACCESS_TOKEN = await refreshTokenLark();
            return getDataLarkBase();
        }
        throw error;
    }
};

const convertDataForCheck = (data) => {
    return {
        fields: {
            account_id: data.fields.account_id,
            account_name: data.fields.account_name,
            campaign_id: data.fields.campaign_id,
            campaign_name: data.fields.campaign_name,
            impressions: data.fields.impressions,
            clicks: data.fields.clicks,
            spend: data.fields.spend,
            ctr: data.fields.ctr,
            cpc: data.fields.cpc,
            reach: data.fields.reach,
            date_start: data.fields.date_start,
            date_stop: data.fields.date_stop
        },
        record_id: data.record_id
    }
};

const getDataNewUpdate = async (listAdsAccounts_metadevlopers, listAdsAccounts_lark) => {
    for (let i = 0; i < listAdsAccounts_metadevlopers.length; i++) {
        let dataDevloper = listAdsAccounts_metadevlopers[i];

        for (let j = 0; j < listAdsAccounts_lark.length; j++) {
            let dataLB = convertDataForCheck(listAdsAccounts_lark[j]);
            if (dataLB.fields.date_start == dataDevloper.date_start && dataLB.fields.date_stop == dataDevloper.date_stop && dataLB.fields.campaign_id == dataDevloper.campaign_id) {
                break;
            };

            if (j == listAdsAccounts_lark.length - 1) {
                listNewAdsAccounts.push(dataDevloper);
            }
        };
    };
}

const sendLarkAdsAccountsNew = async (fields) => {
    try {
        const res = await axios.post(
            `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_APP_TOKEN_FB_ADS}/tables/${process.env.LARK_TABLE_ID_INSIGHT_CAMPAIGN_1_2_2}/records`,
            { fields },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${LARK_ACCESS_TOKEN}`
                }
            }
        );
        return res;
    } catch (error) {
        // 📌 Nếu token hết hạn (code: 99991663), lấy token mới rồi thử lại
        if (error.response?.data?.code === 99991663 || error.response?.data?.code === 99991661 || error.response?.data?.code === 99991668) {
            LARK_ACCESS_TOKEN = await refreshTokenLark();
            return sendLarkAdsAccountsNew(fields);
        }
        throw error;
    }
};

const convertDataForNew = (data) => {
    const purchases = data?.actions.find(action => action.action_type === "purchase")?.value || 0;
    const costPerPurchase = data?.cost_per_action_type.find(action => action.action_type === "purchase")?.value || 0;
    const purchaseConversionValue = data?.action_values.find(action => action.action_type === "purchase")?.value || 0;

    return {
        account_id: data.account_id,
        account_name: data.account_name,
        campaign_id: data.campaign_id,
        campaign_name: data.campaign_name,
        impressions: data.impressions,
        clicks: data.clicks,
        spend: parseFloat(data.spend),
        ctr: data.ctr,
        cpc: data.cpc,
        reach: data.reach,
        // Purchase_ROAS: purchaseROAS.toFixed(2),
        Purchases: parseInt(purchases),
        Cost_Per_Purchase: parseFloat(costPerPurchase),
        Purchases_Conversion_Value: parseFloat(purchaseConversionValue),
        date_start: data.date_start,
        date_stop: data.date_stop
    };
};

const sendLarkAdsAccountsUpdate = async (fields) => {
    try {
        return await axios.put(
            `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_APP_TOKEN_FB_ADS}/tables/${process.env.LARK_TABLE_ID_FB_ADS_ADS_ACCOUNTS}/records/${fields.record_id}`,
            { fields: fields.dataFields },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${LARK_ACCESS_TOKEN}`
                }
            }
        );
    } catch (error) {
        // 📌 Nếu token hết hạn (code: 99991663), lấy token mới rồi thử lại
        if (error.response?.data?.code === 99991663 || error.response?.data?.code === 99991661 || error.response?.data?.code === 99991668) {
            LARK_ACCESS_TOKEN = await refreshTokenLark();
            return sendLarkAdsAccountsUpdate(fields);
        }
        throw error;
    }
};

const convertDataForUpdate = (data) => {
    return {
        dataFields: {
            id: data.id ? data.id : "",
            name: data.name ? data.name : "",
            account_status: data.account_status ? data.account_status : "",
            currency: data.currency ? data.currency : "",
            amount_spent: data.amount_spent ? data.amount_spent : "",
            business_id: data.business ? data.business.id : "",
            business_name: data.business ? data.business.name : "",
        },
        record_id: data.record_id
    }
};

const getCampaignLevelReport = async () => {
    await callAPIInsightsCampaignFirst("act_1279790356694445");
    const listAdsAccounts_metadevlopers = await callAPIInsightsCampaign("act_1279790356694445");
    const listAdsAccounts_lark = await getDataLarkBase();

    await getDataNewUpdate(listAdsAccounts_metadevlopers, listAdsAccounts_lark);

    // Add record data New
    console.log(listNewAdsAccounts.length);
    if (listNewAdsAccounts.length > 0) {
        for (var j = 0; j < listNewAdsAccounts.length; j++) {
            let data = listNewAdsAccounts[j];
            console.log("New: ...", j, " - ", data.account_id);
            await sendLarkAdsAccountsNew(convertDataForNew(data));
        }
    }

    // Update record data
    // console.log(listUpdateAdsAccounts.length);
    // if (listUpdateAdsAccounts.length > 0) {
    //     for (var j = 0; j < listUpdateAdsAccounts.length; j++) {
    //         let data = listUpdateAdsAccounts[j];
    //         console.log("Update: ...", j, " - ", data.id);
    //         await sendLarkAdsAccountsUpdate(convertDataForUpdate(data));
    //     }
    // }
};

module.exports = getCampaignLevelReport;
