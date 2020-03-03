const fs = require("fs");

csvToArray = (csv, delimiter = ",") =>
  new Promise(resolve => {
    var objPattern = new RegExp(
      "(\\" +
        delimiter +
        "|\\r?\\n|\\r|^)" +
        '(?:"([^"]*(?:""[^"]*)*)"|' +
        '([^"\\' +
        delimiter +
        "\\r\\n]*))",
      "gi"
    );

    var arrData = [];
    var headers = [];
    var headersFound = false;
    var headerIndex = 0;

    var arrMatches = null;

    while ((arrMatches = objPattern.exec(csv))) {
      var strMatchedDelimiter = arrMatches[1];

      if (strMatchedDelimiter.length && strMatchedDelimiter !== delimiter) {
        arrData.push({});
        headersFound = true;
        headerIndex = 0;
      }

      var strMatchedValue;

      if (arrMatches[2]) {
        strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
      } else {
        strMatchedValue = arrMatches[3];
      }

      if (!headersFound) {
        headers.push(strMatchedValue);
      } else {
        arrData[arrData.length - 1][headers[headerIndex]] = strMatchedValue;
        headerIndex++;
      }
    }

    resolve(arrData.slice(0, 100));
  });

convertToCSV = objArray => {
  var array = typeof objArray != "object" ? JSON.parse(objArray) : objArray;
  var str = "";

  const headers = Object.keys(objArray[0]);
  str += `${headers.join()}\n`;

  for (var i = 0; i < array.length; i++) {
    var line = "";
    for (var index in array[i]) {
      if (line != "") line += ",";

      line += array[i][index];
    }

    str += line + "\r\n";
  }

  return str;
};

processedData = data =>
  new Promise(async resolve => {
    const array = await csvToArray(data);
    const newArray = [];
    array.forEach(d => {
      if (!isNaN(parseInt(d.population, 10))) {
        newArray.push({
          id: parseInt(d.id),
          population: parseInt(d.population, 10),
          city: d.city
        });
      }
    });
    resolve(newArray);
  });

writeFile = (newData, filename) => {
  const csv = convertToCSV(newData);
  fs.writeFile(filename, csv, err => {
    if (err) throw err;
  });
};

writeReport = (data, filename) => {
  let html = "";
  let header = "<tr>";

  Object.keys(data).forEach(d => {
    header += `<th>${d}</th>`;
  });

  header += "</tr>";
  let row = "<tr>";

  Object.values(data).forEach(d => {
    row += `<td>${d}</td>`;
  });

  row += "</tr>";

  html = `<table width="100%" border="1"><thead>${header}</thead><tbody>${row}</tbody></table>`;
  fs.writeFile(filename, html, err => {
    if (err) throw err;
  });
};

const runJob = async () => {
  const data = fs.readFileSync("worldcities.csv", "utf-8");
  const newData = await processedData(data);
  const totalPopulation = newData
    .map(d => d.population)
    .reduce((a, b) => a + b, 0);
  const averagePopulation = Math.ceil(totalPopulation / newData.length);
  const minPopulation = Math.min(...newData.map(d => d.population));
  const maxPopulation = Math.max(...newData.map(d => d.population));

  const reportData = {
    "Average Population": averagePopulation,
    "Mininum Population": `${minPopulation} (${
      newData.find(d => d.population === minPopulation).city
    })`,
    "Maxiumum Population": `${maxPopulation} (${
      newData.find(d => d.population === maxPopulation).city
    })`,
    "Total Population": totalPopulation
  };

  writeFile(newData, "worldcities_updated.csv");
  writeReport(reportData, "worldcities_report.html");
};

runJob();
