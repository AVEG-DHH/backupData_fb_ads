require("dotenv").config();
const axios = require('axios');
const refreshTokenLark = require("../tokens/refreshTokenLark");

let LARK_ACCESS_TOKEN = "danghuuhung";
let listNewAdsAccounts = [];
let listUpdateAdsAccounts = [];

const callAPIInsightsAdset = async (adAccountId) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() trả về từ 0-11 nên cần +1
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate(); // Lấy số ngày của tháng hiện tại

    let allData = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${currentYear}-${currentMonth.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
        const urlInsights = `https://graph.facebook.com/v19.0/${adAccountId}/insights/`;

        try {
            const response = await axios.get(urlInsights, {
                params: {
                    fields: "account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,ctr,cpc,reach,conversion_values",
                    level: "adset",
                    time_range: JSON.stringify({ "since": date, "until": date }),
                    access_token: process.env.ACCESS_TOKEN_FB_ADS
                }
            });

            allData.push(...response.data.data); // Gom dữ liệu lại
        } catch (error) {
            console.error(`🚨 Lỗi khi gọi API cho ngày ${date}:`, error.response?.data || error.message);
        }
    }

    return allData;
};

const LARK_API_FB_ADS = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_APP_TOKEN_FB_ADS}/tables/${process.env.LARK_TABLE_ID_INSIGHT_ADSET}/records`;
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
            adset_id: data.fields.adset_id,
            adset_name: data.fields.adset_name,
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
            if (dataLB.fields.date_start == dataDevloper.date_start && dataLB.fields.date_stop == dataDevloper.date_stop && dataLB.fields.campaign_id == dataDevloper.campaign_id
                && dataLB.fields.adset_id == dataDevloper.adset_id
            ) {
                break;
            };

            if (j == listAdsAccounts_lark.length - 1) {
                listNewAdsAccounts.push(dataDevloper);
            }
        };
    };
}

const sendLarkAdsAdsetNew = async (fields) => {
    try {
        return await axios.post(
            `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_APP_TOKEN_FB_ADS}/tables/${process.env.LARK_TABLE_ID_INSIGHT_ADSET}/records`,
            { fields },
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
            return sendLarkAdsAdsetNew(fields);
        }
        throw error;
    }
};

const convertDataForNew = (data) => {
    // Lấy tổng giá trị chuyển đổi từ mua hàng (Purchases conversion value)
    const purchaseValueAction = data.action_values?.find(action => action.action_type === "purchase") || {};
    const purchaseConversionValue = parseFloat(purchaseValueAction.value) || 0;

    // Lấy số lượng mua hàng (Purchases)
    const purchasesAction = data.actions?.find(action => action.action_type === "purchase") || {};
    const purchases = parseInt(purchasesAction.value) || 0;

    // Số tiền đã chi tiêu (Amount Spent)
    const amountSpent = parseFloat(data.spend) || 0;

    // Tính toán các chỉ số quan trọng
    const purchaseROAS = amountSpent > 0 ? purchaseConversionValue / amountSpent : 0;
    const costPerPurchase = purchases > 0 ? amountSpent / purchases : 0;

    return {
        account_id: data.account_id,
        account_name: data.account_name,
        campaign_id: data.campaign_id,
        campaign_name: data.campaign_name,
        adset_id: data.adset_id,
        adset_name: data.adset_name,
        impressions: data.impressions,
        clicks: data.clicks,
        spend: data.spend,
        ctr: data.ctr,
        cpc: data.cpc,
        reach: data.reach,
        Purchase_ROAS: purchaseROAS.toFixed(2),
        Purchases: purchases,
        Purchases_Conversion_Value: purchaseConversionValue.toFixed(2),
        Cost_Per_Purchase: costPerPurchase.toFixed(2),
        Amount_Spent: amountSpent.toFixed(2),
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

const getAdSetLevelReport = async () => {
    const listAdsAccounts_metadevlopers = await callAPIInsightsAdset("act_439558778837010");
    const listAdsAccounts_lark = await getDataLarkBase();

    await getDataNewUpdate(listAdsAccounts_metadevlopers, listAdsAccounts_lark);

    // Add record data New
    console.log(listNewAdsAccounts.length);
    if (listNewAdsAccounts.length > 0) {
        for (var j = 0; j < listNewAdsAccounts.length; j++) {
            let data = listNewAdsAccounts[j];
            console.log("New: ...", j, " - ", data.account_id);
            await sendLarkAdsAdsetNew(convertDataForNew(data));
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

module.exports = getAdSetLevelReport;
