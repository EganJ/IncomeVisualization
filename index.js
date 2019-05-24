const express = require('express');
const path = require('path');
const census = require('citysdk');
const request = require('request');
const zipcodes = require("zipcodes");
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 5000;

const censusResponseTotal = 1;
var censusValueKeys = [];
var censusTotalHousholdsKey="B19001_001E";
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
            data = []
            for (var key = 1; key < censusValueKeys.length; key++) {
                data.push(censusData[0][censusValueKeys[key]]/censusData[0][censusTotalHousholdsKey]);
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
        } else {
            search = zipcodes.lookupByName(components[0].trim(), components[1].trim())[0];
            if (search == undefined) {
                callback(errMessage);
            } else {
                lat = search.latitude;
                long = search.longitude;
            }
        }
    } else {
        search = zipcodes.lookup(string);
        if (search == undefined) {
            callback(errMessage);
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
        } else {
            callback(res);
        }
    });
}
/**
 * Takes in an array of the percentiles that each money catagory in censusResponseCaps 
 * would fall at, and responds with a message string to be sent to the page.
 */
function buildPage(data) {
    var total = data[0];
    var page = "<html><body style='color:cornsilk;'>"
    for (d in data) {
        page += "<p>" + data[d] + "</p>"
    }
    page += "</body></html>"
    return page;
}

app.listen(PORT, () => console.log(`Listening on localhost:${PORT}`));
//census partial query link for delaware:
//https://api.census.gov/data/2017/acs/acs5?get=NAME,B19001_001E,B19001_002E,B19001_003E,B19001_004E&for=state:10 
//for a complete link, continue to B19001_0017E.
//for catagories, look at https://docs.google.com/spreadsheets/d/1s9QKGoV3oNIjYG5H81N4UNuswCbJc0zJ4RoRNzOzaxo/edit?usp=sharing 
getData("New York NY", console.log);
