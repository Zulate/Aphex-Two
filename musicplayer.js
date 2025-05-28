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
let ridgesLeft = "paused";
let ridgesRight = "paused";
let dx100Left = "paused";
let dx100Right = "paused";

const soundGroups = {
  bass: [0, 1, 2],           // Keys-1, Keys-2, Keys-3
  drums: [3, 4],             // Cube064, Cube098
  melody: [5, 6]             // DX100-left, DX100-right
};

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
    trackList[0] = [keys1, keys2, keys3, ridgesLeft, ridgesRight, dx100Left, dx100Right];
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
        case "Cube064":
            buttonsHandler(3);
            break;
        case "Cube098":
            buttonsHandler(4);
            break;
        case "DX100-left":
            buttonsHandler(5);
            break;
        case "DX100-right":
            buttonsHandler(6);
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
    const state = trackList[0][index];

    // Detect sound group for the clicked index
    const group = getSoundGroup(index);

    if (!group) {
        console.warn("No group found for index", index);
        return;
    }

    // Stop all others in the same group
    soundGroups[group].forEach(i => {
        if (i !== index && trackList[0][i] === "playing") {
            trackList[0][i] = "paused";
            trackList[1][i].pause();
            trackList[1][i].currentTime = 0;
        }
    });

    // Toggle the clicked track's state
    switch (state) {
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

// Apply biquad filter based on UV coordinates
//----------------------------------------------------
export function applyBiquadFilter(uvX, uvY, state) 
//----------------------------------------------------
{
    if (!state) {
        
        biquadFilter.disconnect();
        gainNode.disconnect();
        distortion.connect(gainNode);
        gainNode.connect(audioContext.destination);
        return;
    } else {
        gainNode.disconnect();
        biquadFilter.disconnect();

        gainNode.connect(biquadFilter);
        biquadFilter.connect(audioContext.destination);

        // Calculate filter values
        const minFreq = 500;
        const maxFreq = 4000;
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

// Get sound group based on index
//----------------------------------------------------
function getSoundGroup(index)
//----------------------------------------------------
{
    for (const group in soundGroups) {
        if (soundGroups[group].includes(index)) {
            return group;
        }
    }
    return null;
}
