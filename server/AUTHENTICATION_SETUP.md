# 🔐 Authentication Setup Guide

This guide provides instructions for setting up OAuth 2.0 credentials for Google and GitHub to enable user authentication in ReceiptWise.

## Table of Contents
1.  [Environment Variables](#environment-variables)
2.  [Google OAuth 2.0 Setup](#google-oauth-20-setup)
3.  [GitHub OAuth App Setup](#github-oauth-app-setup)

---

## Environment Variables

Create a `.env` file in the `server` directory if it doesn't already exist. Add the following variables to it:

```env
# Server Configuration
SESSION_SECRET=your_super_secret_session_key
CLIENT_URL=http://localhost:5173

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth Credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**Important:**
- Replace `your_super_secret_session_key` with a long, random string. You can generate one using an online tool.
- The `CLIENT_URL` should match the URL of your React frontend.

---

## Google OAuth 2.0 Setup

1.  **Go to the Google Cloud Console:**
    -   Navigate to [https://console.cloud.google.com/](https://console.cloud.google.com/).

2.  **Create a new project** or select an existing one.

3.  **Navigate to "APIs & Services" > "Credentials":**
    -   In the left sidebar, click on "Credentials".

4.  **Create OAuth consent screen:**
    -   If you haven't already, click on "Configure Consent Screen".
    -   Choose **External** and click "Create".
    -   Fill in the required fields:
        -   **App name:** ReceiptWise (or your preferred name)
        -   **User support email:** Your email address
        -   **Developer contact information:** Your email address
    -   Click "Save and Continue" through the "Scopes" and "Test users" sections. You can add test users if your app is in testing mode.
    -   Finally, go back to the dashboard.

5.  **Create OAuth 2.0 Client ID:**
    -   Click on **+ Create Credentials** and select **OAuth client ID**.
    -   **Application type:** Select **Web application**.
    -   **Name:** ReceiptWise Web Client (or a descriptive name).
    -   **Authorized JavaScript origins:**
        -   Add `http://localhost:3001` (your backend URL)
    -   **Authorized redirect URIs:**
        -   Add `http://localhost:3001/auth/google/callback`
    -   Click **Create**.

6.  **Copy your credentials:**
    -   A dialog will appear with your **Client ID** and **Client Secret**.
    -   Copy these values and paste them into your `.env` file for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## GitHub OAuth App Setup

1.  **Go to GitHub Developer Settings:**
    -   Navigate to [https://github.com/settings/developers](https://github.com/settings/developers).

2.  **Create a new OAuth App:**
    -   Click on the **OAuth Apps** tab, then click **New OAuth App**.

3.  **Fill in the application details:**
    -   **Application name:** ReceiptWise (or your preferred name)
    -   **Homepage URL:** `http://localhost:5173` (your frontend URL)
    -   **Application description:** (Optional) A brief description of your app.
    -   **Authorization callback URL:** `http://localhost:3001/auth/github/callback`

4.  **Generate a new client secret:**
    -   After creating the app, you will see your **Client ID**.
    -   Click the **Generate a new client secret** button.

5.  **Copy your credentials:**
    -   Copy the **Client ID** and the newly generated **Client Secret**.
    -   Paste them into your `.env` file for `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

---

Once you have configured these credentials, your authentication system should be ready to use.