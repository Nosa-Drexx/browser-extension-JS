/*Utillity fucntions*/

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
      const result = { color: "yellow", meaning: "suspicious" };
      urlDataColorCode = result;
      return result;
    } else {
      const result = { color: "green", meaning: "safe" };
      urlDataColorCode = result;
      return result;
    }
  }
};
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

const globalVariables = {
  switchState: extensionState?.checked || false,
  windowCurrentLocation: null,
  baseURLResult: null,
  loading: false,
  urlData: null,
  isLoadingSearchResult: false,
  url: "",
  urlDataColorCode: null,
};

const fontAwesomeShieldIcon = document.querySelector(".fa-shield-virus");
const securityTxt = document.querySelector(".nav-security-text");

const updateHTML = (globalVariables) => {
  if (fontAwesomeShieldIcon) {
    fontAwesomeShieldIcon.style.color =
      globalVariables.loading || !globalVariables.baseURLResult
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
      : !globalVariables.baseURLResult
      ? "off"
      : !globalVariables.baseURLResult?.success
      ? "suspicious"
      : !globalVariables.baseURLResult?.unsafe
      ? "safe"
      : "suspicious";
  }
};

async function checkStatus() {
  const result = await verifyWebsite(
    globalVariables?.loading,
    window?.location?.origin,
    updateHTML
  );
  globalVariables.baseURLResult = result;
  console.log(result, "result");
  updateHTML(globalVariables);
}

if (globalVariables?.switchState) {
  checkStatus();
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

  if (
    globalVariables.windowCurrentLocation !== window?.location?.origin &&
    globalVariables.switchState
  ) {
    checkStatus();
    globalVariables.windowCurrentLocation = window.location.origin;
  }
};
/*End of switch */

window.navigation.addEventListener("navigate", (event) => {
  // Check if the origin has changed
  //   if (
  //     window.location.origin !== globalVariables.windowCurrentLocation &&
  //     globalVariables.switchState
  //   ) {
  // Your code to handle the change in origin here
  console.log("Origin has changed!");
  checkStatus();
  // Update the initial origin for future comparisons
  globalVariables.windowCurrentLocation = window.location.origin;
});

window.addEventListener("locationchange", function () {
  console.log("location changed!");
});

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

urlInput.onchange = urlInputChange;

const updateHTMLOnSearch = (loading) => {
  if (urlInputSubmitBtn) {
    if (loading) {
      urlInputSubmitBtn.innerHTML = `<i class="fa-solid fa-spinner url-spinner"></i>`;
      urlInputSubmitBtn.disabled = true;
      loadingBox.innerHTML = "Loading...";
      noURLTxtBox.style.display = "none";
    } else {
      urlInputSubmitBtn.innerHTML = "Scan";
      urlInputSubmitBtn.disabled = false;
      loadingBox.innerHTML = "";
    }
  }
};

const updatePageTableOnSearchResult = () => {
  if (globalVariables.urlData?.success) {
    tableContainer.innerHTML = ""; //revert on new search
    tableContainer.insertAdjacentHTML(
      "beforeend",
      `<div>
    <div
    class="url-result-meaning-container"
  >
  <i class="fa-solid fa-helmet-safety" style="color:${
    globalVariables.urlDataColorCode?.color
  }; font-size: 5rem; text-align:center;"></i>

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
    tableBody.appendChild(`<td class="table-key">Risk Score</td>
  <td class="table-status">${globalVariables.urlData?.risk_score}</td>`);
  } else {
    tableContainer.insertAdjacentHTML(
      "beforeend",
      `

    <div>${globalVariables.urlData?.message || "Error encountered"}</div>`
    );
  }
};

const handleSubmit = async (e) => {
  const result = await verifyWebsite(
    globalVariables?.isLoadingSearchResult,
    globalVariables?.url,
    updateHTMLOnSearch
  );
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

// document.addEventListener("DOMContentLoaded", function () {
//   // Select the form element
//   // Add submit event listener to the form
form.addEventListener("submit", function (event) {
  // Prevent the default form submission behavior
  event.preventDefault();
  handleSubmit();
});
// });
