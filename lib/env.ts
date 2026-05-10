// Centralized env access. Throws clearly if a required var is missing at runtime.
// Add new vars here so they're typed and validated in one place.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  // Lazy getters so a missing var only throws when actually used.
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get NEXTAUTH_URL() {
    return required("NEXTAUTH_URL");
  },
  get NEXTAUTH_SECRET() {
    return required("NEXTAUTH_SECRET");
  },
  get GOOGLE_CLIENT_ID() {
    return required("GOOGLE_CLIENT_ID");
  },
  get GOOGLE_CLIENT_SECRET() {
    return required("GOOGLE_CLIENT_SECRET");
  },
  get META_APP_ID() {
    return required("META_APP_ID");
  },
  get META_APP_SECRET() {
    return required("META_APP_SECRET");
  },
  get META_GRAPH_VERSION() {
    return optional("META_GRAPH_VERSION") ?? "v23.0";
  },
  get GEMINI_API_KEY() {
    return required("GEMINI_API_KEY");
  },
  get CLOUDINARY_CLOUD_NAME() {
    return required("CLOUDINARY_CLOUD_NAME");
  },
  get CLOUDINARY_API_KEY() {
    return required("CLOUDINARY_API_KEY");
  },
  get CLOUDINARY_API_SECRET() {
    return required("CLOUDINARY_API_SECRET");
  },
  get CLOUDINARY_UPLOAD_PRESET() {
    return optional("CLOUDINARY_UPLOAD_PRESET");
  },
  get RESEND_API_KEY() {
    return required("RESEND_API_KEY");
  },
  get RESEND_FROM_EMAIL() {
    return required("RESEND_FROM_EMAIL");
  },
  get CRON_SECRET() {
    return required("CRON_SECRET");
  },
  get APPROVAL_TOKEN_SECRET() {
    return required("APPROVAL_TOKEN_SECRET");
  },
  get ENCRYPTION_KEY() {
    return required("ENCRYPTION_KEY");
  },
};
