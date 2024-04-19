/*Utillity fucntions*/

const BASE_API = "https://www.ipqualityscore.com/api/json/url";
const API_KEY = "r9VFNcPwKR4sLdQyAeCiIYrvRrWqoOgs";

const REQUESTSTRICTNESS = 1;
const REQUESTURL = BASE_API;
const MYAPIKEY = API_KEY;

export const verifyWebsite = async (
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

export const urlStatusColorGen = (urlData, urlDataColorCode) => {
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
