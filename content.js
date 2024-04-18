if (typeof init === "undefined") {
  const init = (() => {
    const listener = (request, sender, sendResponse) => {
      if (request.action === "urlData") {
        // console.log(request);
        const isSafe =
          request?.result?.unsafe && request?.result?.risk_score < 50
            ? true
            : false;

        //create host element aand attach shadow to prevent style scoping (effect of styles form other pages)
        const hostElement = document.createElement("div");
        const root = hostElement.attachShadow({ mode: "open" });

        const div = document.createElement("div");
        const removeBtn = document.createElement("button");
        const audio = new Audio(chrome.runtime.getURL("notification.mp3"));

        // console.log(audio);
        removeBtn.onclick = () => {
          div.remove();
        };
        removeBtn.innerHTML = "&#10005;";
        const removeBtnStyle = {
          border: `1px solid ${isSafe ? "#215924" : "#7d2a31"}`,
          backgroundColor: "transparent",
          color: isSafe ? "#215924" : "#7d2a31",
          padding: "6px",
          fontSize: "20.8px",
          cursor: "pointer",
          borderRadius: "8px",
          width: "40px",
          height: "40px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        };
        for (const property in removeBtnStyle) {
          removeBtn.style[property] = removeBtnStyle[property];
        }
        div.innerText = request?.result?.success
          ? `The site is ${request?.result?.domain} is ${
              isSafe ? "safe" : "suspicious"
            }`
          : `An error has occured while scanning site`;
        const styles = {
          position: "fixed",
          top: "10%",
          right: "-100%",
          zIndex: "999999",
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          fontSize: "20.8px",
          backgroundColor: isSafe ? "#d4edda" : "#f8d7da",
          color: isSafe ? "#215924" : "#7d2a31",
          borderRadius: "8px",
          border: `4px solid ${isSafe ? "#c7e8cf" : "#f9dde0"}`,
          padding: "16px",
          fontFamily: "Verdana, Geneva, Tahoma, sans-serif",
          transition: "right 0.4s",
        };
        for (const property in styles) {
          div.style[property] = styles[property];
        }
        console.log(div);
        div.appendChild(removeBtn);

        root.appendChild(div);
        document.body.appendChild(root);
        //slide in div and wait for 3 seconds before sliding out then removing itself
        setTimeout(() => {
          div.style.right = "10px";
          audio.play();
          setTimeout(() => {
            div.style.right = "-100%";
            // setTimeout(() => div?.remove(), 0);
          }, 4000);
        }, 0);
      }
      chrome.runtime.onMessage.removeListener(listener); //prevent memory leak
    };
    chrome.runtime.onMessage.addListener(listener);
  })();
}
