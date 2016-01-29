

<!DOCTYPE html>
<html>
	<head>
		<title>Three.js tutorial - Leccion 05</title>
		<meta http-equiv="content-type" content="text/html; charset=utf-8">
		<script src="js/three.min.js"></script>
		<script>
			var TECLA = { AVPAG:false, REPAG:false, ARRIBA:false, ABAJO:false, IZQUIERDA:false, DERECHA:false, F:false };
			var escena;
			var camara;
			var render;
			var cubo;
			var cuboTextura;
			var ultimoTiempo;

			var filtroActivo=0;

			var log;

			function degToRad(degrees) {
				return degrees * Math.PI / 180;
			}

			function iniciarEscena(){
				//Render
				render = new THREE.WebGLRenderer();

				render.setClearColorHex(0x000000, 1);

				var canvasWidth = 500;
				var canvasHeight = 500;
				render.setSize(canvasWidth, canvasHeight);

				document.getElementById("canvas").appendChild(render.domElement);

				//Escena
				escena = new THREE.Scene();

				//Camara
				camara = new THREE.PerspectiveCamera(45, canvasWidth / canvasHeight, 0.1, 100);
				camara.position.set(0, 0, 0);
				camara.lookAt(escena.position);
				escena.add(camara);

				//Cubo
				cuboTextura = new THREE.ImageUtils.loadTexture("img/crate.gif");
				cuboTextura.minFilter = THREE.NearestFilter;
    			cuboTextura.magFilter = THREE.NearestFilter;
    			log.innerHTML="Filtros Min: Nearest, Mag: Nearest";


				var cuboMaterial = new THREE.MeshBasicMaterial({ map:cuboTextura, side:THREE.DoubleSide });
				
				var cuboGeometria = new THREE.CubeGeometry(2.5, 2.5, 2.5);

				cubo = new THREE.Mesh(cuboGeometria, cuboMaterial);
				cubo.position.set(0.0, 0.0, -7.0);

				cubo.velocidadX = 0;
				cubo.velocidadY = 0;

				escena.add(cubo);
			}
			function renderEscena(){
				render.render(escena, camara);
			}
			function animarEscena(){
				var delta=(Date.now()-ultimoTiempo)/1000;
    			if (delta>0)
    			{
    				if (TECLA.ARRIBA) cubo.velocidadX-=2*delta;
    				if (TECLA.ABAJO) cubo.velocidadX+=2*delta;
    				if (TECLA.IZQUIERDA) cubo.velocidadY-=2*delta;
    				if (TECLA.DERECHA) cubo.velocidadY+=2*delta;

    				if (TECLA.REPAG) cubo.position.z-=10*delta;
    				if (TECLA.AVPAG) cubo.position.z+=10*delta;

    				if (TECLA.F)
    				{
    					filtroActivo=(filtroActivo+1)%3;
    					switch (filtroActivo)
    					{
    						case 0:
    							cuboTextura.minFilter = THREE.NearestFilter;
    							cuboTextura.magFilter = THREE.NearestFilter;
    							log.innerHTML="Filtros Min: Nearest, Mag: Nearest";
    							break;
    						case 1:
    							cuboTextura.minFilter = THREE.LinearFilter;
    							cuboTextura.magFilter = THREE.LinearFilter;
    							log.innerHTML="Filtros Min: Linear, Mag: Linear";
    							break;
    						case 2:
    							cuboTextura.minFilter = THREE.LinearMipMapNearestFilter;
    							cuboTextura.magFilter = THREE.LinearFilter;
    							log.innerHTML="Filtros Min: MipMap, Mag: Linear";
    							break;
    					}
    					cuboTextura.needsUpdate = true;
    					TECLA.F = false;
    				}

    				cubo.rotation.x += cubo.velocidadX * delta;
            		cubo.rotation.y += cubo.velocidadY * delta;

    				renderEscena();
    			}
    			ultimoTiempo=Date.now();
				requestAnimationFrame(animarEscena);
			}
			function teclaPulsada(e)
			{
				switch (e.keyCode)
				{
					case 33: //Av página
						TECLA.AVPAG=true;
						break;
					case 34: // Re página
						TECLA.REPAG=true;
						break;
					case 37: // Izquierda
						TECLA.IZQUIERDA=true;
						break;
					case 39: // Derecha
						TECLA.DERECHA=true;
						break;
					case 38: // Arriba
						TECLA.ARRIBA=true;
						break;
					case 40: // Abajo
						TECLA.ABAJO=true;
						break;
				}

			}
			function teclaSoltada(e)
			{
				switch (e.keyCode)
				{
					case 33: //Av página
						TECLA.AVPAG=false;
						break;
					case 34: // Re página
						TECLA.REPAG=false;
						break;
					case 37: // Izquierda
						TECLA.IZQUIERDA=false;
						break;
					case 39: // Derecha
						TECLA.DERECHA=false;
						break;
					case 38: // Arriba
						TECLA.ARRIBA=false;
						break;
					case 40: // Abajo
						TECLA.ABAJO=false;
						break;
					case 70: // F
						TECLA.F=true;
						break;
				}
			}
		
			
			
			function webGLStart() {
    log = document.getElementById("log");

    iniciarEscena();
    ultimoTiempo=Date.now();

    document.onkeydown=teclaPulsada;
    document.onkeyup=teclaSoltada;

    animarEscena();
}
		</script>
	</head>
	<body onload="webGLStart();">
		<div id="canvas"></div>
		<div id="log"></div>
		<h2>Controles:</h2>
	    <ul>
	        <li><code>AvPag</code>/<code>RePag</code> Hacer zoom +/-.
	        <li>Cursores: Hacen rotar al cubo (cuanto más tiempo las pulses, más rápido girará).
	        <li><code>F</code> para cambiar entre los diferentes tipos de filtrado de texturas.
	    </ul>
	</body>
</html>
