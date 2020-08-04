var API_PORT = 1023;

// Base command function

function command(command, data, port, callback) {
    var sendData = {
        "command":command,
        "kwargs":data
    };
    $.post(
        'http://' + self.location.hostname + ':' + port.toString(),
        sendData,
        callback,
        'json'
    ).fail(function(xhr,status,error){
        $('#no-conn').toggleClass('active',true);
    }).done(function(xhr,status,error){
        if (Object.keys(xhr).includes('code')) {
            if (xhr.code != 200) {
                console.log('Error '+xhr.code+': '+xhr.reason);
            }
        }
        $('#no-conn').toggleClass('active',false);
    });
}

// Session command function

function scmd(cmd,args,callback) {
    for (var a=0;a<args.length;a++) {
        if (whatIsIt(args[a]) == "array") {
            args[a] = toPythonListStr(args[a]);
        }
    }
    command('scmd',{
        'sid':params.get('id'),
        'fingerprint':BrowserFingerprint,
        'command':cmd,
        'args':args.join('|')
    },API_PORT,callback);
}


// Constants

if (getCookie('uid') == '') {
    setCookie('uid',sha256(Math.random().toString()),14);
}

var BrowserFingerprint = getCookie('uid'); // Maintaining client session info with cookies
var params = new URLSearchParams(document.location.search.substring(1)); // Get session id
var previousData = {'null':null}; // Setup for data access
var uType = 'pc'; // User type
var cursor = 'default'; // Cursor type
var currentInitTarget = null;
var sidebarActivating = false;
var messageActivating = false;
var currentDiceHide = undefined;
var obscureInfo = {
    obscuring:false,
    id:null,
    sx:null,
    sy:null,
    w:null,
    h:null,
    pageXS:null,
    pageYS:null
}; // Obscure info maintain
var currentInitiative = null;

/*
    selection arguments:
    allowedUsers|ctxModifiers

    allowedUsers: (comma-sep)
    - pc: Player/User
    - dm: Dungeon Master

    ctxModifiers: (comma-sep)
    - self: User owns this character (pc only)
    - !self: User does not own this character and is not the DM
    - init: It is user's turn in initiative, or it is the turn in the initiative of one of the DM's NPCs
    - !init: It is NOT user's turn in initiative, or it is NOT the turn in the initiative of one of the DM's NPCs
    - in_init: The user's PC or the selected NPC is in the initiative count
    - !in_init: The user's PC or the selected NPC is NOT in the initiative count
    - target_init: It is the target's turn in initiative
    - !target_init: It is NOT the target's turn in initiative
*/
var ctxMenu = { // Selectors to activate custom context menu on
    '.map-container':{
        'map-close':'dm',
        'add-pc':'pc',
        'add-npc':'dm'
    },
    '.pc-icon':{
        'remove-pc':'pc|self',
        'remove-pc-dm':'dm',
        'run-initiative':'pc|!in_init,self',
        'remove-initiative':'pc|in_init,self,!init',
        'set-pc-hp':'pc,dm|self',
        'set-pc-max-hp':'pc,dm|self',
        'change-pc-hp':'pc,dm|self',
        'edit-pc':'pc,dm|self',
        'claim-pc':'pc|!self',
        'attack':'pc|!self,init',
        'dm-attack':'dm|init'
    },
    '.npc-icon':{
        'remove-npc':'dm',
        'run-initiative':'dm|!in_init',
        'remove-initiative':'dm|in_init,!init',
        'attack':'pc|init',
        'dm-attack':'dm|init,!target_init'
    }
}; 

var SCORES = [
    ['str','strength'],
    ['dex','dexterity'],
    ['con','constitution'],
    ['int','intelligence'],
    ['wis','wisdom'],
    ['cha','charisma']
];
var SKILLS = [
    'athletics',
    'acrobatics','sleightOfHand','stealth',
    'arcana','history','investigation','nature','religion',
    'animalHandling','insight','medicine','perception','survival',
    'deception','intimidation','performance','persuasion'
];

var currentCtx = null; // Currently active context menu

var npcData = { // Data for making NPCs
    makingNPC:false,
    map:null,
    pos:[0,0],
    data:null,
    icon:null
};

var iconIndex = {
    'Artificer':'Artificer.png',
    'Barbarian':'Barbarian.png',
    'Bard':'Bard.png',
    'Cleric':'Cleric.png',
    'Druid':'Druid.png',
    'Fighter':'Fighter.png',
    'Monk':'Monk.png',
    'Mystic':'Mystic.png',
    'Paladin':'Paladin.png',
    'Ranger':'Ranger.png',
    'Rogue':'Rogue.png',
    'Sorcerer':'Sorcerer.png',
    'Warlock':'Warlock.png',
    'Wizard':'Wizard.png',
    'Dice':'Unknown.png',
    'Dragon':'Dragon.png',
    'Treasure':'Treasure.png'
};

var sizes = {
    'Tiny':2.5,
    'Small':5,
    'Medium':5,
    'Large':10,
    'Huge':15,
    'Gargantuan':20
};

var localMapData = {};

// Utility functions

function limit(v,_min,_max) { // limit v to min & max
    if (v < _min) {
        return _min;
    } else if (v > _max) {
        return _max;
    } else {
        return v
    }
}

function getmod(score) {
    var modref = {
        '1':-5,
        '2-3':-4,
        '4-5':-3,
        '6-7':-2,
        '8-9':-1,
        '10-11':0,
        '12-13':1,
        '14-15':2,
        '16-17':3,
        '18-19':4,
        '20-21':5,
        '22-23':6,
        '24-25':7,
        '26-27':8,
        '28-29':9,
        '30':10
    }

    for (var k=0;k<Object.keys(modref).length;k++) {
        if (Object.keys(modref)[k].split('-').includes(score.toString())) {
            return modref[Object.keys(modref)[k]];
        }
    }
    return null;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getRandom(min,max) {
    return Math.trunc(Math.random()*(max+min-1))+min;
}

function roundTo(v,interval) { // Round v to nearest interval (ie round 54 to nearest 50 = 50, round 97 to nearest 50 = 100)
    return Math.round(v/interval)*interval;
}

// Code from https://stackoverflow.com/a/11183002
var stringConstructor = "test".constructor;
var arrayConstructor = [].constructor;
var objectConstructor = ({}).constructor;
var numberConstructor = Number(1).constructor;

function whatIsIt(object) {
    if (object === null) {
        return "null";
    }
    if (object === undefined) {
        return "undefined";
    }
    if (object.constructor === stringConstructor) {
        return "string";
    }
    if (object.constructor === numberConstructor) {
        return "number";
    }
    if (object.constructor === arrayConstructor) {
        return "array";
    }
    if (object.constructor === objectConstructor) {
        return "object";
    }
    {
        return null;
    }
}
// End stackoverflow code

function toPythonListStr(l) {
    var output = '[';
    for (var i=0;i<l.length;i++) {
        if (whatIsIt(l[i]) == "number") {
            output += Number(l[i]) + ',';
        } else if (whatIsIt(l[i]) == "array") {
            output += toPythonListStr(l[i]) + ',';
        } else if (whatIsIt(l[i]) == 'object') {
            output += '"'+JSON.stringify(l[i]) + '",';
        } else {
            output += '"'+l[i].toString() + '",';
        }
    }
    if (output.endsWith(',')) {
        output = output.substr(0,output.length-1);
    }
    output += ']';
    return output;
}

function getIcon(path) {
    if (Object.keys(iconIndex).includes(path)) {
        return 'assets/icons/'+iconIndex[path];
    } else {
        return path;
    }
}

function doMapImageClick(event) {
    var e = event.target;
    if ($(e).hasClass('selected')) {
        $(e).toggleClass('selected',false);
    } else {
        $('#maps-area img').toggleClass('selected',false);
        $(e).toggleClass('selected',true);
    }

    if ($('#maps-area img').hasClass('selected')) {
        $('#map-actions').toggleClass('active',true);
    } else {
        $('#map-actions').toggleClass('active',false);
    }
}

function convertMouseToMapPos(id,x,y) {
    var el = document.getElementById(id);
    var data = JSON.parse(el.getAttribute('data'));
    var rect = el.getBoundingClientRect();
    return [(x-rect.left)/el.getAttribute('zoom'),(y-rect.top)/el.getAttribute('zoom')];
}

function saveAs(uri, filename) { // Code from https://stackoverflow.com/a/25715985
    var link = document.createElement('a');
    if (typeof link.download === 'string') {
        link.href = uri;
        link.download = filename;

        //Firefox requires the link to be in the body
        document.body.appendChild(link);
        
        //simulate click
        link.click();

        //remove the link when done
        document.body.removeChild(link);
    } else {
        window.open(uri);
    }
}