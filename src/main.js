'use strict';

var noble = require('noble/with-bindings')(require('noble/lib/webbluetooth/bindings'));
var eachSeries = require('async/eachSeries');
// var regression = require('regression');
var c3 = require('c3');

var CONFIG_SERVICE_UUID = '1e374a10851e11e3b9e70002a5d5c51b';
var CONFIG_CHARACTERISTIC_UUID   = '1e374a11851e11e3b9e70002a5d5c51b';

var MOTION_SERVICE_UUID = '1e374a20851e11e3b9e70002a5d5c51b';
var MOTION_RAW_CHARACTERISTIC_UUID = '1e374a21851e11e3b9e70002a5d5c51b';
var MOTION_POINTS_CHARACTERISTIC_UUID = '1e374a22851e11e3b9e70002a5d5c51b';

var RING_SERVICE_UUID = '1e374a30851e11e3b9e70002a5d5c51b';
var RING_EVENT_CHARACTERISTIC_UUID  = '1e374a31851e11e3b9e70002a5d5c51b';
var RING_MODE_CHARACTERISTIC_UUID    = '1e374a32851e11e3b9e70002a5d5c51b';
var RING_FEEDBACK_CHARACTERISTIC_UUID   = '1e374a33851e11e3b9e70002a5d5c51b';

var output = document.getElementById('output');
var errorOutput = document.getElementById('errorOutput');
var chart = document.getElementById("chart");

function displayError(error){
  console.log(error);
  errorOutput.innerHTML = 'error: ' + error;
}

noble.on('error', displayError);
noble._bindings.on('error', displayError);

noble.on('stateChange', function(state){
  console.log('state change', state);
});

noble.on('discover', function(peripheral) {
    noble.stopScanning();
    connect(peripheral);
});

function connect(peripheral) {

  var events;
  var mode;
  var feedback;
  var config;
  var points;

  var reset = function(){
    mode.write(new Buffer([0x05]), false);
  }

  var homeMode = function(done){
    mode.write(new Buffer([0x01]), false, done);
  }

  var toPairs = function(dataArray) {
    var pairs = [];
    for (var i = 0; i < dataArray.length; i+=2) {
      var x = dataArray[i];
      var y = dataArray[i+1];
      if((typeof x != 'undefined') && (typeof y != 'undefined'))
      {
        pairs.push([x,y]);
      }
    };
    return pairs;
  }

  var toXY = function(dataArray) {
    var x = ["x"];
    var y = ["y"];
    for (var i = 0; i < dataArray.length; i++) {
      if(i%2){
        y.push(dataArray[i]);
      }else{
        x.push(dataArray[i]);
      }
    };
    return [x,y];
  }



  var processPoints = function(){

    points.read(function(error, data){
      console.log("read points", error, data)
      if(data && Buffer.isBuffer(data)){
        console.log("points", data.toString('hex'));

        var dataArray = new Int8Array(data)
        // console.log(dataArray)

        // var pairs = toPairs(dataArray)
        // console.log(pairs);

        var xy = toXY(dataArray);
        console.log(xy);
        // console.log('[', xy[0].toString(),'],');
        // console.log('[', xy[1].toString(),']');


        chart = c3.generate({
                              data: {
                                  x: 'x',
                                  columns: [
                                  xy[0].slice(0, 2),
                                  xy[0].slice(0, 2)
                                  ],
                                  type: 'scatter'
                              },
                              transition: {
                                  duration: 50
                              },
                              axis: {
                                x: {
                                    max: 50,
                                    min: -50,
                                    padding: {bottom: 0}

                                },
                                y: {
                                    max: 50,
                                    min: -50,
                                    padding: {bottom: 0}
                                }
                              }
                            });


        var position = 2; // greater than the label
        function animate(){


          // console.log('[', xy[0].slice(0, position).toString(),'],');
          // console.log('[', xy[1].slice(0, position).toString(),']');

          chart.load({
              columns: [
                xy[0].slice(0, position),
                xy[1].slice(0, position)
              ]
          });

          position = position + 1;
          if(position>xy[0].length){
            clearInterval(intervalID)
          }
        }

        var intervalID = setInterval(animate, 50)



        // var result = regression('linear', pairs);
        // console.log("regression", result);

        //slope of a horizontal lines is 0
        //slope of vertical approaches infinity
        // vectorize it by looking where it starts and ends.. 
        // feedback.write(new Buffer([0x05]), false);
      }
    });
  }

  var ready = function(error){

    events.subscribe(function(error){
      console.log("subscribed?", error);
      feedback.write(new Buffer([0x05]), false);
        // homeMode(function(error){
        //   console.log("really ready?", error);
        // });
    });

    events.on('data', function(data, isNotification){
      console.log('data', data);

      switch (data.readUInt8(0)) {
        // 0x01 long press? seems like long press takes you out of event(camera) mode back into home mode
        case 0x01:
          // this.emit('longpress');
          break;

        // 0x02 seen on camera screen for a quick touch and relase, takes a picture
        case 0x02:
          // this.emit('event');
          break;

        // 0x03 final release in home mode
        case 0x03:
          // this.emit('touchup');
          processPoints();
          break;

        // 0x05 unsolicited heartbeat?? needs no response as far as I can tell
        case 0x05:
          // this.emit('heartbeat');
          break;

        // 0x0D first touch while in home mode
        case 0x0d:
          // feedback.write(new Buffer([0x05]), false);
          // this.emit('touchdown');
          break;

        default:
          break;
      }
    });
  }

  function discoverService(service, done){
    console.log("discovering service", service.uuid)
    service.discoverCharacteristics([], function(error, characteristics) {
      console.log("found characteristics?", error, "for service", service.uuid);
      characteristics.forEach(function(characteristic){
        console.log("found characteristic", characteristic.uuid)
        if(characteristic.uuid === RING_EVENT_CHARACTERISTIC_UUID){
          events = characteristic;
          console.log("found events");
        }else if(characteristic.uuid === RING_MODE_CHARACTERISTIC_UUID){
          mode = characteristic;
          console.log("found mode");
        }else if(characteristic.uuid === RING_FEEDBACK_CHARACTERISTIC_UUID){
          feedback = characteristic;
          console.log("found feedback");
        }else if(characteristic.uuid === CONFIG_SERVICE_UUID){
          config = characteristic;
          console.log("found config");
        }else if(characteristic.uuid === MOTION_POINTS_CHARACTERISTIC_UUID){
          points = characteristic;
          console.log("found points");
        }
      });
      return done();
    });
  }

  var onDiscoverServices = function(error, services) {
    console.log("found services?", error, services);
    services.forEach(function(service){
      console.log(service.uuid);
    });
    eachSeries(services, discoverService, ready);
  };

  peripheral.on('disconnect', function() {
    console.log("disconnected")
  });

  var onConnect = function(error) {
    console.log("connected?", error);
    peripheral.discoverServices([RING_SERVICE_UUID, MOTION_SERVICE_UUID, RING_SERVICE_UUID], onDiscoverServices);
  };

  peripheral.connect(onConnect);
}


document.getElementById("scanBtn").addEventListener("click", function( event ) {
  try{
    noble.startScanning([RING_SERVICE_UUID, MOTION_SERVICE_UUID, CONFIG_SERVICE_UUID]);
  }catch(error){ displayError(error); }
}, false);
