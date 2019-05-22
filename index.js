const express = require('express')
const path = require('path')
const census = require('citysdk');
const PORT = process.env.PORT || 5000

var app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
  console.log(req.method);
  res.render('pages/index');
});
app.post('/', function (req, res) {
  if (req.method == "POST") {
    census({
      "vintage": 2017,
      "geoHierarchy": {
        "county": {
          "lat": 28.2639,
          "lng": -80.7214
        }
      }
    }, (err, res1) =>{res.write(JSON.stringify(res1)); res.end();});
  }
});
app.listen(PORT, () => console.log(`Listening on ${PORT}`));