const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  const appId = "ai.readycue.desktop";
  const appPath = `${appOutDir}/${context.packager.appInfo.productFilename}.app`;

  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log("[notarize] Skipping — APPLE_ID or APPLE_APP_SPECIFIC_PASSWORD not set");
    return;
  }

  console.log(`[notarize] Notarizing ${appId} at ${appPath}...`);

  await notarize({
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  console.log("[notarize] Done.");
};
