/*Utillity fucntions*/
(async function runscript() {
  const CHROME_STORAGE_KEY = "url-extension-states";
  const BASE_API = "https://browser-extension-js.onrender.com/api";

  const REQUESTSTRICTNESS = 1;
  const REQUESTURL = BASE_API;

  const verifyWebsite = async (
    loading,
    url = "https://codebox-xml.netlify.app/",
    beforeRequest = () => {}
  ) => {
    try {
      if (typeof loading === "boolean") loading = true;
      beforeRequest(loading);
      const response = await fetch(`${REQUESTURL}/${REQUESTSTRICTNESS}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const result = await response.json();

      console.log(result);

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
      if (chrome?.storage?.local?.set) {
        chrome.storage.local.set({ [key]: value }, () => {
          // console.log("data stored in chrome stoarge");
        });
      } else {
        browser.storage.local.set({ [key]: value }, () => {
          // console.log("data stored in chrome stoarge");
        });
      }
    }
  }

  async function retrieveData(key, storeIn = "") {
    await new Promise((resolve, reject) => {
      //chrome and chromium based browser
      chrome.storage.local.get(CHROME_STORAGE_KEY, (data) => {
        if (chrome.runtime.lastError) {
          console.error(
            `Error retrieving data from local storage: ${chrome.runtime.lastError}`
          );
          reject(chrome.runtime.lastError);
        } else {
          if (Object.keys(data).length > 0 && data[CHROME_STORAGE_KEY]) {
            storeData(
              CHROME_STORAGE_KEY,
              data[CHROME_STORAGE_KEY],
              false,
              resolve
            ); // storeed in local storage  so it can be accessible
          } else {
            resolve();
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
    realTimeAlert: true,
  };

  let retrievePreData = await retrieveData(CHROME_STORAGE_KEY);
  // let retrievePreData = {};

  const dataStore = new DataStore(
    retrievePreData !== null &&
    retrievePreData !== undefined &&
    typeof retrievePreData === "object"
      ? Object.keys(retrievePreData).length > 0
        ? { ...retrievePreData }
        : { ...defaultGlobalVariables }
      : { ...defaultGlobalVariables }
  );

  const globalVariables = dataStore.createProxy();

  if (typeof retrievePreData?.switchState !== "boolean") {
    storeData(CHROME_STORAGE_KEY, defaultGlobalVariables);
  }

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
          : !globalVariables.baseURLResult?.unsafe &&
            globalVariables?.baseURLResult?.risk_score < 50
          ? "green"
          : "red";
    }
    if (securityTxt) {
      securityTxt.innerHTML = globalVariables.loading
        ? "checking..."
        : !globalVariables.baseURLResult || !globalVariables.switchState
        ? "real-time check is <br />off"
        : !globalVariables.baseURLResult?.success
        ? "an error has <br />occurred"
        : !globalVariables.baseURLResult?.unsafe &&
          globalVariables?.baseURLResult?.risk_score < 50
        ? "current tab is <br />safe"
        : "current tab is <br />suspicious";
    }
    if (currentURL) {
      currentURL.innerHTML =
        globalVariables?.baseURLResult?.final_url || "no-url";
    }
  };

  if (!globalVariables?.switchState) {
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
  const switchController = window.document.querySelectorAll(
    ".switch-btn-controller"
  );
  const switchBtn = window.document.querySelectorAll(".switch-btn");

  const realTimeScanSwitchControllers = document.querySelectorAll(
    ".real-time-scan-switch-controller"
  );
  const realTimeScanSwithBtns = document.querySelectorAll(
    ".real-time-scan-switch-btn"
  );
  const realTimeAlertSwitchControllers = document.querySelectorAll(
    ".real-time-alert-switch-controller"
  );
  const realTimeAlertSwithBtns = document.querySelectorAll(
    ".real-time-alert-switch-btn"
  );

  if (switchController[0] && switchBtn[0]) {
    switchBtn.forEach((switchBtn) => {
      switchBtn.style.width = switchBtnStyle.width;
      switchBtn.style.height = switchBtnStyle.height;
      switchBtn.style.padding = switchBtnStyle.padding;
      switchBtn.style.background = switchBtnStyle.background;
      switchBtn.style.borderRadius = switchBtnStyle.borderRadius;
      switchBtn.style.transition = switchBtnStyle.transition;
    });
    // give swtich btn initail style

    // give switch controller initial style
    switchController.forEach((switchController) => {
      switchController.style.width = switchControllerStyle.width;
      switchController.style.height = switchControllerStyle.height;
      switchController.style.background = switchControllerStyle.background;
      switchController.style.transform = switchControllerStyle.transform;
      switchController.style.transition = switchControllerStyle.transition;
    });

    //For alerts
    realTimeAlertSwithBtns.forEach((realTimeAlertSwithBtn) => {
      realTimeAlertSwithBtn.style.background = globalVariables?.realTimeAlert
        ? toggleOnbg
        : toggleOffbg;
    });
    realTimeAlertSwitchControllers.forEach((realTimeAlertSwitchController) => {
      realTimeAlertSwitchController.style.transform =
        globalVariables?.realTimeAlert
          ? `translateX(${animationDetails.right})`
          : `translateX(${animationDetails.left})`;
    });
  }

  const handleSwitch = () => {
    window.localStorage.setItem(
      "browserUrlAuthenticator",
      JSON.stringify({ checked: !globalVariables.switchState })
    );
    globalVariables.switchState = !globalVariables.switchState; //updated switch value

    //upated styles based on switch values
    if (
      globalVariables.switchState &&
      realTimeScanSwitchControllers[0] &&
      realTimeScanSwithBtns[0]
    ) {
      realTimeScanSwithBtns.forEach((realTimeScanSwithBtn) => {
        realTimeScanSwithBtn.style.background = toggleOnbg;
      });
      realTimeScanSwitchControllers.forEach((realTimeScanSwitchController) => {
        realTimeScanSwitchController.style.transform = `translateX(${animationDetails.right})`;
      });
    } else if (
      !globalVariables.switchState &&
      realTimeScanSwitchControllers[0] &&
      realTimeScanSwithBtns[0]
    ) {
      realTimeScanSwithBtns.forEach((realTimeScanSwithBtn) => {
        realTimeScanSwithBtn.style.background = toggleOffbg;
      });
      realTimeScanSwitchControllers.forEach((realTimeScanSwitchController) => {
        realTimeScanSwitchController.style.transform = `translateX(${animationDetails.left})`;
      });
    }
    if (!globalVariables.switchState) {
      updateHTML(globalVariables);
      globalVariables.loading = false;
    }
  };

  const handleRealTimeAlert = () => {
    globalVariables.realTimeAlert = !globalVariables.realTimeAlert; //updated switch value

    if (
      globalVariables.realTimeAlert &&
      realTimeAlertSwitchControllers[0] &&
      realTimeAlertSwithBtns[0]
    ) {
      realTimeAlertSwithBtns.forEach((realTimeAlertSwithBtn) => {
        realTimeAlertSwithBtn.style.background = toggleOnbg;
      });
      realTimeAlertSwitchControllers.forEach(
        (realTimeAlertSwitchController) => {
          realTimeAlertSwitchController.style.transform = `translateX(${animationDetails.right})`;
        }
      );
    } else if (
      !globalVariables.realTimeAlert &&
      realTimeAlertSwitchControllers[0] &&
      realTimeAlertSwithBtns[0]
    ) {
      realTimeAlertSwithBtns.forEach((realTimeScanSwithBtn) => {
        realTimeScanSwithBtn.style.background = toggleOffbg;
      });
      realTimeAlertSwitchControllers.forEach(
        (realTimeAlertSwitchController) => {
          realTimeAlertSwitchController.style.transform = `translateX(${animationDetails.left})`;
        }
      );
    }
  };

  realTimeScanSwithBtns.forEach((realTimeScanSwithBtn) => {
    realTimeScanSwithBtn.addEventListener("click", handleSwitch);
  });

  realTimeAlertSwithBtns.forEach((realTimeAlertSwithBtn) => {
    realTimeAlertSwithBtn.addEventListener("click", handleRealTimeAlert);
  });
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
    if (!message.data.loading) {
      globalVariables.baseURLResult = newData.baseURLResult;
      globalVariables.urlData = newData.urlData;
      globalVariables.urlDataColorCode = newData?.urlDataColorCode;
    }
    updateHTML(globalVariables);
    updatePageTableOnSearchResult();
    urlInput.value = globalVariables?.urlData?.final_url || "";
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log("'heoo");
    if (message.action === "loading") {
      handleChromeMessage(message);
    }
  });

  /*settings screen */
  // const settingContainer = document.createElement("div");
  // settingContainer.classList.add("settings-container");
  // const main = document.querySelector("main");
  const settingsContainer = document.querySelector(".settings-container");
  const showSettingBtn = document.querySelector(".setting-screen");
  const hideSettingBtn = document.querySelector(".close-settings-btn");
  if (showSettingBtn) {
    showSettingBtn.addEventListener("click", () => {
      settingsContainer.classList.remove("hide");
    });
  }
  if (hideSettingBtn) {
    hideSettingBtn.addEventListener("click", () => {
      settingsContainer.classList.add("hide");
    });
  }
})();
