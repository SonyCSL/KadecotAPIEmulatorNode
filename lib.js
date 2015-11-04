var os = require("os");
// http://qiita.com/_shimizu/items/b38d1459abf8436f7f1f
exports.getLocalAddress = function(){
  var ifacesObj = {};
  ifacesObj.ipv4 = [];
  ifacesObj.ipv6 = [];
  var interfaces = os.networkInterfaces();

  for (var dev in interfaces) {
    interfaces[dev].forEach(function(details){
      if (!details.internal){
        switch(details.family){
        case "IPv4":
          ifacesObj.ipv4.push({name:dev, address:details.address});
          break;
        case "IPv6":
          ifacesObj.ipv6.push({name:dev, address:details.address});
          break;
        }
      }
    });
  }
  return ifacesObj;
};
