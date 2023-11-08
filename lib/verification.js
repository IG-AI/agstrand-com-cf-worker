export async function verifyWebhookSignature(payload, signature, secret) {
  if (!signature) {
    throw new Error("Signature is missing");
  } else if (!signature.startsWith("sha256=")) {
    throw new Error("Invalid signature format");
  }

  const algorithm = { name: "HMAC", hash: "SHA-256" };
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    algorithm,
    false,
    ["sign", "verify"]
  );

  const signed = await crypto.subtle.sign(
    algorithm.name,
    key,
    enc.encode(payload)
  );
  const expectedSignature = "sha256=" + array2hex(signed);
  if (!safeCompare(expectedSignature, signature)) {
    throw new Error("Signature does not match event payload and secret");
  }

  // All good!
}

export async function generateSignedUrl(url, secret) {
  // You will need some super-secret data to use as a symmetric key.
  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Signed requests expire after one minute. Note that you could choose
  // expiration durations dynamically, depending on, for example, the path or a query
  // parameter.
  const expirationMs = 60000;
  const expiry = Date.now() + expirationMs;
  // The signature will be computed for the pathname and the expiry timestamp.
  // The two fields must be separated or padded to ensure that an attacker
  // will not be able to use the same signature for other pathname/expiry pairs.
  // The @ symbol is guaranteed not to appear in expiry, which is a (decimal)
  // number, so you can safely use it as a separator here. When combining more
  // fields, consider JSON.stringify-ing an array of the fields instead of
  // concatenating the values.
  const dataToAuthenticate = `${url.pathname}@${expiry}`;

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(dataToAuthenticate)
  );

  // `mac` is an ArrayBuffer, so you need to make a few changes to get
  // it into a ByteString, and then a Base64-encoded string.
  let base64Mac = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // must convert "+" to "-" as urls encode "+" as " "
  base64Mac = base64Mac.replaceAll("+", "-");
  url.searchParams.set("mac", base64Mac);
  url.searchParams.set("expiry", expiry);

  return new Response(url);
}

function array2hex(arr) {
  return [...new Uint8Array(arr)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison */
function safeCompare(expected, actual) {
  const lenExpected = expected.length;
  let result = 0;

  if (lenExpected !== actual.length) {
    actual = expected;
    result = 1;
  }

  for (let i = 0; i < lenExpected; i++) {
    result |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }

  return result === 0;
}


