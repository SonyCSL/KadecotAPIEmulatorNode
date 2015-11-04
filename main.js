var lib = require("./lib.js");
var WAMP_MSG_TYPE = {
  HELLO: 1,
  WELCOME: 2,
  ABORT: 3,
  CHALLENGE: 4,
  AUTHENTICATE: 5,
  GOODBYE: 6,
  HEARTBEAT: 7,
  ERROR: 8,
  PUBLISH: 16,
  PUBLISHED: 17,
  SUBSCRIBE: 32,
  SUBSCRIBED: 33,
  UNSUBSCRIBE: 34,
  UNSUBSCRIBED: 35,
  EVENT: 36,
  CALL: 48,
  CANCEL: 49,
  RESULT: 50,
  REGISTER: 64,
  REGISTERED: 65,
  UNREGISTER: 66,
  UNREGISTERED: 67,
  INVOCATION: 68,
  INTERRUPT: 69,
  YIELD: 70
};

console.log("-- Welcome to Nise kadecot --");
console.log("-- Local machine information --");
console.log(lib.getLocalAddress());

console.log("-- startup websocket --");

var distmeter_profile = {
  description: "{\"ClassGroupCode\":2,\"ClassCode\":135}",
  deviceId:    1,
  deviceType:  "PowerDistributionBoardMetering",
  ip_addr:     "-----",
  location:    {main: "Others", sub: ""},
  nickname:    "PowerDistributionBoardMetering",
  protocol:    "echonetlite",
  status:      true
};
var smartmeter_profile = {
  description: "{\"ClassGroupCode\":2,\"ClassCode\":136}",
  deviceId:    2,
  deviceType:  "SmartElectricEnergyMeter",
  ip_addr:     "-----",
  location:    {main: "Others", sub: ""},
  nickname:    "SmartElectricEnergyMeter",
  protocol:    "echonetlite",
  status:      true
};

var distmeter = {
  "OperationStatus": 0x30,
  "MeasuredCumulativeAmountOfElectricEnergyNormalDirection": 5000000,
  "MeasuredCumulativeAmountOfElectricEnergyReverseDirection": 5000000,
  "UnitForCumulativeAmountsOfElectricEnergy": 0x0a,
  "SetPropertyMap": [1, 0x80],
  "GetPropertyMap": [4, 0x80, 0xC0, 0xC1, 0xC2]
};
var smartmeter = {
  "OperationStatus": 0x30,
  "NumberOfEffectiveDigitsForCumulativeAmountsOfElectricEnergy": 0x01,
  "HistoricalDataOfMeasuredCumulativeAmountsOfElectricEnergyNormalDirection": 5000000
};

var device_profile = [distmeter_profile, smartmeter_profile];
var devices = [distmeter, smartmeter];

var sessionId = 0;
var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: 41314 });
wss.on('connection', function connection(ws) {
  console.log((new Date()) + ' Connection accepted.');
  var eventListeners = Object.create(null);
  var addEventListener = function(event, callback){
    if(eventListeners[event] === undefined){
      eventListeners[event] = [];
    }
    eventListeners[event].push(callback);
  };
  var fireCallback = function(event, data){
    if(!(event in eventListeners)){
      return;
    }
    eventListeners[event].forEach(function(callback){
      callback(data);
    });
  };

  addEventListener(WAMP_MSG_TYPE.HELLO, function(data){
    sessionId++;
    var send = [WAMP_MSG_TYPE.WELCOME, sessionId, {}];
    ws.send(JSON.stringify(send));
  });
  addEventListener(WAMP_MSG_TYPE.CALL, function(data){
    // [CALL,Request|id,{"deviceId":1},“com.sonycsl.kadecot.arduino.pinMode”,[],{"pin":1,“mode”:”OUTPUT”}]
    // [CALL,Request|id,{},“~.getDeviceList”,[]]
    var reqid  = data[1];
    var target = data[2];
    var method = data[3];
    var args   = data[4];
    var opt    = data[5];

    if(method === "com.sonycsl.kadecot.provider.procedure.getDeviceList"){
      var ret = [WAMP_MSG_TYPE.RESULT,reqid,{},[],{"deviceList": device_profile}];
      ws.send(JSON.stringify(ret));
    }else if(method === "com.sonycsl.kadecot.echonetlite.procedure.get"){
      var target_device_id = target.deviceId;
      var target_device = devices[target_device_id-1];
      var prop_name = opt.propertyName;
      if(prop_name in target_device){
        var ret = [WAMP_MSG_TYPE.RESULT,reqid,{deviceId:target_device_id},[],{"propertyValue": target_device[prop_name]}];
        ws.send(JSON.stringify(ret));
      }else{
        console.log("Unknown property:" + prop_name);
      }
    }else if(method === "com.sonycsl.kadecot.echonetlite.procedure.set"){
      // TODO: Refactoring to merge with  "com.sonycsl.kadecot.echonetlite.procedure.get" branch.
      var target_device_id = target.deviceId;
      var target_device = devices[target_device_id-1];
      var prop_name  = opt.propertyName;
      var prop_value = opt.propertyValue;
      if(prop_name in target_device){
        target_device[prop_name] = prop_value;
        var ret = [WAMP_MSG_TYPE.RESULT,reqid,{deviceId:target_device_id},[],{"propertyValue": prop_value}];
        ws.send(JSON.stringify(ret));
      }else{
        console.log("Unknown property:" + prop_name);
      }
    }
  });

  ws.on('message', function incoming(message) {
    console.log(new Date() + ': received: %s', message);
    var data = JSON.parse(message);
    fireCallback(data[0], data);
  });
});