const mqtt = require('mqtt');

var servers = [];
startServer();
    function startServer() {

        console.log("Starting client for: ");

        var self = this;

        var mqttServer = "mqtt://mm.fritz.box";

        console.log(': Connecting to ' + mqttServer);
        let server;

        server = mqtt.connect(mqttServer);

        server.on('error', function (err) {
            console.log(': Error: ' + err);
        });

        server.on('reconnect', function (err) {
            server.value = 'reconnecting'; // Hmmm...
            console.log(' reconnecting');
        });

        server.on('connect', function (connack) {
            console.log(self.name + ' connected to ' + mqttServer);
            console.log(self.name + ': subscribing to ' + server.topics);
            server.subscribe("nodes/ez/+");
        });

        server.on('message', function (topic, payload) {
            //console.log(payload);
            console.log(topic.split("/")[1]);
            console.log(payload[0]);
        });

    }
