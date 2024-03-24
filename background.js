const CHROME_STORAGE_KEY = "url-extension-states";

/*Utillity fucntions*/

const BASE_API = "https://www.ipqualityscore.com/api/json/url";
const API_KEY = "r9VFNcPwKR4sLdQyAeCiIYrvRrWqoOgs";

const REQUESTSTRICTNESS = 1;
const REQUESTURL = BASE_API;
const MYAPIKEY = API_KEY;

const globalServiceWorkerVariable = {
  loading: false,
};

const verifyWebsite = async (
  loading,
  url = "https://codebox-xml.netlify.app/",
  beforeRequest = () => {},
  vars = { strictness: REQUESTSTRICTNESS }
) => {
  // console.log("we ran");

  const apiUrl = `${REQUESTURL}/${MYAPIKEY}/${encodeURIComponent(url)}`;
  const queryString =
    Object.keys(vars).length > 0 ? `?${new URLSearchParams(vars)}` : "";

  try {
    if (typeof loading === "boolean") loading = true;
    beforeRequest(loading);
    const response = await fetch(apiUrl + queryString);
    const result = await response.json();

    // console.log(result);
    // console.log("-------------------------");
    // console.log(JSON.stringify(result, null, 2));
    if (typeof loading === "boolean") loading = false;
    return result;
  } catch (error) {
    if (typeof loading === "boolean") loading = false;
    console.error("error", error);
    return error;
  }
};

function isValidUrl(url) {
  const pattern = /^(http|https):\/\/([a-zA-Z0-9.-]+)(:\d+)?(\/.*)?$/;
  return pattern.test(url);
}

/*End of utility functions*/

const updateExtensionIcon = (data) => {
  // globalVariables.loading || !globalVariables.baseURLResult
  // ? "#7e7e81"
  // : !globalVariables.baseURLResult?.success
  // ? "red"
  // : !globalVariables.baseURLResult?.unsafe
  // ? "green"
  // : "red";
  console.log("udated extension icon with data", data);
};

console.log(`extension running`);
const handleURLORTabUpdate = async (tabData, chromeStorageData) => {
  if (
    chromeStorageData?.switchState &&
    tabData?.url &&
    isValidUrl(tabData.url)
  ) {
    setTimeout(() => sendMessage("loading", { loading: true }), 500);
    await setChromeStorage(CHROME_STORAGE_KEY, {
      ...chromeStorageData,
      windowCurrentLocation: tabData.url,
      loading: true,
    });
    const result = await verifyWebsite(
      globalServiceWorkerVariable.loading,
      tabData.url
    );
    await setChromeStorage(CHROME_STORAGE_KEY, {
      ...chromeStorageData,
      baseURLResult: result,
      loading: false,
    });
    setTimeout(() => sendMessage("loading", { loading: false }), 500);

    updateExtensionIcon(result);
  }
};

/*Chrome API functions */

async function getCurrentTab(runGetChromeStorage = true) {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  if (runGetChromeStorage) getChromeStorageData(tab, handleURLORTabUpdate);

  return tab;
}

async function monitorTab() {
  await chrome.tabs.onActivated.addListener(getCurrentTab);
}

async function onTabURLChange() {
  await chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo?.url) {
      // console.log(changeInfo, "change infor");
      getChromeStorageData(changeInfo, handleURLORTabUpdate);
    }
  });
}

const getChromeStorageData = (inputData, cb = (data) => {}) => {
  chrome.storage.local.get(CHROME_STORAGE_KEY, (data) => {
    if (chrome.runtime.lastError) {
      console.error(
        `Error retrieving data from local storage: ${chrome.runtime.lastError}`
      );
    } else {
      // console.log("chrome storage data", data);

      cb(inputData, data[CHROME_STORAGE_KEY]);
    }
  });
};
const setChromeStorage = async (key, value) => {
  await new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      // console.log("data stored in chrome stoarge");
      resolve();
    });
  });
};

const sendMessage = (action, data) => {
  chrome.runtime.sendMessage({ action: action, data: data });
};

const monitorChromeStorage = () => {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    // console.log(changes, namespace, "changes and namespace");
    const oldVaue = changes[CHROME_STORAGE_KEY].oldValue;
    const newValue = changes[CHROME_STORAGE_KEY].newValue;
    if (oldVaue.switchState === false && newValue.switchState === true) {
      getCurrentTab();
    }
  });
};

onTabURLChange();

getCurrentTab();
monitorTab();
monitorChromeStorage();
