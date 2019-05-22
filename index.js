const express = require('express');
const path = require('path');
const census = require('citysdk');
const request = require('request');
const PORT = process.env.PORT || 5000;

var app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
  res.render('pages/index');
});
app.post('/', function (req, res) {
  
  var url = "https://api.census.gov/data/2017/acs/acs5?get=NAME";
  for (var i = 1; i < 18; i++) {
    url += ",B19001_0";
    if (i < 10) {
      url += "0"
    }
    url += i + "E";
  }
  url += "&for=place:53562,state=";
  request(url, function (error, response, body) {
    console.log('error:', error); // Print the error if one occurred and handle it
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    res.send(JSON.stringify(body))
  })
});
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

//census partial query link for delaware:
//https://api.census.gov/data/2017/acs/acs5?get=NAME,B19001_001E,B19001_002E,B19001_003E,B19001_004E&for=state:10 
//for a complete link, continue to B19001_0017E.
//for catagories, look at https://docs.google.com/spreadsheets/d/1s9QKGoV3oNIjYG5H81N4UNuswCbJc0zJ4RoRNzOzaxo/edit?usp=sharing 