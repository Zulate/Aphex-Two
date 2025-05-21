let currentBeat = 0;
let trackList = [[], []];

// Buttons 
let keys1 = "paused";
let keys2 = "paused";
let keys3 = "paused";

const xtalBass = document.getElementById("xtal-bass");
const xtalDrums = document.getElementById("xtal-drums");
const xtalMelody = document.getElementById("xtal-melody");

/*
const playxtalBass = document.getElementById("play-xtal-bass");
const playxtalDrums = document.getElementById("play-xtal-drums");
const playxtalMelody = document.getElementById("play-xtal-melody");


playxtalBass.addEventListener("click", () => buttonsHandler(playxtalBass));
playxtalDrums.addEventListener("click", () => buttonsHandler(playxtalDrums));
playxtalMelody.addEventListener("click", () => buttonsHandler(playxtalMelody));
*/

trackList[0] = [keys1, keys2, keys3];
trackList[1] = document.querySelectorAll("audio");

trackList[1].forEach(audio => audio.loop = true);

console.log(trackList[0]);
console.log(trackList[1]);

window.onload = setup;

function setup()
{
    setInterval(loop, bpmToMilliseconds(115));
}

function loop()
{  
    if(currentBeat == 1) {
        trackList[0].forEach(playerHandler);
        currentBeat++;
    } else {
        if(currentBeat == 4) {
            currentBeat = 1;
        } else {
            currentBeat++;
        }
    }
}

function bpmToMilliseconds(bpm)
{
    return 60000 / bpm;
}

// Get clicked mesh from scene
// This is fucking stupid, but scene code structure forces me to do this
export function buttonsReader(button)
{
    console.log(button); // use to check correct name of button clicked
    
    switch(button) {
        case "Keys-1":
            buttonsHandler(0);
            break;
        case "Keys-2":
            buttonsHandler(1);
            break;
        case "Keys-3":
            buttonsHandler(2);
            break;
        default:
            console.log("buttonsReader error!");
            break;
    }
}

// Originally used to manage buttons state
// Too bad I guess
function buttonsHandler(index) {
    let state = trackList[0][index];

    switch(state) {
        case "paused":
            trackList[0][index] = "waiting";
            break;
        case "waiting":
            trackList[0][index] = "playing";
            break;
        case "playing":
            trackList[0][index] = "paused";
            break;
        default:
            console.log("buttonHandler error!");
            break;
    }
}


function playerHandler(buttonState, index) {
    const audio = trackList[1][index];

    switch(buttonState) {
        case "paused":
            audio.pause();
            audio.currentTime = 0;
            trackList[0][index] = "paused";
            break;

        case "waiting":
            audio.currentTime = 0; // sync start
            audio.play();
            trackList[0][index] = "playing";
            break;

        case "playing":
            break;

        default:
            console.log("playerHandler error!");
            break;
    }
}