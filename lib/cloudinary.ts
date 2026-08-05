import crypto from "crypto";

/**
 * Minimal, dependency-free Cloudinary helper for SIGNED uploads.
 * The upload preset ("allocation") is configured as Signed in the Cloudinary console,
 * so every upload must carry a signature generated here with the API secret — the secret
 * never leaves the server.
 *
 * Requires these env vars (see .env): CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
 * CLOUDINARY_API_SECRET, CLOUDINARY_UPLOAD_PRESET.
 */

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "allocation";
  return { cloudName, apiKey, apiSecret, uploadPreset };
}

export function isCloudinaryConfigured(): boolean {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * Cloudinary signature = SHA-1 hex of the request params (sorted, `key=value` joined by
 * `&`) with the api_secret appended. `file`, `api_key`, `resource_type` and the signature
 * itself are excluded from the signed string.
 */
export function signParams(params: Record<string, string | number>): string {
  const { apiSecret } = cloudinaryConfig();
  if (!apiSecret) throw new Error("CLOUDINARY_API_SECRET is not set");
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export type UploadResult = {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
};

/**
 * Upload an image (as a Buffer) to Cloudinary via a signed request. Runs on the server.
 * Returns the stored public_id and delivery URL.
 */
export async function uploadImage(
  file: Buffer,
  filename: string,
  folder = "allocation",
): Promise<UploadResult> {
  const { cloudName, apiKey, uploadPreset } = cloudinaryConfig();
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not fully configured. Set CLOUDINARY_CLOUD_NAME (and API key/secret) in .env",
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Params that participate in the signature (alphabetical handling is done in signParams).
  const signed: Record<string, string | number> = {
    folder,
    timestamp,
    upload_preset: uploadPreset,
  };
  const signature = signParams(signed);

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(file)]),
    filename,
  );
  form.append("api_key", apiKey!);
  form.append("timestamp", String(timestamp));
  form.append("upload_preset", uploadPreset);
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as any;
  return {
    publicId: json.public_id,
    secureUrl: json.secure_url,
    width: json.width,
    height: json.height,
    format: json.format,
  };
}

/** Build a delivery URL (optionally transformed) for a stored public_id. */
export function imageUrl(publicId: string, transform = "f_auto,q_auto"): string {
  const { cloudName } = cloudinaryConfig();
  if (!cloudName) return "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}
