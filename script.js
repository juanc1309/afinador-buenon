// Script para integrar un modelo de Teachable Machine (audio) y actualizar la UI
// 1) Pon tu URL de modelo de AUDIO en MODEL_URL (carpeta que contiene model.json)
// 2) Abre la página en un navegador y acepta acceso al micrófono
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<title>Test TM Audio</title>
</head>
<body>

<button id="btn">Activar micrófono</button>
<p id="out">Esperando...</p>

<script src="https://cdn.jsdelivr.net/npm/@teachablemachine/audio@0.8/dist/teachablemachine-audio.min.js"></script>
<script>
const URL = "./teach/";
let model, listening = false;

async function loadModel() {
	model = await tmAudio.load(URL + "model.json", URL + "metadata.json");
	console.log("Modelo cargado");
}

async function start() {
	if (listening) return;
	await model.listen(preds => {
		const top = preds.reduce((a,b)=> b.probability>a.probability?b:a);
		document.getElementById("out").textContent =
			top.className + " " + Math.round(top.probability*100)+"%";
	}, { overlapFactor: 0.5 });
	listening = true;
}

document.getElementById("btn").onclick = start;
loadModel();
</script>

</body>
</html>


