// 把从anki导出的tag列表生成一篇优美的md文档
// specify this desk https://ankiweb.net/shared/info/1104981491
// yarn g scripts/ankis/xxx
require("dotenv").config();
const fs = require("fs-extra");
const parseArgs = require("minimist");
const path = require("path");
const handlebars = require("handlebars");
const translator = require("./translator");
const { parse } = require("node-html-parser");
async function main() {
  const argv = parseArgs(process.argv.slice(2));
  if (argv._.length > 0) {
    const templateString = await fs.readFile(
      path.resolve(__dirname, "./templates/anki-note.hbs"),
      "utf8"
    );
    const template = handlebars.compile(templateString);
    const txt = await fs.readFile(argv._[0], "utf8");
    const lines = txt.split("\n");
    let words = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const elements = line.split("\t");
      const word = elements[0];
      const meaning = elements[5];
      const example = elements[6];
      const pronounce = elements[7];
      const imageElement = elements[1].slice(1, -1);
      const imageElement2 = replaceAll(imageElement, '""', '"');
      const root = parse(imageElement2);
      const imageSrc = root.querySelector("img").getAttribute("src");
      words.push({
        img: `https://ankiuser.net/study/media/${imageSrc}`,
        title: capitalize(word),
        word,
        meaning,
        example,
        pronounce,
      });
    }
    const translatorString = await translator(
      words.map((item) => item.word).join("\n")
    );
    const translators = translatorString.split("\n");
    words = words.map((item, i) => {
      item.zh = translators[i];
      return item;
    });
    const markdownString = template({ words });
    console.log("\n\n");
    console.log(markdownString);
  }
}
const capitalize = (s) => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};
main().catch((e) => {
  console.error("e", e);
});
function replaceAll(string, search, replace) {
  return string.split(search).join(replace);
}
