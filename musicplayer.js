let currentBeat = 0;
let trackList = [[], []];

const xtalBass = document.getElementById("xtal-bass");
const xtalDrums = document.getElementById("xtal-drums");
const xtalMelody = document.getElementById("xtal-melody");

const playxtalBass = document.getElementById("play-xtal-bass");
const playxtalDrums = document.getElementById("play-xtal-drums");
const playxtalMelody = document.getElementById("play-xtal-melody");

playxtalBass.addEventListener("click", () => buttonsHandler(playxtalBass));
playxtalDrums.addEventListener("click", () => buttonsHandler(playxtalDrums));
playxtalMelody.addEventListener("click", () => buttonsHandler(playxtalMelody));

trackList[0] = document.querySelectorAll("button");
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

function buttonsHandler(button)
{
    switch(button.dataset.state) {
        case "paused":
            button.dataset.state = "waiting";
            button.innerHTML = "Waiting";
            break;
        case "waiting":
            button.dataset.state = "paused";
            button.innerHTML = "Play";
            break;
        case "playing":
            button.dataset.state = "paused";
            button.innerHTML = "Play";
            break;
        default:
            console.log("buttonHandler error!");
            break;
    }
}

function playerHandler(button, index) {
    const audio = trackList[1][index];

    switch (button.dataset.state) {
        case "paused":
            audio.pause();
            audio.currentTime = 0;
            button.dataset.state = "paused";
            break;

        case "waiting":
            audio.currentTime = 0; // sync start
            audio.play();
            button.dataset.state = "playing";
            button.innerHTML = "Pause";
            break;

        case "playing":
            // Don't do anything! Avoid replaying or desync
            break;

        default:
            console.log("playerHandler error!");
            break;
    }
}
