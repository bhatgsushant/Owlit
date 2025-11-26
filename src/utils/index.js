export function createPageUrl(name) {
  // map pages to URL paths used in the App routes
  switch ((name || "").toLowerCase()) {
    case "home": return "/home";
    case "dashboard": return "/dashboard";
    case "scanreceipt": return "/scan";
    case "scan": return "/scan";
    case "scanreceiptmulti": return "/scan-multi";
    case "scanmulti": return "/scan-multi";
    case "documents": return "/documents";
    case "insights": return "/insights";
    case "investment": return "/investment";
    case "qna": return "/qna";
    case "askai": return "/ask-ai";
    case "profile": return "/profile";
    case "account": return "/account";
    default: return "/";
  }
}
