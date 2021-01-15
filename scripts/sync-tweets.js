const path = require("path");
const fs = require("fs").promises;

const main = async ({ lang = "en" }) => {
  const outputs = require(`${process.env.GITHUB_WORKSPACE}/${process.env.OUTPUTS_PATH}`);
  const promises = outputs.map((item) => {
    const createdAt = new Date(Date.parse(item.created_at));
    const tweetFilePath = `./${lang}/tweets/${createdAt.getUTCFullYear()}/${
      createdAt.getUTCMonth() + 1
    }/${item.id_str}.json`;
    return fs
      .mkdir(path.dirname(tweetFilePath), {
        recursive: true,
      })
      .then(() => {
        return fs
          .writeFile(tweetFilePath, JSON.stringify(item, null, 2), {
            flag: "wx",
          })
          .catch((e) => {
            if (e.code === "EEXIST") {
              return Promise.resolve();
            } else {
              return Promise.reject(e);
            }
          });
      });
  });
  await Promise.all(promises);
  return outputs.length;
};
module.exports = main;
