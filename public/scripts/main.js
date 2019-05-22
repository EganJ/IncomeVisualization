import census from "citysdk"

census({
    "vintage":2017,
    "geoHierarchy":{
        "county":{
            "lat" : 28.2639,
            "lng":-80.7214
        }
    }
},(err,res)=>console.log(res));