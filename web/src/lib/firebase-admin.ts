import { getVercelOidcToken } from "@vercel/oidc";
import { Firestore, type Settings } from "@google-cloud/firestore";
import { ExternalAccountClient, GoogleAuth, OAuth2Client } from "google-auth-library";

let firestore: Firestore | undefined;
let vercelAuthClient: Exclude<ReturnType<typeof ExternalAccountClient.fromJSON>, null> | undefined;
let localAccessTokenClient: OAuth2Client | undefined;

const GOOGLE_CLOUD_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

function getVercelAuthClient() {
  if (vercelAuthClient) return vercelAuthClient;

  const projectNumber = process.env.GCP_PROJECT_NUMBER;
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

  if (!projectNumber || !serviceAccountEmail || !poolId || !providerId) {
    return null;
  }

  const client = ExternalAccountClient.fromJSON(
    {
      type: "external_account",
      audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
      scopes: [GOOGLE_CLOUD_SCOPE],
      subject_token_supplier: {
        getSubjectToken: getVercelOidcToken,
      },
    },
  );

  if (!client) {
    throw new Error("Unable to initialize the Vercel workload identity client.");
  }

  vercelAuthClient = client;
  return vercelAuthClient;
}

function getLocalAccessTokenClient() {
  const accessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  if (!accessToken) return null;
  if (!localAccessTokenClient) {
    localAccessTokenClient = new OAuth2Client();
    localAccessTokenClient.setCredentials({ access_token: accessToken });
  }
  return localAccessTokenClient;
}

export async function getGoogleAccessToken() {
  const federatedClient = getVercelAuthClient();
  const localClient = getLocalAccessTokenClient();
  const token = federatedClient
    ? (await federatedClient.getAccessToken()).token
    : localClient
      ? (await localClient.getAccessToken()).token
      : await new GoogleAuth({ scopes: [GOOGLE_CLOUD_SCOPE] }).getAccessToken();

  if (!token) throw new Error("Google Cloud did not return an access token.");
  return token;
}

export function getAdminFirestore() {
  if (firestore) return firestore;

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Firebase Admin project ID is not configured.");
  }

  const authClient = process.env.FIRESTORE_EMULATOR_HOST
    ? null
    : getVercelAuthClient() || getLocalAccessTokenClient();
  const settings: Settings = {
    projectId,
    ...(authClient ? { authClient } : {}),
  };

  // The Firestore server SDK accepts the keyless Google Auth client through its GAX settings.
  // Outside Vercel it falls back to Application Default Credentials.
  firestore = new Firestore(settings);
  return firestore;
}
