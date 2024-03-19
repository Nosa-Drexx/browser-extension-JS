const BASE_API = "https://www.ipqualityscore.com/api/json/url";
const API_KEY = "r9VFNcPwKR4sLdQyAeCiIYrvRrWqoOgs";

const REQUESTSTRICTNESS = 1;
const REQUESTURL = BASE_API;
const MYAPIKEY = API_KEY;

export const verifyWebsite = async (
  loading,
  url = "https://codebox-xml.netlify.app/",
  vars = { strictness: REQUESTSTRICTNESS }
) => {
  // console.log("we ran");

  const apiUrl = `${REQUESTURL}/${MYAPIKEY}/${encodeURIComponent(url)}`;
  const queryString =
    Object.keys(vars).length > 0 ? `?${new URLSearchParams(vars)}` : "";

  try {
    if (loading) loading = true;
    const response = await fetch(apiUrl + queryString);
    const result = await response.json();

    // console.log(result);
    // console.log("-------------------------");
    // console.log(JSON.stringify(result, null, 2));
    if (loading) loading = false;
    return result;
  } catch (error) {
    if (loading) loading = false;
    console.error("error", error);
    return error;
  }
};

export const urlStatusColorGen = (urlData) => {
  if (urlData?.success) {
    if (urlData?.unsafe) {
      return { color: "red", meaning: "dangerous" };
    } else if (urlData?.suspicious || urlData.risk_score > 50) {
      return { color: "orange", meaning: "very suspicious" };
    } else if (
      urlData?.phishing ||
      urlData?.redirected ||
      urlData?.malware ||
      urlData?.parking ||
      urlData?.spamming
    ) {
      return { color: "yellow", meaning: "suspicious" };
    } else {
      return { color: "green", meaning: "safe" };
    }
  }
};
