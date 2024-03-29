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

const urlStatusColorGen = (urlData, urlDataColorCode) => {
  if (urlData?.success) {
    if (urlData?.unsafe) {
      const result = { color: "red", meaning: "dangerous" };
      return result;
    } else if (urlData?.suspicious || urlData.risk_score > 50) {
      const result = { color: "orange", meaning: "very suspicious" };
      return result;
    } else if (
      urlData?.phishing ||
      urlData?.redirected ||
      urlData?.malware ||
      urlData?.parking ||
      urlData?.spamming
    ) {
      const result = { color: "#ffcc00", meaning: "suspicious" };
      return result;
    } else {
      const result = { color: "green", meaning: "safe" };
      return result;
    }
  }
};

/*End of utility functions*/

const updateExtensionIcon = (data) => {
  if (!data.unsafe && data?.risk_score < 50) {
    setBrowserIconUsingPath("/images/icon-128-safe.png"); // good url icon
  } else {
    setBrowserIconUsingPath("/images/icon-128-unsafe.png"); // bad url icon
  }
  // console.log("udated extension icon with data", data);
};

/*Function utiliziing chrome API functions */
const handleURLORTabUpdate = async (tabData, chromeStorageData) => {
  if (
    chromeStorageData?.switchState &&
    tabData?.url &&
    isValidUrl(tabData.url)
  ) {
    setTimeout(() => sendMessage("loading", { loading: true }), 500);
    // console.log("before seting Icon");
    setBrowserIconUsingPath("/images/icon-128-loading.png"); //loading icon
    // console.log("tabData.url sending request", tabData.url);
    await setChromeStorage(CHROME_STORAGE_KEY, {
      ...chromeStorageData,
      windowCurrentLocation: tabData.url,
      loading: true,
      isLoadingSearchResult: true,
    });
    const result = await verifyWebsite(
      globalServiceWorkerVariable.loading,
      tabData.url
    );

    // console.log("result", result);
    const colorCode = urlStatusColorGen(result);
    await setChromeStorage(CHROME_STORAGE_KEY, {
      ...chromeStorageData,
      baseURLResult: result,
      urlData: result,
      urlDataColorCode: colorCode,
      loading: false,
      isLoadingSearchResult: false,
    });
    setTimeout(() => sendMessage("loading", { loading: false }), 500);

    updateExtensionIcon(result);
  }
};

/*End of function utiliziing chrome API functions below */

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
    if (newValue.switchState === false) {
      /*change browser icon to off state */
      setBrowserIconUsingPath("/images/icon-128-off.png"); // set off image
    }
    if (
      newValue.switchState === true &&
      !isValidUrl(oldVaue.windowCurrentLocation)
    ) {
      /*change browser icon to default state */
      setBrowserIconUsingPath("/images/icon-128-default.png"); // set default image
    }
    if (oldVaue.switchState === false && newValue.switchState === true) {
      getCurrentTab();
    }
  });
};

const setBrowserIconUsingPath = (
  path = "/images/icon-128-default.png",
  cb = () => {}
) => {
  chrome.action.setIcon({ path: path }, () => {
    cb();
  });
};

getChromeStorageData("", (intails, data) => {
  if (!data?.switchState) {
    setBrowserIconUsingPath("/images/icon-128-off.png"); // set off image
  }
});

/*End of Chrome API functions */

/*funtion calls and intialization */
console.log(`extension running`);

onTabURLChange();

getCurrentTab();
monitorTab();
monitorChromeStorage();
