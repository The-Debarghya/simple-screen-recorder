const { desktopCapturer, remote } = require('electron');

const { writeFile } = require('fs');

const { dialog, Menu } = remote;


let mediaRecorder; // MediaRecorder instance to capture footage
let recordedChunks = [];


const videoElement = document.querySelector('video');

const startBtn = document.getElementById('startBtn');
startBtn.onclick = e => {
  mediaRecorder.start();
  startBtn.classList.add('is-danger');
  startBtn.innerText = 'Recording';
};

const stopBtn = document.getElementById('stopBtn');

stopBtn.onclick = e => {
  mediaRecorder.stop();
  startBtn.classList.remove('is-danger');
  startBtn.innerText = 'Start';
};

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

// Get the available video sources
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map(source => {
      return {
        label: source.name,
        click: () => selectSource(source)
      };
    })
  );


  videoOptionsMenu.popup();
}

// Change the videoSource window to record
async function selectSource(source) {

  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id
      }
    }
  };

  // Create a Stream
  const videostream = await navigator.mediaDevices.getUserMedia(constraints);
  const audiostream = await navigator.mediaDevices.getUserMedia({video:false,audio:true});
  
  [videoTrack] = videostream.getVideoTracks();
  [audioTrack] = audiostream.getAudioTracks();
  var stream = new MediaStream([videoTrack, audioTrack]);

  // View the source in a video element
  videoElement.srcObject = stream;
  videoElement.play();
  videoElement.muted = true;

  // Create the Media Recorder
  const options = { mimeType: 'video/webm; codecs=vp9' };
  mediaRecorder = new MediaRecorder(stream, options);

  // Setup Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;

}

// Captures all recorded chunks
function handleDataAvailable(e) {
  console.log('video data available');
  recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: 'video/webm; codecs=vp9'
  });

  const buffer = Buffer.from(await blob.arrayBuffer());

  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defaultPath: `vid-${Date.now()}.webm`
  });

  if (filePath) {
    writeFile(filePath, buffer, () => console.log('video saved successfully!'));
  }
  recordedChunks = [];
}
