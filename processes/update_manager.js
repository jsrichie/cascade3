var exec = require('child_process').exec;

module.exports.setup = function (cascade) {

    var allowSoftwareUpdates = cascade.create_component({
        id: "allow_software_updates",
        name: "Allow Software Updates",
        type: cascade.TYPES.BOOLEAN,
        value: true,
        persist: true
    });

    allowSoftwareUpdates.on("value_updated", function(){
        if(allowSoftwareUpdates.value)
        {
            exec("rm -f", "/data/resin-updates.lock");
        }
        else
        {
            exec("lockfile", "/data/resin-updates.lock");
        }
    });

};