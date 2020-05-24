/**
 * KeeWeb plugin: external-selection-menu
 * @author Benjamin
 * @license MIT
 */

const Logger = require('util/logger');
const logger = new Logger.Logger('external-selection-menu');

const launcher = require('comp/launcher');
const Launcher = launcher.Launcher;

const autoType = require('auto-type/index.js')
const originalProcessEventWithFilter = autoType.AutoType.processEventWithFilter; /* Preserve original method for uninstall */

const selectView = require('views/auto-type/auto-type-select-view.js');
const AutoTypeSelectView = selectView.AutoTypeSelectView;

// Function to pad number with leading zeroes
function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}


// Command to execute
let cmd = 'dmenu';
let args = ['-c'];

// Overwrite processEventWithFilter function
autoType.AutoType.processEventWithFilter = function (evt) {
    // Default code for when a matching entry can be found without having to select one
    //
    const initEntries = evt.filter.getEntries(); if (initEntries.length === 1 && AppSettingsModel.directAutotype) {
        this.hideWindow(() => {
            autoType.AutoType.runAndHandleResult({ entry: initEntries[0] }, evt.windowInfo.id);
        });
        return;
    }
    // Custom code replacing the selection menu
    //
    evt.filter.ignoreWindowInfo = true; /* Set filter to ignore windowInfo */
    this.selectEntryView = new AutoTypeSelectView({ filter: evt.filter }); /* Create new AutoTypeSelectView to gain access to entries */
    const entries = this.selectEntryView.model.filter.getEntries(); /* Get all entries from selectEntryView */
    this.selectEntryView = null; /* Remove selectEntryView */

    this.data = ""; /* Init data string, will be used as stdin for the command */

    // Loop over all entries and add information from that entry to the data string
    for (var i = 0, len = entries.length; i < len; i++) {
        this.data += pad([i], 3) + ": " + entries[i].title + " - " + entries[i].user + " - " + entries[i].url + " - " + entries[i].tags + "\n";
    }
    // Spawn a new command (dmenu)
    Launcher.spawn({
        cmd: cmd,
        args: args,
        data: this.data,
        complete: (err, stdout, code) => {
            if (err) {
                delete entries; /* Remove entries */
                return;
            }
            // Callback function
            const cb = function () {
                let i = parseInt(stdout.split(":")[0], 10); /* From selection, get everything up to the first : (This will be the index of the entry) and parse it to an int to remove leading zeroes */
                autoType.AutoType.runAndHandleResult({ entry: entries[i] }, evt.windowInfo.id); /* runAndHandleResult with the selected entry */
                delete entries; /* Remove entries */
            };
            cb(err, stdout, code);
        }
    });
    return;
};



module.exports.getSettings = function() {
    return [
        {
            name: 'External menu command',
            label: 'Command to be run every time the selection menu comes up',
            type: 'text',
            maxlength: 50,
            placeholder: '',
            value: 'dmenu'
        },
        {
            name: 'External menu command arguments',
            label: 'Arguments to give to the command',
            type: 'text',
            maxlength: 50,
            placeholder: '',
            value: '-c'
        }
    ];
};

module.exports.setSettings = function(changes) {
    if (changes['External menu command'])
    {
        cmd = changes['External menu command'];
    }
    if (changes['External menu command arguments'])
    {
        args = changes['External menu command arguments'].split(" ");
    }
    logger.info('Menu command changed to: ' + cmd + ' ' + args);
};

module.exports.uninstall = function() {
    delete autoType.AutoType.processEventWithFilter;
    autoType.AutoType.processEventWithFilter = originalProcessEventWithFilter;

};
