Module.register("MMM-TempHumMQTT", {

    log: function (...args) {
        if (this.config.logging) {
            console.log(args);
        }
    },

    getScripts: function () {
        return [
            //this.file('node_modules/jsonpointer/jsonpointer.js'),
            //'topics_match.js',
            this.file('node_modules/echarts/dist/echarts.js'),
            this.file('node_modules/moment/moment.js')
        ];
    },

    // Default module config
    defaults: {
        mqttServers: [],
        logging: false
    },

    makeServerKey: function (server) {
        return '' + server.address + ':' + (server.port | '1883' + server.user);
    },

    start: function () {
        console.log(this.name + ' started.');
        this.subscriptions = [];

        console.log(this.name + ': Setting up connection to ' + this.config.mqttServers.length + ' servers');

        for (i = 0; i < this.config.mqttServers.length; i++) {
            var s = this.config.mqttServers[i];
            var serverKey = this.makeServerKey(s);
            console.log(this.name + ': Adding config for ' + s.address + ' port ' + s.port + ' user ' + s.user);
            for (j = 0; j < s.subscriptions.length; j++) {
                var sub = s.subscriptions[j];
                let values = {};
                sub.topics.forEach(function(topic) {
                    values[topic] = 0;
                });
                this.subscriptions.push({
                    serverKey: serverKey,
                    label: sub.label,
                    topic: sub.topic,
                    topics: sub.topics,
                    jsonpointer: sub.jsonpointer,
                    values: values,
                    time: Date.now(),
                    maxAgeSeconds: sub.maxAgeSeconds
                });
            }
        }

        this.openMqttConnection();
        var self = this;
    },

    openMqttConnection: function () {
        this.sendSocketNotification('MQTT_CONFIG', this.config);
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === 'MQTT_PAYLOAD') {
            if (payload != null) {
                for (i = 0; i < this.subscriptions.length; i++) {
                    sub = this.subscriptions[i];
                    if (sub.serverKey == payload.serverKey && this.topicsMatch(sub.topic.split("/")[1], payload.topic.split("/")[1])) {
                        var value = payload.value;
                        // Extract value if JSON Pointer is configured
                        if (sub.jsonpointer) {
                            value = get(JSON.parse(value), sub.jsonpointer);
                        }
                        // Round if decimals is configured
                        if (isNaN(sub.decimals) == false) {
                            if (isNaN(value) == false) {
                                value = Number(value).toFixed(sub.decimals);
                            }
                        }
                        let result = payload.topic.split("/")[2];
                        sub.values[result]= value;
                        sub.time = payload.time;
                    }
                }
                this.drawChart();
                //this.updateDom();
            } else {
                console.log(this.name + ': MQTT_PAYLOAD - No payload');
            }
        }
    },

    getStyles: function () {
        return [
            'MQTT-TempHumMQTT.css'
        ];
    },

    isValueTooOld: function (maxAgeSeconds, updatedTime) {
        // console.log(this.name + ': maxAgeSeconds = ', maxAgeSeconds);
        // console.log(this.name + ': updatedTime = ', updatedTime);
        // console.log(this.name + ': Date.now() = ', Date.now());
        if (maxAgeSeconds) {
            if ((updatedTime + maxAgeSeconds * 1000) < Date.now()) {
                return true;
            }
        }
        return false;
    },

    drawChart: function () {
        let humidity = [];
        let temperature = [];
        this.subscriptions.forEach(function (sub) {
                let object_hum = {value: sub.values.humidity, name: sub.label};
                humidity.push(object_hum);

                let object_temp = {value: sub.values.temperature_celsius, name: sub.label};
                temperature.push(object_temp);

            let time_object = document.getElementById(sub.topic);
            time_object.innerHTML = moment(sub.time).format("HH:mm:ss");
        });
        var option = {
            series:[ {
                data: humidity
            }, {
                data: temperature
            }]
        }
        this.humidityChart.setOption(option, false, true);


        //console.log(time_object);
        //this.humidityChart.option.series[0].data = humidity;
        //this.humidityChart.option.series[1].data = temperature;


    },

    getDom: function () {
      self = this;
        var wrapper = document.createElement("div");
        var sub_wrapper1 = document.createElement("div");
        sub_wrapper1.style ="width: 1800px;height:650px";
        sub_wrapper1.id = "humidity";
        
        var sub_wrapper2 = document.createElement("table");
        sub_wrapper2.id = "small";
        wrapper.appendChild(sub_wrapper1);


        if (self.subscriptions.length === 0) {
            wrapper.innerHTML = (self.loaded) ? self.translate("EMPTY") : self.translate("LOADING");
            wrapper.className = "small dimmed";
            console.log(self.name + ': No values');
            return wrapper;
        }
        let humidity = [];
        let temperature = [];
        

        self.subscriptions.forEach(function (sub) {
            let status_wrapper = document.createElement("tr");
            let topic_wrapper = document.createElement("td");
            topic_wrapper.innerHTML = sub.label;
            topic_wrapper.className = "align-left mqtt-label";

            let time_wrapper = document.createElement("td");
            if (sub.values.status === "working") {
                time_wrapper.innerHTML = "läuft";
            } else {
                time_wrapper.innerHTML = "Zuletzt online: " + moment(sub.time).format("HH:mm:ss");    
            }
            
            time_wrapper.className = "align-right mqtt-value" 
            time_wrapper.id = sub.topic;

            status_wrapper.appendChild(topic_wrapper);
            status_wrapper.appendChild(time_wrapper);

            sub_wrapper2.appendChild(status_wrapper);

            if(sub.node_type === "humidity") {
                let object = {value: sub.value, name: sub.label};
                humidity.push(object);
            }
            else {
                let object = {value: sub.value, name: sub.label};
                temperature.push(object);
            }
        });

        this.humidityChart = echarts.init(sub_wrapper1);
                // specify chart configuration item and data
        var option = {
            tooltip : {
                trigger: 'item',
                formatter: "{a} <br/>{b} : {c} ({d}%)"
            },
            series : [
                {
                    type:'pie',
                    radius : [20, 110],
                    center : ['25%', '50%'],
                    roseType : 'area',
                    label: {
                        normal: {
                            show: true,
                            formatter: '{b}: {c}%',

                            textStyle: {
                                fontSize: 20,
                                                            shadowBlur: 20,
                            shadowColor: 'rgba(0, 0, 0, 0.7)'
                            }
                        },
                        emphasis: {
                            show: true
                        }
                    },
                    lableLine: {
                        normal: {
                            show: true
                        },
                        emphasis: {
                            show: false
                        }
                    },
                    data: humidity,
                    itemStyle: {
                        normal: {
                            color: 'rgb(50,100,210)',
                            shadowBlur: 200,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                },
                {
                    type:'pie',
                    radius : [30, 110],
                    center : ['75%', '50%'],
                    roseType : 'area',
                    grid: {
                        show: true
                    },
                    label: {
                        normal: {
                            show: true,
                            formatter: '{b}: {c} °C',

                            textStyle: {
                                fontSize: 20,
                                                            shadowBlur: 20,
                            shadowColor: 'rgba(0, 0, 0, 0.7)',
                            }

                        },
                        emphasis: {
                            show: true
                        }
                    },
                    data:temperature,
                    itemStyle: {
                        normal: {
                            color: 'rgb(210,10,10)',
                            shadowBlur: 200,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                }
            ]                
        };

        // use configuration item and data specified to show chart
        this.humidityChart.setOption(option);

        wrapper.appendChild(sub_wrapper2);
        return wrapper;

    },



    filterToRegex: function(filter) {
        const reg1 = "/^\+$|^\+(?=\/)|(?<=\/)\+(?=\/)|(?<=\/)\+(?=$)/g";
        return filter.replace(reg1, '[^\/]+');
    },

    topicsMatch: function(filter, topic) {
        const reg = new RegExp('^' + this.filterToRegex(filter) + '$');
        match = topic.match(reg);
        return match ? match.length == 1 : false;
    }
    });
