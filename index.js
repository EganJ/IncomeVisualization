const express = require('express');
const path = require('path');
const census = require('citysdk');
const request = require('request');
const zipcodes = require("zipcodes");
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 5000;

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
  var zipdata = zipcodes.lookup(req.body.area);
  if (!zipdata) {
    //Cannot find zip code.
    //TODO: return error message.
    return;
  }
  //get school district
  var zipcode;
  var block = true;
  census({
    "vintage": 2017,
    "geoHierarchy": {
      "zip-code-tabulation-area": {
        "lat": zipdata.latitude,
        "lng": zipdata.longitude
      }
    }
  }, function (err, censusres) {
    if (!err == null) {
      zipcode = -1;
      console.log("<!-Error:", err);
      console.log("-!>");
    } else {
      zipcode = censusres.geoHierarchy["zip code tabulation area"];
      getPage(zipcode, res);
    }
  });
});

function getPage(zipcode,res) {
  var url = "https://api.census.gov/data/2017/acs/acs5?get=NAME";
  for (var i = 1; i < 18; i++) {
    url += ",B19001_0";
    if (i < 10) {
      url += "0"
    }
    url += i + "E";
  }
  url += "&for=zip code tabulation area:"+zipcode;
  request(url, function (error, response, body) {
    console.log('error:', error); // Print the error if one occurred and handle it
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    res.send(JSON.stringify(body))
  });
}

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

//census partial query link for delaware:
//https://api.census.gov/data/2017/acs/acs5?get=NAME,B19001_001E,B19001_002E,B19001_003E,B19001_004E&for=state:10 
//for a complete link, continue to B19001_0017E.
//for catagories, look at https://docs.google.com/spreadsheets/d/1s9QKGoV3oNIjYG5H81N4UNuswCbJc0zJ4RoRNzOzaxo/edit?usp=sharing 