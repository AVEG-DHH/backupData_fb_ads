require("dotenv").config();
const axios = require('axios');
const refreshTokenLark = require("../tokens/refreshTokenLark");

let LARK_ACCESS_TOKEN = "danghuuhung";
let listNewAdsAccounts = [];
let listUpdateAdsAccounts = [];

const callAPIListAdsAcc = async () => {
    try {
        const response = await axios.get(process.env.URL_ADS_ACCOUNTS, {
            params: {
                fields: "id,name,account_status,currency,amount_spent,business",
                access_token: process.env.ACCESS_TOKEN_FB_ADS
            }
        });
        return response.data.data;
    } catch (error) {
        console.error('Lỗi khi gọi API của BM AVE 1.2:', error.response?.data || error.message);
    }
};

const callAPIListAdsAccAveFactory11 = async () => {
    try {
        const response = await axios.get(process.env.URL_ADS_ACCOUNTS, {
            params: {
                fields: "id,name,account_status,currency,amount_spent,business",
                access_token: process.env.ACCESS_TOKEN_FB_ADS_AVE_FACTORY_1_1
            }
        });
        return response.data.data;
    } catch (error) {
        console.error('Lỗi khi gọi API của BM Factory AVE 1.1:', error.response?.data || error.message);
    }
};

const LARK_API_FB_ADS = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_APP_TOKEN_FB_ADS}/tables/${process.env.LARK_TABLE_ID_FB_ADS_ADS_ACCOUNTS}/records`;
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
            id: data.fields.id ? data.fields.id : "",
            name: data.fields.name ? data.fields.name : "",
            account_status: data.fields.account_status ? data.fields.account_status : "",
            currency: data.fields.currency ? data.fields.currency : "",
            amount_spent: data.fields.amount_spent ? data.fields.amount_spent : "",
            business_id: data.fields.business_id ? data.fields.business_id : "",
            business_name: data.fields.business_name ? data.fields.business_name : "",
        },
        record_id: data.record_id
    }
};

const getDataNewUpdate = async (listAdsAccounts_metadevlopers, listAdsAccounts_lark) => {
    for (let i = 0; i < listAdsAccounts_metadevlopers.length; i++) {
        let dataDevloper = listAdsAccounts_metadevlopers[i];

        for (let j = 0; j < listAdsAccounts_lark.length; j++) {
            let dataLB = convertDataForCheck(listAdsAccounts_lark[j]);
            if (dataLB.fields.id == dataDevloper.id) {
                let keysToCheck = [
                    "name", "account_status", "currency", "amount_spent", "business_id", "business_name"
                ];

                let hasChanged = keysToCheck.some(key => String(dataLB.fields[key] || "") !== String(dataDevloper[key] || ""));

                if (hasChanged) {
                    listUpdateAdsAccounts.push({ ...dataDevloper, record_id: dataLB.record_id });
                };
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
        return await axios.post(
            `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_APP_TOKEN_FB_ADS}/tables/${process.env.LARK_TABLE_ID_FB_ADS_ADS_ACCOUNTS}/records`,
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
            return sendLarkAdsAccountsNew(fields);
        }
        throw error;
    }
};

const convertDataForNew = (data) => {
    return {
        "id": data.id,
        "name": data.name,
        "account_status": data.account_status,
        "currency": data.currency,
        "amount_spent": data.amount_spent,
        "amount_spent": data.amount_spent,
        "business_id": data.business ? data.business.id : "",
        business_name: data.business ? data.business.name : ""
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
            return sendLarkAdsAccountsNew(fields);
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

const getListAdsAccount = async () => {
    const listAdsAccounts_metadevlopers = await callAPIListAdsAcc();
    const listAdsAccounts_metadevlopersAveFactory11 = await callAPIListAdsAccAveFactory11();
    listAdsAccounts_metadevlopers.push(...listAdsAccounts_metadevlopersAveFactory11);

    const listAdsAccounts_lark = await getDataLarkBase();

    await getDataNewUpdate(listAdsAccounts_metadevlopers, listAdsAccounts_lark);

    // Add record data New
    if (listNewAdsAccounts.length > 0) {
        for (var j = 0; j < listNewAdsAccounts.length; j++) {
            let data = listNewAdsAccounts[j];
            console.log("New: ...", j, " - ", data.id);
            await sendLarkAdsAccountsNew(convertDataForNew(data));
        }
    }

    // Update record data
    if (listUpdateAdsAccounts.length > 0) {
        for (var j = 0; j < listUpdateAdsAccounts.length; j++) {
            let data = listUpdateAdsAccounts[j];
            console.log("Update: ...", j, " - ", data.id);
            await sendLarkAdsAccountsUpdate(convertDataForUpdate(data));
        }
    }
    console.log(listNewAdsAccounts.length);
    console.log(listUpdateAdsAccounts.length);
};

module.exports = getListAdsAccount;
