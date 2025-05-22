///////////////////////////////////////////////////////
// File: musicplayer.js
// Working: Iacopo Turano
// 
// Description: manages music player system,
//              recieves input from 3d scene
//              and plays the corresponding sound
//
///////////////////////////////////////////////////////
//
// ToDo: - Tidy up code (done)
//       - Add more samples
//       - Fix audio sync
//
///////////////////////////////////////////////////////

///////////////////////////////////////////////////////
// Global variables

// Player variables
let currentBeat = 0;
let trackList = [[], []];

// 3D scene inputs 
let keys1 = "paused";
let keys2 = "paused";
let keys3 = "paused";

// DOM objects
const xtalBass = document.getElementById("xtal-bass");
const xtalDrums = document.getElementById("xtal-drums");
const xtalMelody = document.getElementById("xtal-melody");

///////////////////////////////////////////////////////
// Main

window.onload = setup; // calls setup() when page loads

//----------------------------------------------------
function setup()
//----------------------------------------------------
{
     // Set up tracklist
    trackList[0] = [keys1, keys2, keys3];
    trackList[1] = document.querySelectorAll("audio");

    // Set loop for each audio
    trackList[1].forEach(audio => audio.loop = true);

    // Debug
    console.log(trackList[0]);
    console.log(trackList[1]);

    // Fire loop
    setInterval(loop, bpmToMilliseconds(115));
}

//----------------------------------------------------
function loop()
//----------------------------------------------------
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

///////////////////////////////////////////////////////
// Functions

// Convert BPM to milliseconds
//----------------------------------------------------
function bpmToMilliseconds(bpm)
//----------------------------------------------------
{
    return 60000 / bpm;
}

// Get 3D scene input
//----------------------------------------------------
export function buttonsReader(button)
//----------------------------------------------------
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

// Buttons state machine
//----------------------------------------------------
function buttonsHandler(index) 
//----------------------------------------------------
{
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

// Music player manager
//----------------------------------------------------
function playerHandler(buttonState, index) 
//----------------------------------------------------
{
    const audio = trackList[1][index];

    switch(buttonState) {
        case "paused":
            audio.pause();
            audio.currentTime = 0;
            trackList[0][index] = "paused";
            break;

        case "waiting":
            audio.currentTime = 0;
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