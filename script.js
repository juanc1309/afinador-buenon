// Script para integrar un modelo de Teachable Machine (audio) y actualizar la UI
// 1) Pega la URL de tu modelo de AUDIO (carpeta que contiene model.json)
// 2) Pulsa "Cargar" y luego "Activar micrófono"

const CONFIDENCE_THRESHOLD = 0.4;
const MODEL_URL_STORAGE_KEY = 'tm-audio-model-url';

let model;
let listening = false;

const ui = {
	button: null,
	status: null,
	note: null,
	sub: null,
	dial: null,
	modelInput: null,
	loadButton: null,
};

function cacheUI() {
	ui.button = document.querySelector('.mic-toggle');
	ui.status = document.querySelector('.status');
	ui.note = document.querySelector('.note strong');
	ui.sub = document.querySelector('.note span');
	ui.dial = document.querySelector('.dial');
	ui.modelInput = document.querySelector('.model-url');
	ui.loadButton = document.querySelector('.load-model');
}

function setStatus(message) {
	if (ui.status) ui.status.textContent = message;
}

function setButtonState(label, disabled = false) {
	if (!ui.button) return;
	ui.button.textContent = label;
	ui.button.disabled = disabled;
}

function setLoadState(label, disabled = false) {
	if (!ui.loadButton) return;
	ui.loadButton.textContent = label;
	ui.loadButton.disabled = disabled;
}

function setModelInput(value) {
	if (ui.modelInput) ui.modelInput.value = value;
}

function getModelUrl() {
	return ui.modelInput ? ui.modelInput.value.trim() : '';
}

async function loadTeachableMachineScript() {
	if (window.tmAudio) return;
	return new Promise((resolve, reject) => {
		const s = document.createElement('script');
		s.src = 'https://cdn.jsdelivr.net/npm/@teachablemachine/audio@0.8/dist/teachablemachine-audio.min.js';
		s.onload = () => resolve();
		s.onerror = (e) => reject(e);
		document.head.appendChild(s);
	});
}

async function initModel(modelUrl) {
	if (!modelUrl) {
		setStatus('Necesito una URL válida de tu modelo de audio.');
		return null;
	}

	await loadTeachableMachineScript();
	model = await window.tmAudio.load(modelUrl + 'model.json', modelUrl + 'metadata.json');
	setStatus('Modelo cargado. Pulsa para escuchar tu guitarra.');
	return model;
}

function ensureDialCSS() {
	const styleId = 'tm-needle-style';
	if (document.getElementById(styleId)) return;
	const s = document.createElement('style');
	s.id = styleId;
	s.textContent = `.dial::before { transform: rotate(var(--needle-rotate, -20deg)); transition: transform .15s linear; }`;
	document.head.appendChild(s);
}

function updateDial({ label, probability, classIndex }) {
	if (!ui.note || !ui.sub || !ui.dial) return;

	if (probability >= CONFIDENCE_THRESHOLD) {
		ui.note.textContent = label.toUpperCase();
		ui.sub.textContent = `${Math.round(probability * 100)}%`;
		const baseAngle = -40;
		const perClass = 20;
		const jitter = (probability - CONFIDENCE_THRESHOLD) * 40;
		const angle = baseAngle + classIndex * perClass + jitter;
		ui.dial.style.setProperty('--needle-rotate', `${angle}deg`);
		ui.dial.style.borderColor = '#1aff9c';
	} else {
		ui.note.textContent = '—';
		ui.sub.textContent = 'Esperando...';
		ui.dial.style.setProperty('--needle-rotate', '-20deg');
		ui.dial.style.borderColor = '#1aff9c55';
	}
}

function handlePredictions(preds) {
	if (!Array.isArray(preds) || preds.length === 0) return;
	const ordered = [...preds].sort((a, b) => b.probability - a.probability);
	const top = ordered[0];
	const classIndex = ordered.findIndex(p => p.className === top.className);
	updateDial({ label: top.className, probability: top.probability, classIndex });
}

async function startListening() {
	if (!model) {
		setStatus('Primero carga el modelo.');
		return;
	}
	if (listening) return;
	setButtonState('Escuchando...', true);
	try {
		await model.listen(handlePredictions, {
			includeSpectrogram: false,
			probabilityThreshold: CONFIDENCE_THRESHOLD,
			invokeCallbackOnNoiseAndUnknown: true,
			overlapFactor: 0.5,
		});
		listening = true;
		setButtonState('Detener micrófono');
		setStatus('Micrófono activo. Toca una cuerda.');
	} catch (err) {
		console.error('No se pudo acceder al micrófono:', err);
		setStatus('No pude acceder al micrófono. Revisa permisos del navegador.');
		setButtonState('Activar micrófono');
	}
}

function stopListening() {
	if (!model || !listening) return;
	model.stopListening();
	listening = false;
	setButtonState('Activar micrófono');
	setStatus('Micrófono detenido.');
}

async function handleLoadModel() {
	if (!ui.modelInput) return;
	const modelUrl = getModelUrl();
	if (!modelUrl) {
		setStatus('Pega la URL de tu modelo de audio.');
		return;
	}
	stopListening();
	setLoadState('Cargando...', true);
	setButtonState('Activar micrófono', true);
	try {
		await initModel(modelUrl);
		localStorage.setItem(MODEL_URL_STORAGE_KEY, modelUrl);
		setButtonState('Activar micrófono', false);
	} catch (err) {
		console.error('Error cargando el modelo:', err);
		setStatus('Error al cargar el modelo. Verifica la URL.');
	} finally {
		setLoadState('Cargar', false);
	}
}

function wireControls() {
	if (ui.button) {
		ui.button.addEventListener('click', () => {
			if (listening) {
				stopListening();
			} else {
				startListening();
			}
		});
	}

	if (ui.loadButton) {
		ui.loadButton.addEventListener('click', () => {
			handleLoadModel();
		});
	}

	if (ui.modelInput) {
		ui.modelInput.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				handleLoadModel();
			}
		});
	}
}

function wireModes() {
	const modes = document.querySelectorAll('.mode');
	modes.forEach(m => m.addEventListener('click', () => {
		modes.forEach(x => x.classList.remove('active'));
		m.classList.add('active');
	}));
}

function restoreModelUrl() {
	const saved = localStorage.getItem(MODEL_URL_STORAGE_KEY);
	if (saved) setModelInput(saved);
}

async function boot() {
	cacheUI();
	ensureDialCSS();
	wireModes();
	wireControls();
	restoreModelUrl();
	setButtonState('Activar micrófono', true);
	setLoadState('Cargar', false);
	setStatus('Pega la URL de tu modelo de audio y pulsa “Cargar”.');
}

window.addEventListener('DOMContentLoaded', () => {
	boot();
});

window.addEventListener('beforeunload', () => stopListening());
