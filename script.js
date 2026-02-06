const MODEL_URL = "https://teachablemachine.withgoogle.com/models/5BldbJJCs/";

let model;
let listening = false;

const button = document.querySelector(".mic-toggle");
const status = document.querySelector(".status");
const note = document.querySelector(".note strong");
const sub = document.querySelector(".note span");
const dial = document.querySelector(".dial");

async function loadModel() {
	const script = document.createElement("script");
	script.src = "https://cdn.jsdelivr.net/npm/@teachablemachine/audio@0.8/dist/teachablemachine-audio.min.js";
	document.head.appendChild(script);

	await new Promise(r => script.onload = r);

	await navigator.mediaDevices.getUserMedia({ audio: true });

	model = await tmAudio.load(
		MODEL_URL + "model.json",
		MODEL_URL + "metadata.json"
	);

	status.textContent = "Modelo listo. Activa el micrófono.";
}

function updateUI(pred) {
	note.textContent = pred.className;
	sub.textContent = Math.round(pred.probability * 100) + "%";
	const angle = (pred.probability - 0.5) * 120;
	dial.style.setProperty("--needle-rotate", `${angle}deg`);
}

async function start() {
	if (listening) return;

	await model.listen(preds => {
		const top = preds.reduce((a, b) =>
			b.probability > a.probability ? b : a
		);
		updateUI(top);
	}, { overlapFactor: 0.5 });

	listening = true;
	button.textContent = "Detener micrófono";
	status.textContent = "Escuchando...";
}

function stop() {
	model.stopListening();
	listening = false;
	button.textContent = "Activar micrófono";
	status.textContent = "Micrófono detenido";
}

button.onclick = () => listening ? stop() : start();

loadModel();
