import { resolveDNS } from './resolver.js';

const DOMAINS = ["speedcdns.com", "google.com", "root-servers.net", "googleapis.com", "apple.com", "mangatoon.mobi", "gstatic.com", "facebook.com", "cloudflare.com", "microsoft.com", "amazonaws.com", "googlevideo.com", "tiktokcdn.com", "fbcdn.net", "whatsapp.net", "doubleclick.net", "youtube.com", "instagram.com", "akadns.net", "apple-dns.net", "icloud.com", "amazon.com", "googleusercontent.com", "akamai.net", "live.com", "googlesyndication.com", "ntp.org", "tiktokv.com", "cloudfront.net", "cloudflare-dns.com", "akamaiedge.net", "gvt2.com", "aaplimg.com", "cdninstagram.com", "bing.com", "netflix.com", "ytimg.com", "spotify.com", "yahoo.com", "office.com", "cdn77.org", "tiktokrow-cdn.com", "bytefcdn-oversea.com", "samsung.com", "googleadservices.com", "gvt1.com", "google-analytics.com", "msftncsi.com", "snapchat.com", "dns.google", "one.one", "app-analytics-services.com", "amazon-adsystem.com", "twitter.com", "unity3d.com", "fastly.net", "applovin.com", "app-measurement.com", "criteo.com", "trafficmanager.net", "googletagmanager.com", "ui.com", "wikipedia.org", "steamserver.net", "roblox.com", "msn.com", "ggpht.com", "appsflyersdk.com", "cdn20.com", "skype.com", "baidu.com", "azure.com", "rocket-cdn.com", "whatsapp.com", "linkedin.com", "ttlivecdn.com", "rubiconproject.com", "tiktokcdn-us.com", "a2z.com", "sentry.io", "office.net", "microsoftonline.com", "xiaomi.com", "adnxs.com", "digicert.com", "windows.net", "windows.com", "rbxcdn.com", "doubleverify.com", "3gppnetwork.org", "gmail.com", "taboola.com", "android.com", "cdn-apple.com", "qq.com", "casalemedia.com", "vungle.com", "mzstatic.com", "miui.com", "pubmatic.com"];

let timings = {};

for (let i = 0; i < DOMAINS.length; i++) {
    const domain = DOMAINS[i];
    const start = performance.now();
    await resolveDNS(domain);
    const end = performance.now();

    timings[domain] = end - start;
    console.log(`${domain}: ${(end - start).toFixed(3)}ms`);
}

const avg = Object.values(timings).reduce((a, b) => a + b) / Object.keys(timings).length;
console.log(`\nAverage: ${avg.toFixed(3)}ms`);