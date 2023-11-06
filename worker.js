import { App } from "@octokit/app";
import { verifyWebhookSignature, generateSignedUrl } from "./lib/verification.js";
import { proxy } from "./lib/proxy.js";
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

export default {
  /**
   * @param {Request} request
   * @param {Record<string, any>} env
   */
  async fetch(request, env) {
    try {
      // Add logic to decide whether to serve an asset or run your original Worker code
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        }
      );
    } catch (e) {
      let pathname = new URL(request.url).pathname;
      return new Response(`"${pathname}" not found`, {
        status: 404,
        statusText: 'not found',
      });
    }
    // wrangler secret put APP_ID
    const appId = env.APP_ID;
    // wrangler secret put WEBHOOK_SECRET
    const secret = env.WEBHOOK_SECRET;

    // The private-key.pem file from GitHub needs to be transformed from the
    // PKCS#1 format to PKCS#8, as the crypto APIs do not support PKCS#1:
    //
    //     openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in private-key.pem -out private-key-pkcs8.pem
    //
    // Then set the private key
    //
    //     cat private-key-pkcs8.pem | wrangler secret put PRIVATE_KEY
    //
    const privateKey = env.PRIVATE_KEY;

    // instantiate app
    // https://github.com/octokit/app.js/#readme
    const app = new App({
      appId,
      privateKey,
      webhooks: {
        secret,
      },
    });

    app.webhooks.on("issues.opened", async ({ octokit, payload }) => {
      await octokit.request(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          issue_number: payload.issue.number,
          body:
            "Hello there from [Cloudflare Worker @ Agstrand.com](https://github.com/IG-AI/agstrand-com_cloudflare_worker.git/#readme)",
        }
      );
    });

    if (request.method === "GET") {
      const { data } = await app.octokit.request("GET /app");

      return new Response(
        `<h1>Agstrand.com - Cloudflare Worker</h1>

<p>Installation count: ${data.installations_count}</p>
    
<p><a href="https://github.com/apps/agstrand-com-cloudflare-worker">Install</a> | <a href="https://github.com/IG-AI/agstrand-com_cloudflare_worker/#readme">source code</a></p>`,
        {
          headers: { "content-type": "text/html" },
        }
      );
    }

    const id = request.headers.get("x-github-delivery");
    const name = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256") ?? "";
    const payloadString = await request.text();
    const payload = JSON.parse(payloadString);

    // Verify webhook signature
    try {
      await verifyWebhookSignature(payloadString, signature, secret);
    } catch (error) {
      app.log.warn(error.message);
      return new Response(`{ "error": "${error.message}" }`, {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Now handle the request
    try {
      await app.webhooks.receive({
        id,
        name,
        payload,
      });

      return new Response(`{ "ok": true }`, {
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      app.log.error(error);

      return new Response(`{ "error": "${error.message}" }`, {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    async emails(message, env, ctx) {
    const allowList = ["daniel@agstrand.com", "g_a@agstrand.com"];
    const forward_adr = "d.e.agstrand@gmail.com"
    if (allowList.indexOf(message.headers.get("to")) == -1) {
      message.setReject("Address not allowed");
    } else {
      await message.forward(forward_adr);
    }
  }
};
