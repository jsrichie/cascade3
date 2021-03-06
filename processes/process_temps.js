var _ = require("underscore");
var process_temps = {};
var calculatedSumpTemp;
var isOnline;

var SENSOR_OFFLINE_SECONDS = Number(process.env.SENSOR_OFFLINE_SECONDS) || 20;
var TEMP_SENSOR_OVERHEAT_LIMIT = Number(process.env.TEMP_SENSOR_OVERHEAT_LIMIT) || 230; // Degrees F
var SUMP_SENSOR_COUNT = Number(process.env.SUMP_SENSOR_COUNT) || 3;

function create_process_temp(cascade, id, description)
{
    var value_component = cascade.create_component({
        id: id + "_temp",
        name: description,
        units: cascade.UNITS.F,
        group : "Process Temps",
        class: "process_temperature",
        read_only : true,
        type: cascade.TYPES.NUMBER
    });

    var mapper_component = cascade.create_component({
        id: id + "_temp_sensor",
        name: description + " Sensor",
        group : "Process Temps",
        class: "sensor_mapping",
        persist : true,
        type: cascade.TYPES.OPTIONS
    });

    cascade.components.create_mapper_value_pair_for_class(mapper_component, "calibrated_temperature", value_component);
    process_temps[id] = value_component;
}

module.exports.setup = function (cascade) {
    create_process_temp(cascade, "pre_heater", "Preheater Temperature");
    create_process_temp(cascade, "heads", "Heads Temperature");
    create_process_temp(cascade, "hearts", "Hearts Temperature");
    create_process_temp(cascade, "tails", "Tails Temperature");

    for(var index = 1; index <= SUMP_SENSOR_COUNT; index++)
    {
        create_process_temp(cascade, "sump" + index, "Sump Temperature " + index);
    }

    calculatedSumpTemp = cascade.create_component({
        id: "sump_temp",
        name: "Calculated Sump Temperature",
        units: cascade.UNITS.F,
        group : "Process Temps",
        class: "process_temperature",
        read_only : true,
        type: cascade.TYPES.NUMBER
    });

    isOnline = cascade.create_component({
        id: "process_temps_online",
        name: "Process Temps Online",
        group : "Process Temps",
        read_only : true,
        type: cascade.TYPES.BOOLEAN
    });
};

module.exports.loop = function(cascade)
{
    var sumpTemps = [];

    for(var index = 1; index <= SUMP_SENSOR_COUNT; index++)
    {
        sumpTemps.push(process_temps["sump" + index].value);
    }

    calculatedSumpTemp.value = Math.max.apply(this, sumpTemps);

    var failureDetected = false;

    var now = new Date();
    _.each(process_temps, function(sensorComponent){
        var timeDeltaInSeconds = (now - sensorComponent.updated) / 1000;

        if(timeDeltaInSeconds >= SENSOR_OFFLINE_SECONDS)
        {
            failureDetected = true;
            cascade.log_error("Sensor named '" + sensorComponent.name + "' went offline.");
        }

        if(sensorComponent.class === "process_temperature" && sensorComponent.value >= TEMP_SENSOR_OVERHEAT_LIMIT)
        {
            failureDetected = true;
            cascade.log_error("Sensor named '" + sensorComponent.name + "' detected overheating.");
        }
    });

    isOnline.value = !failureDetected;
};