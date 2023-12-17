const express = require("express");
const puppeteer = require("puppeteer");
require("dotenv").config();
const { WEBFLOW_PROJECT, WEBFLOW_WFPAGE, WEBFLOW_WFSITE } = process.env;

// ---

function getWebflowDomain() {
  return `${WEBFLOW_PROJECT}.webflow.io`;
}

async function scrapeTarget(targetUrl: string): Promise<{
  innerHtml: string;
  wfSite: string;
  wfPage: string;
}> {
  console.log("[Scrapping started]");
  // Using a headless server
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate and wait till it loads
  console.log("Navigating to ", targetUrl);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".footer");

  // Use page.evaluate to extract data after the page has loaded
  // and modify it to remove the ad tag.
  const htmlHandle = await page.$("html");

  const evaluateContent = (doc: HTMLElement) => {
    const removeAdTag = (doc: HTMLElement) => {
      const elementsToRemove = doc.querySelectorAll(".w-webflow-badge");
      for (let i = 0; i < elementsToRemove.length; i++) {
        elementsToRemove[i].parentNode?.removeChild(elementsToRemove[i]);
      }
    };

    // Remove Webflow tag before returning
    removeAdTag(doc);

    return doc.innerHTML;
  };
  const pageData = await page.evaluate(evaluateContent, htmlHandle);

  await browser.close();

  return {
    innerHtml: pageData,
    // Extracted manually your webflow project and set it up in vars.
    wfPage: WEBFLOW_WFPAGE ?? "",
    wfSite: WEBFLOW_WFSITE ?? "",
  };
}

async function mainHandler(req: any, res: any) {
  const targetUrl = `https://${getWebflowDomain()}`;
  const { innerHtml, wfPage, wfSite } = await scrapeTarget(targetUrl);

  const newHtml = `<!DOCTYPE html>
    <html data-wf-domain="${getWebflowDomain()}" data-wf-page=${wfPage} data-wf-site=${wfSite} data-wf-status="1" 
      class="w-mod-js w-mod-ix wf-montserrat-n9-active wf-montserrat-n5-active wf-montserrat-n6-active wf-montserrat-n2-active wf-montserrat-n8-active wf-montserrat-n7-active wf-montserrat-n1-active wf-montserrat-n4-active wf-montserrat-n3-active wf-montserrat-i1-active wf-montserrat-i3-active wf-montserrat-i9-active wf-montserrat-i4-active wf-montserrat-i6-active wf-montserrat-i5-active wf-montserrat-i8-active wf-montserrat-i7-active wf-montserrat-i2-active wf-gothica1-n3-active wf-gothica1-n4-active wf-gothica1-n5-active wf-gothica1-n6-active wf-gothica1-n7-active wf-gothica1-n8-active wf-active">
      ${innerHtml}
    </html>
  `;

  res.send(newHtml);
}

// Set-up express server
const app = express();

// v1 api routes
app.get("/", mainHandler);

app.listen(3000, () => {
  console.log("server up and running");
});
