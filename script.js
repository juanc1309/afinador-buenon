const URL = "./teachablemachine.withgoogle.com/models/5BldbJJCs//"; // carpeta donde está model.json

let model;
let isListening = false;

// elementos del DOM
const noteText = document.querySelector(".note strong");
const statusText = document.querySelector(".note span");

async function loadModel() {
  model = await tmAudio.load(
    URL + "model.json",
    URL + "metadata.json"
  );
  console.log("Modelo cargado");
  statusText.textContent = "READY";
}

// activar micrófono y escuchar
async function startListening() {
  if (isListening) return;

  await model.listen(predictions => {
    const topPrediction = predictions.reduce((a, b) =>
      b.probability > a.probability ? b : a
    );

    // mostrar nota detectada
    noteText.textContent = topPrediction.className;
    statusText.textContent =
      Math.round(topPrediction.probability * 100) + "%";
  }, {
    overlapFactor: 0.5,
    invokeCallbackOnNoiseAndUnknown: true
  });

  isListening = true;
}

// ⚠️ esto fuerza el permiso del micrófono
async function init() {
  await loadModel();
  await startListening();
}

// arrancar al cargar la página
window.addEventListener("click", init, { once: true });
