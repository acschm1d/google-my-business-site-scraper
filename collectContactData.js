const fs = require("node:fs/promises");
const path = require("path");
const { parse } = require("node-html-parser");

(async () => {
  const siteCollection = [];

  // Collect and aggregate contact data
  try {
    const data = await fs.readFile(
      path.resolve(__dirname, "./sistrixData.html"),
      { encoding: "utf8" }
    );

    const parsedTableData = parse(data);

    for await (const row of parsedTableData.querySelectorAll("tr")) {
      // Collect host and ranked keyword
      const hostElement = row.querySelector(
        ".table-cell-line_clamp_url .clamp-word"
      );
      const keywordElement = row.querySelector(
        ".table-cell-line_clamp_kw .clamp-word"
      );

      const hostName = hostElement.innerText;

      // Company name, lookalike
      const name = hostName
        .substring(0, hostName.indexOf("."))
        .replace(/-/g, " ")
        .replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());

      // Scrape website
      const host = `https://${hostName}`;

      const response = await fetch(host);
      const result = await response.text();

      const parsedPage = parse(result);

      // Collect phone number
      const phone =
        parsedPage
          .querySelector("[itemprop='telephone']")
          ?.getAttribute("href")
          .replace(/tel:/g, "")
          .replace(/-/g, "") || null;

      console.info(`${host} scraped successfully.`);

      siteCollection.push({
        name,
        host,
        keyword: keywordElement.innerText,
        phone,
      });
    }
  } catch (err) {
    console.log(err);
  }

  // Format csv
  const dataCSV = siteCollection.reduce(
    (acc, site) => {
      const phone = site.phone ? site.phone : "";

      acc += `"${site.name}", ${site.host}, ${phone}, "${site.keyword}", "GMBS Kampagne"\n`;
      return acc;
    },
    `name, host, phone, keyword, label\n` // column names for csv
  );

  // Write contact data into csv
  try {
    console.log("Writing to csv.");
    await fs.writeFile(
      path.resolve(__dirname, "./contacts.csv"),
      dataCSV,
      "utf8"
    );
  } catch (e) {
    console.error("Error while saving to csv.");
  }
})();
