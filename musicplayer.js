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
let ridges1 = "paused";
let ridges2 = "paused";


// DOM objects
const xtalBass1 = document.getElementById("xtal-bass-1");
const xtalBass2 = document.getElementById("xtal-bass-2");

const xtalDrums1 = document.getElementById("xtal-drums-1");
const xtalDrums2 = document.getElementById("xtal-drums-2");

const xtalMelody1 = document.getElementById("xtal-melody-1");
const xtalMelody2 = document.getElementById("xtal-melody-2");

// Audio context
const audioContext = new AudioContext();
const audioNodes = [];

const gainNode = audioContext.createGain();
const distortion = audioContext.createWaveShaper();
const biquadFilter = audioContext.createBiquadFilter();

///////////////////////////////////////////////////////
// Main

window.onload = setup; // calls setup() when page loads

//----------------------------------------------------
function setup()
//----------------------------------------------------
{
    // Makes sure audio context is usable
    window.addEventListener("click", () => 
{
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
});

    // Set up tracklist
    trackList[0] = [keys1, keys2, keys3, ridges1, ridges2];
    trackList[1] = document.querySelectorAll("audio");

    // Set up audio context
    trackList[1].forEach(audio => 
    {
        audio.loop = true;
        const track = audioContext.createMediaElementSource(audio);
        track.connect(distortion);
        distortion.connect(biquadFilter);
        biquadFilter.connect(gainNode);
        gainNode.connect(audioContext.destination);

        audioNodes.push(track);
    });
    
    // Debug
    console.log(trackList[0]);
    console.log(trackList[1]);
    console.log(audioNodes);
    console.log(gainNode);

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
        case "Ridges-1":
            buttonsHandler(3);
            break;
        case "Ridges-2":
            buttonsHandler(4);
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

export function applyBiquadFilter(uvX, uvY, state) {
    if (!state) {
        // Disable filter by disconnecting it (if connected) and routing clean audio
        try {
            biquadFilter.disconnect();
        } catch (e) {
            // Filter might not be connected yet – safely ignore
        }

        gainNode.disconnect();
        distortion.connect(gainNode);
        gainNode.connect(audioContext.destination);
        return;
    } else {
        // Connect filter in the chain if not already
        try {
            gainNode.disconnect();
        } catch (e) {}

        try {
            biquadFilter.disconnect();
        } catch (e) {}

        gainNode.connect(biquadFilter);
        biquadFilter.connect(audioContext.destination);

        // Calculate filter values
        const minFreq = 100;
        const maxFreq = 10000;
        const frequency = minFreq * Math.pow(maxFreq / minFreq, uvX);

        const minQ = 0.001;
        const maxQ = 30;
        const q = minQ + (maxQ - minQ) * uvY;

        // Apply to filter
        biquadFilter.type = "lowpass";
        biquadFilter.frequency.setTargetAtTime(frequency, audioContext.currentTime, 0.01);
        biquadFilter.Q.setTargetAtTime(q, audioContext.currentTime, 0.01);
    }
}
