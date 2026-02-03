// Script para integrar un modelo de Teachable Machine (imagen) y actualizar la UI
// 1) Pon tu URL de modelo en MODEL_URL (carpeta que contiene model.json)
// 2) Abre la página en un navegador y acepta acceso a la cámara

const MODEL_URL = "PUT_YOUR_MODEL_FOLDER_URL_HERE/"; // ej: https://teachablemachine.withgoogle.com/models/xxxxx/
const CONFIDENCE_THRESHOLD = 0.35; // umbral mínimo para mostrar predicción

let model, webcamStream, videoEl, rafId;

async function loadTeachableMachineScript() {
	if (window.tmImage) return;
	return new Promise((resolve, reject) => {
		const s = document.createElement('script');
		s.src = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.4/dist/teachablemachine-image.min.js';
		s.onload = () => resolve();
		s.onerror = (e) => reject(e);
		document.head.appendChild(s);
	});
}

async function initModel() {
	if (!MODEL_URL || MODEL_URL.includes('PUT_YOUR_MODEL')) {
		console.warn('Teachable Machine: coloca la URL del modelo en MODEL_URL dentro de script.js');
		return;
	}

	await loadTeachableMachineScript();
	model = await window.tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
}

async function startWebcam() {
	stopWebcam();
	videoEl = document.createElement('video');
	videoEl.setAttribute('autoplay', '');
	videoEl.setAttribute('muted', '');
	videoEl.setAttribute('playsinline', '');
	videoEl.style.width = '160px';
	videoEl.style.height = '120px';
	videoEl.style.position = 'absolute';
	videoEl.style.right = '12px';
	videoEl.style.top = '12px';
	videoEl.style.borderRadius = '8px';
	videoEl.style.boxShadow = '0 6px 18px rgba(0,0,0,.6)';
	document.body.appendChild(videoEl);

	try {
		webcamStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
		videoEl.srcObject = webcamStream;
		await videoEl.play();
		predictLoop();
	} catch (err) {
		console.error('No se pudo acceder a la cámara:', err);
	}
}

function stopWebcam() {
	if (rafId) cancelAnimationFrame(rafId);
	if (videoEl) {
		videoEl.pause();
		if (videoEl.parentElement) videoEl.parentElement.removeChild(videoEl);
		videoEl = null;
	}
	if (webcamStream) {
		webcamStream.getTracks().forEach(t => t.stop());
		webcamStream = null;
	}
}

async function predictLoop() {
	if (!model || !videoEl) return;
	try {
		const predictions = await model.predict(videoEl, false);
		handlePredictions(predictions);
	} catch (err) {
		console.error('Error en predict:', err);
	}
	rafId = requestAnimationFrame(predictLoop);
}

function handlePredictions(preds) {
	if (!Array.isArray(preds) || preds.length === 0) return;
	// ordena por probabilidad descendente
	preds.sort((a, b) => b.probability - a.probability);
	const top = preds[0];
	const noteEl = document.querySelector('.note strong');
	const subEl = document.querySelector('.note span');
	const dialNeedle = document.querySelector('.dial');

	if (!noteEl || !subEl || !dialNeedle) return;

	if (top.probability >= CONFIDENCE_THRESHOLD) {
		noteEl.textContent = top.className.toUpperCase();
		subEl.textContent = `${Math.round(top.probability * 100)}%`;
		// animar la aguja del dial según probabilidad y el índice de clase
		const idx = preds.findIndex(p => p.className === top.className);
		const baseAngle = -40; // ángulo mínimo
		const perClass = 20; // separación por clase
		const jitter = (top.probability - CONFIDENCE_THRESHOLD) * 40; // mueve más según confianza
		const angle = baseAngle + idx * perClass + jitter;
		// aplicar rotación a la pseudo-elemento ::before cambiando una variable CSS
		dialNeedle.style.setProperty('--needle-rotate', angle + 'deg');
		// pequeña retroalimentación visual
		dialNeedle.style.borderColor = '#1aff9c';
	} else {
		noteEl.textContent = '—';
		subEl.textContent = 'Esperando...';
		dialNeedle.style.setProperty('--needle-rotate', '-20deg');
		dialNeedle.style.borderColor = '#1aff9c55';
	}
}

function wireModes() {
	const modes = document.querySelectorAll('.mode');
	modes.forEach(m => m.addEventListener('click', () => {
		modes.forEach(x => x.classList.remove('active'));
		m.classList.add('active');
	}));
}

function ensureDialCSS() {
	// inyecta pequeña regla para usar la variable --needle-rotate en el pseudo-elemento
	const styleId = 'tm-needle-style';
	if (document.getElementById(styleId)) return;
	const s = document.createElement('style');
	s.id = styleId;
	s.textContent = `.dial::before { transform: rotate(var(--needle-rotate, -20deg)); transition: transform .15s linear; }`;
	document.head.appendChild(s);
}

async function boot() {
	ensureDialCSS();
	wireModes();
	await initModel();
	if (model) startWebcam();
}

window.addEventListener('DOMContentLoaded', () => {
	boot();
});

window.addEventListener('beforeunload', () => stopWebcam());

