const tencentcloud = require("tencentcloud-sdk-nodejs");
const path = require("path");

module.exports = async function (text) {
  const secretId = process.env.TENCENT_TRANSLATION_SECRET_ID;
  const secretKey = process.env.TENCENT_TRANSLATION_SECRET_KEY;
  const TmtClient = tencentcloud.tmt.v20180321.Client;
  const clientConfig = {
    credential: {
      secretId: secretId,
      secretKey: secretKey,
    },
    region: "na-siliconvalley",
    profile: {
      httpProfile: {
        endpoint: "tmt.tencentcloudapi.com",
      },
    },
  };

  const client = new TmtClient(clientConfig);
  const params = {
    SourceText: text,
    Source: "en",
    Target: "zh",
    ProjectId: 0,
  };
  const data = await client.TextTranslate(params);
  // request
  return data.TargetText;
};
