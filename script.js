/*Utillity fucntions*/
const CHROME_STORAGE_KEY = "url-extension-states";
const BASE_API = "https://www.ipqualityscore.com/api/json/url";
const API_KEY = "r9VFNcPwKR4sLdQyAeCiIYrvRrWqoOgs";

const REQUESTSTRICTNESS = 1;
const REQUESTURL = BASE_API;
const MYAPIKEY = API_KEY;

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

const urlStatusColorGen = (urlData, urlDataColorCode) => {
  if (urlData?.success) {
    if (urlData?.unsafe) {
      const result = { color: "red", meaning: "dangerous" };
      urlDataColorCode = result;
      return result;
    } else if (urlData?.suspicious || urlData.risk_score > 50) {
      const result = { color: "orange", meaning: "very suspicious" };
      urlDataColorCode = result;
      return result;
    } else if (
      urlData?.phishing ||
      urlData?.redirected ||
      urlData?.malware ||
      urlData?.parking ||
      urlData?.spamming
    ) {
      const result = { color: "#ffcc00", meaning: "suspicious" };
      urlDataColorCode = result;
      return result;
    } else {
      const result = { color: "green", meaning: "safe" };
      urlDataColorCode = result;
      return result;
    }
  }
};

function storeData(key, value, setInChromeStorage = true, cb = () => {}) {
  window.localStorage.setItem(key, JSON.stringify(value));
  cb();
  if (setInChromeStorage) {
    chrome.storage.local.set({ [key]: value }, () => {
      // console.log("data stored in chrome stoarge");
    });
  }
}

async function retrieveData(key, storeIn = "") {
  await new Promise((resolve, reject) => {
    chrome.storage.local.get(CHROME_STORAGE_KEY, (data) => {
      if (chrome.runtime.lastError) {
        console.error(
          `Error retrieving data from local storage: ${chrome.runtime.lastError}`
        );
        reject(chrome.runtime.lastError);
      } else {
        if (Object.keys(data).length && data[CHROME_STORAGE_KEY]) {
          storeData(
            CHROME_STORAGE_KEY,
            data[CHROME_STORAGE_KEY],
            false,
            resolve
          ); // storeed in local storage  so it can be accessible
        }
      }
    });
  });
  const data = window.localStorage.getItem(key);
  const parsedData = JSON.parse(data);
  storeIn = parsedData;
  return parsedData;
}
/*End of utility functions*/

const localStorage = window.localStorage.getItem("browserUrlAuthenticator");
const extensionState = JSON.parse(localStorage);

const dataToCheck = [
  { name: "Safe", apiKey: "unsafe" },
  { name: "Trustworthy", apiKey: "suspicious" },
  { name: "Phising safe", apiKey: "phishing" },
  { name: "Redirection safe", apiKey: "redirected" },
  { name: "Malware safe", apiKey: "malware" },
  { name: "Parking safe", apiKey: "parking" },
  { name: "Spamming safe", apiKey: "spamming" },
];

class DataStore {
  constructor(initialValue) {
    this.data = initialValue;
    this.observers = new Map(); // Use Map for efficient key lookups
  }

  get(key) {
    return this.data[key];
  }

  set(key, newValue) {
    const oldValue = this.data[key];
    if (oldValue !== newValue) {
      this.data[key] = newValue;
      this.updateChromeStorage(key, newValue);
    }
  }

  updateChromeStorage = (key, newValue) => {
    storeData(CHROME_STORAGE_KEY, { ...this.data, [key]: newValue });
    // console.log(key, newValue, "new update");
  };

  // Create a proxy object to intercept property access
  createProxy() {
    return new Proxy(this, {
      get: (target, propKey) => {
        return target.get(propKey);
      },
      set: (target, propKey, value) => {
        target.set(propKey, value);
        return true; // Indicate successful set operation
      },
    });
  }
}

const defaultGlobalVariables = {
  switchState: extensionState?.checked || false,
  windowCurrentLocation: null,
  baseURLResult: null,
  loading: false,
  urlData: null,
  isLoadingSearchResult: false,
  url: "",
  urlDataColorCode: null,
};

let retrievePreData = await retrieveData(CHROME_STORAGE_KEY);

const dataStore = new DataStore(
  typeof retrievePreData?.switchState === "boolean"
    ? { ...retrievePreData }
    : { ...defaultGlobalVariables }
);

const globalVariables = dataStore.createProxy();

if (typeof retrievePreData?.switchState !== "boolean") {
  storeData(CHROME_STORAGE_KEY, defaultGlobalVariables);
}

let extensionIntiallyChecked = globalVariables?.switchState ? true : false;

const fontAwesomeShieldIcon = document.querySelector(".fa-shield-virus");
const securityTxt = document.querySelector(".nav-security-text");
const currentURL = document.querySelector(".current-url");

const updateHTML = (globalVariables) => {
  if (fontAwesomeShieldIcon) {
    fontAwesomeShieldIcon.style.color =
      globalVariables.loading ||
      !globalVariables.baseURLResult ||
      !globalVariables.switchState
        ? "#7e7e81"
        : !globalVariables.baseURLResult?.success
        ? "red"
        : !globalVariables.baseURLResult?.unsafe
        ? "green"
        : "red";
  }
  if (securityTxt) {
    securityTxt.innerHTML = globalVariables.loading
      ? "checking..."
      : !globalVariables.baseURLResult || !globalVariables.switchState
      ? "off"
      : !globalVariables.baseURLResult?.success
      ? "suspicious"
      : !globalVariables.baseURLResult?.unsafe
      ? "safe"
      : "suspicious";
  }
  if (currentURL) {
    currentURL.innerHTML =
      globalVariables?.baseURLResult?.final_url || "no-url";
  }
};

// console.log(globalVariables);
if (!globalVariables.switchState) {
  globalVariables.loading = false;
}
updateHTML(globalVariables);

/*swich states and functions */

const size = 1;
const width = 48 * size;
const height = 24 * size;
const controllerHeight = height - height / 6;
const animationSpeed = 0.5;
const controllerBg = "white";
const toggleOffbg = "#212121";
const toggleOnbg = "#9243f2";

const animationDetails = {
  right: `calc(${controllerHeight}px)`,
  left: "calc(0%)",
};

const switchBtnStyle = {
  width: `${width}px`,
  height: `${height}px`,
  padding: `${height / 12}px ${width / 12}px`,
  background: globalVariables?.switchState ? toggleOnbg : toggleOffbg,
  borderRadius: `${height / 1.5}px`,
  transition: `background ${animationSpeed}s`,
};

const switchControllerStyle = {
  width: `${controllerHeight}px`,
  height: `${controllerHeight}px`,
  background: controllerBg,
  transform: globalVariables?.switchState
    ? `translateX(${animationDetails.right})`
    : `translateX(${animationDetails.left})`,
  transition: `transform ${animationSpeed}s`,
};

const switchController = document.querySelector(".switch-btn-controller");
const switchBtn = document.querySelector(".switch-btn");

if (switchController && switchBtn) {
  // give swtich btn initail style
  switchBtn.style.width = switchBtnStyle.width;
  switchBtn.style.height = switchBtnStyle.height;
  switchBtn.style.padding = switchBtnStyle.padding;
  switchBtn.style.background = switchBtnStyle.background;
  switchBtn.style.borderRadius = switchBtnStyle.borderRadius;
  switchBtn.style.transition = switchBtnStyle.transition;

  // give switch controller initial style
  switchController.style.width = switchControllerStyle.width;
  switchController.style.height = switchControllerStyle.height;
  switchController.style.background = switchControllerStyle.background;
  switchController.style.transform = switchControllerStyle.transform;
  switchController.style.transition = switchControllerStyle.transition;
}

const handleSwitch = () => {
  window.localStorage.setItem(
    "browserUrlAuthenticator",
    JSON.stringify({ checked: !globalVariables.switchState })
  );
  globalVariables.switchState = !globalVariables.switchState; //updated switch value

  //upated styles based on switch values
  if (globalVariables.switchState && switchController && switchBtn) {
    switchBtn.style.background = toggleOnbg;
    switchController.style.transform = `translateX(${animationDetails.right})`;
  } else if (!globalVariables.switchState && switchController && switchBtn) {
    switchBtn.style.background = toggleOffbg;
    switchController.style.transform = `translateX(${animationDetails.left})`;
  }
  if (!globalVariables.switchState) {
    updateHTML(globalVariables);
    globalVariables.loading = false;
  }
};

switchBtn.addEventListener("click", handleSwitch);
/*End of switch */

/*Input form  and table layout*/
const urlInput = document.querySelector(".url-input");
const form = document.querySelector(".url-form");
const urlInputSubmitBtn = document.querySelector(".url-submit-btn");
const loadingBox = document.querySelector(".url-loader-container");
const tableContainer = document.querySelector(".url-table-container");
const noURLTxtBox = document.querySelector(".no-url-txt");

const urlInputChange = (e) => {
  globalVariables.url = e.target.value;
};
urlInput.value = globalVariables?.urlData?.final_url || "";
urlInput.onchange = urlInputChange;

const updateHTMLOnSearch = (loading) => {
  if (urlInputSubmitBtn) {
    if (loading) {
      urlInputSubmitBtn.innerHTML = `<i class="fa-solid fa-spinner url-spinner"></i>`;
      urlInputSubmitBtn.disabled = true;
      tableContainer.innerHTML = `<span class="loader"></span>`;
      noURLTxtBox.style.display = "none";
    } else {
      urlInputSubmitBtn.innerHTML = "Scan";
      urlInputSubmitBtn.disabled = false;
      tableContainer.innerHTML = "";
    }
  }
};

const circularProgressColorCode = (range = 0) => {
  if (range <= 25) {
    return "red";
  } else if (range > 25 && range <= 50) {
    return "orange";
  } else if (range > 50 && range <= 75) {
    return "#ffcc00";
  } else if (range > 75) {
    return "#339900";
  } else {
    return "#cc3300";
  }
};

const circularProgressBarJS = (
  urlRiskScore = 10,
  percentageData = urlRiskScore <= 0
    ? Math.min(100, 100 - urlRiskScore)
    : Math.max(0, 100 - urlRiskScore),
  progressColorData = "pink",
  speedData = 20
) => {
  const circularProgress = document.querySelector(".circular-progress");

  const progressValue = circularProgress.querySelector(".percentage");
  const innerCircle = circularProgress.querySelector(".inner-circle");
  let startValue = 0,
    endValue = percentageData === 0 ? 1 : percentageData,
    speed = speedData,
    progressColor = progressColorData;

  const progress = setInterval(() => {
    startValue++;
    progressValue.textContent = `${startValue}%`;
    progressColor = circularProgressColorCode(startValue);
    progressValue.style.color = `${progressColor}`;

    innerCircle.style.backgroundColor = `${circularProgress.getAttribute(
      "data-inner-circle-color"
    )}`;

    circularProgress.style.background = `conic-gradient(${progressColor} ${
      startValue * 3.6
    }deg,${circularProgress.getAttribute("data-bg-color")} 0deg)`;
    if (startValue === endValue) {
      clearInterval(progress);
    }
  }, speed);
};

const updatePageTableOnSearchResult = () => {
  tableContainer.innerHTML = ""; //revert on new search
  if (globalVariables.urlData?.success) {
    tableContainer.insertAdjacentHTML(
      "beforeend",
      `<div class="url-result-contents">
    <div
    class="url-result-meaning-container"
  >${
    typeof globalVariables?.urlData?.risk_score === "number"
      ? `<div
        class="circular-progress"
        data-inner-circle-color="white"
        data-percentage="70"
        data-progress-color="rebeccapurple"
        data-bg-color="violet"
      >
        <div class="inner-circle"></div>
        <p class="percentage">0%</p>
      </div>`
      : ``
  }

    <span class="url-result-meaning-txt">
      ${
        globalVariables.urlDataColorCode?.color !== "green" ? "Beware" : ""
      } The Site 
      <b>${globalVariables.urlData?.domain}</b> is
      <b style="color: ${globalVariables.urlDataColorCode?.color}" >
        ${globalVariables.urlDataColorCode?.meaning}
      </b>
    </span>
  </div>
  <table>
  <thead>
    <tr class="table-header">
      <td>Activities</td>
      <td>Status</td>
    </tr>
  </thead>
  <tbody class="url-table-body">
  </tbody>
</table>
  </div>`
    );

    const tableBody = document.querySelector(".url-table-body");
    dataToCheck.forEach((data) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="table-key">${
        data.name
      }</td><td class="table-status">
    ${
      !globalVariables.urlData[data.apiKey]
        ? "<i class='fa-solid fa-check' style='color:green;'></i>"
        : "<i class='fa-solid fa-xmark' style='color:red;'></i>"
    }</td>`;

      tableBody.appendChild(tr);
    });
    const riskScoreTD = document.createElement("td");
    const riskScoreValue = document.createElement("td");
    riskScoreTD.className = "table-key";
    riskScoreValue.className = "table-status";
    riskScoreTD.innerHTML = "Risk Score";
    riskScoreValue.innerHTML = globalVariables.urlData?.risk_score;

    tableBody.appendChild(riskScoreTD);
    tableBody.appendChild(riskScoreValue);
  } else {
    tableContainer.insertAdjacentHTML(
      "beforeend",
      `

    <div>${globalVariables.urlData?.message || "Error encountered"}</div>`
    );
  }

  const riskScore = globalVariables?.urlData?.risk_score;
  if (typeof riskScore === "number") circularProgressBarJS(riskScore);
};

if (globalVariables?.urlData && globalVariables?.urlDataColorCode) {
  updatePageTableOnSearchResult();
}

const handleSubmit = async (e) => {
  globalVariables.isLoadingSearchResult = true;
  const result = await verifyWebsite(
    globalVariables?.isLoadingSearchResult,
    globalVariables?.url,
    updateHTMLOnSearch
  );

  console.log(globalVariables);
  globalVariables.isLoadingSearchResult = false;

  globalVariables.urlData = result;

  updateHTMLOnSearch(globalVariables.isLoadingSearchResult);
  const colorCode = urlStatusColorGen(
    globalVariables.urlData,
    globalVariables.urlDataColorCode
  );
  globalVariables.urlDataColorCode = colorCode;

  updatePageTableOnSearchResult();
  globalVariables.url = "";
  urlInput.value = globalVariables?.url;
};

form.addEventListener("submit", function (event) {
  // Prevent the default form submission behavior
  event.preventDefault();
  handleSubmit();
});

/*End of input form and table layout */

/*Chrome API functions */
const handleChromeMessage = async (message) => {
  const newData = await retrieveData(CHROME_STORAGE_KEY);

  globalVariables.loading = newData.loading;
  if (!message.data.loading)
    globalVariables.baseURLResult = newData.baseURLResult;
  updateHTML(globalVariables);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log("'heoo");
  if (message.action === "loading") {
    handleChromeMessage(message);
  }
});
