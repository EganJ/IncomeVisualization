const express = require('express');
const path = require('path');
const census = require('citysdk');
const request = require('request');
const zipcodes = require("zipcodes");
const bodyParser = require("body-parser");
const regression = require("regression");
const PORT = process.env.PORT || 5000;
const avgAmericanIncome = 61372;
var censusValueKeys = [];
var censusTotalHouseholdsKey = "B19001_001E";
//Last response is NaN because it could extend to infinity 
const censusResponseCaps = [0, 10000, 14999, 19999, 24999, 29999, 34999, 39999, 44999, 49999, 59999, 74999, 99999, 124999, 149999, 199999, NaN]
for (var i = 1; i < 18; i++) {
    var key = "B19001_0";
    if (i < 10) {
        key += "0"
    }
    key += i + "E";
    censusValueKeys.push(key);
}
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

var app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
    res.render('pages/index');
});
app.post('/', function (req, res) {
    getData(req.body.area, function (censusData) {
        if ((typeof censusData) == "string") {
            res.write(censusData);
            res.end();
        } else {
            data = [0];
            sumHouseholds = 0;
            for (var key = 1; key < censusValueKeys.length; key++) {
                sumHouseholds += censusData[0][censusValueKeys[key]]
                data.push(sumHouseholds / censusData[0][censusTotalHouseholdsKey]);
            }
            page = buildPage(data);
            res.write(page);
            res.end();
        }
    });
});

/**
 * Gets the census Zip Code Tabulation Area from string.
 * String is either the zipcode (12345) or city, state.
 * Ex: Somecity, CA. Space must be their, comma optional
 * 
 */
function getData(string, callback) {
    string = string.trim();
    const errMessage = "<body style='color:cornsilk;text-align:center; display:flex;flex-direction:column;'><p>We were unable to find a valid census ZCTA. Please check that your search is either a five-digit zip code or your City, State.</p><p>Ex: 12345 or Somecity, CA</p><p>Zipcodes are more accurate, as cities with multiple zip codes are arbitrarily selected.</p></body>";
    var lat, long;
    if (isNaN(string)) {
        //Either is not valid or is city, state
        components = string.split(",");
        if (!(components.length == 2)) {
            callback(errMessage);
            return;
        } else {
            search = zipcodes.lookupByName(components[0].trim(), components[1].trim())[0];
            if (search == undefined) {
                callback(errMessage);
                return;
            } else {
                lat = search.latitude;
                long = search.longitude;
            }
        }
    } else {
        search = zipcodes.lookup(string);
        if (search == undefined) {
            callback(errMessage);
            return;
        } else {
            lat = search.latitude;
            long = search.longitude;
        }
    }
    func = this;
    censusres = null;
    census({
        "vintage": 2017,
        "geoHierarchy": {
            "zip-code-tabulation-area": {
                "lat": lat,
                "lng": long
            }
        },
        "sourcePath": ["acs", "acs5"],
        "values": censusValueKeys
    }, function (err, res) {
        if (!(err == null)) {
            console.log("<!-Error:", err, "->");
            callback("<p style='text-align:center;'>" + err + "</p>");
            return;
        } else {
            callback(res);
            return;
        }
    });
}
/**
 * Takes in an array of the percentiles that each money catagory in censusResponseCaps 
 * would fall at, and responds with a message string to be sent to the page.
 */
function buildPage(data) {
    var total = data[0];
    var page = "<html><script src=\"https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.js\"></script><head><link rel='stylesheet' type='text/css' href='/stylesheets/main.css'></head><body data-masonry='{ \"itemSelector\": \"img\", \"columnWidth\": 50 }'>";
    // for (var d=0;d<data.length;d++) {
    //     page += "<p>" + data[d] +" - &"+censusResponseCaps[d+1]+ "</p>"
    // }
    var dataInd = 0;//the index of data catagory that this is below.
    var percent = 0;
    var incomes = [];
    //continue to the last known percentile
    for (; percent / 100 <= data[data.length - 2]; percent++) {
        var p = percent / 100;//Decimal value
        while (p > data[dataInd + 1]) {
            //percentile moves up to next catagory
            dataInd++;
        }
        //create weights
        //distances to known percentile
        difDown = p - data[dataInd];
        difUp = data[dataInd + 1] - p;
        spread = data[dataInd + 1] - data[dataInd];
        if (spread == 0) {
            spread = 0.000001;
        }
        weightDown = difUp / spread;//Greater distance from up, greater weight down
        weightUp = difDown / spread;//Sum of weight up and weight down will always equal 1
        income = weightDown * censusResponseCaps[dataInd] + weightUp * censusResponseCaps[dataInd + 1];
        incomes.push(income);
    }
    //create regression
    var regressionData = [];
    for (var point = 0; point < incomes.length; point++) {
        regressionData.push([point, incomes[point]]);
    }
    var predictedPercent = percent;
    var coef = regression.polynomial(regressionData, { orderpercent: 5 });
    for (; percent < 100; percent++) {
        incomes.push(coef.predict(percent)[1]);
    }
    pageElements = [];
    for (i in incomes) {
        income = incomes[i];
        pageElements.push("<img class='" + randColor() + "' style='margin:0;float:left;width:" + 100 * (income / avgAmericanIncome) + "px;height:" + 100 * (income / avgAmericanIncome) + "px;' src='/person.png' title='Income Percentile:" + i + " Income: $" + Math.floor(income) + (function () { if (i >= predictedPercent) { return " Extrapolated"; } return ""; })() + "'>");
    }
    page+=shuffle(pageElements).join("");
    page += "</body></html>";

    return page;
}

function randColor() {
    return ["red", "green", "blue", "purple", "orange"][Math.floor(Math.random() * 5)]
}
//https://stackoverflow.com/a/2450976
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
  }
app.listen(PORT, () => console.log(`Listening on localhost:${PORT}`));
//census partial query link for delaware:
//https://api.census.gov/data/2017/acs/acs5?get=NAME,B19001_001E,B19001_002E,B19001_003E,B19001_004E&for=state:10 
//for a complete link, continue to B19001_0017E.
//for catagories, look at https://docs.google.com/spreadsheets/d/1s9QKGoV3oNIjYG5H81N4UNuswCbJc0zJ4RoRNzOzaxo/edit?usp=sharing 
