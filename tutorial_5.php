<!DOCTYPE html>
<!-- saved from url=(0059)http://www.jlabstudio.com/webgl/ejemplos/threejs/demo5.html -->
<html><script>(function main() {
    // Create enabled event
    function fireEnabledEvent() {
        // If gli exists, then we are already present and shouldn't do anything
        if (!window.gli) {
            setTimeout(function () {
                var enabledEvent = document.createEvent("Event");
                enabledEvent.initEvent("WebGLEnabledEvent", true, true);
                document.dispatchEvent(enabledEvent);
            }, 0);
        } else {
            //console.log("WebGL Inspector already embedded on the page - disabling extension");
        }
    };

    // Grab the path root from the extension
    document.addEventListener("WebGLInspectorReadyEvent", function (e) {
        var pathElement = document.getElementById("__webglpathroot");
        if (window["gliloader"]) {
            gliloader.pathRoot = pathElement.innerText;
        } else {
            // TODO: more?
            window.gliCssUrl = pathElement.innerText + "gli.all.css";
        }
    }, false);

    // Rewrite getContext to snoop for webgl
    var originalGetContext = HTMLCanvasElement.prototype.getContext;
    if (!HTMLCanvasElement.prototype.getContextRaw) {
        HTMLCanvasElement.prototype.getContextRaw = originalGetContext;
    }
    HTMLCanvasElement.prototype.getContext = function () {
        var ignoreCanvas = this.internalInspectorSurface;
        if (ignoreCanvas) {
            return originalGetContext.apply(this, arguments);
        }

        var result = originalGetContext.apply(this, arguments);
        if (result == null) {
            return null;
        }

        var contextNames = ["moz-webgl", "webkit-3d", "experimental-webgl", "webgl", "3d"];
        var requestingWebGL = contextNames.indexOf(arguments[0]) != -1;
        if (requestingWebGL) {
            // Page is requesting a WebGL context!
            fireEnabledEvent(this);

            // If we are injected, inspect this context
            if (window.gli) {
                if (gli.host.inspectContext) {
                    // TODO: pull options from extension
                    result = gli.host.inspectContext(this, result);
                    // NOTE: execute in a timeout so that if the dom is not yet
                    // loaded this won't error out.
                    window.setTimeout(function() {
                        var hostUI = new gli.host.HostUI(result);
                        result.hostUI = hostUI; // just so we can access it later for debugging
                    }, 0);
                }
            }
        }

        return result;
    };
})();</script><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
		<title>Three.js tutorial - Leccion 05</title>
		
		<script src="three.min.js"></script>
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
		<div id="canvas"><canvas width="500" height="500" style="width: 500px; height: 500px;"></canvas></div>
		<div id="log">Filtros Min: Nearest, Mag: Nearest</div>
		<h2>Controles:</h2>
	    <ul>
	        <li><code>AvPag</code>/<code>RePag</code> Hacer zoom +/-.
	        </li><li>Cursores: Hacen rotar al cubo (cuanto más tiempo las pulses, más rápido girará).
	        </li><li><code>F</code> para cambiar entre los diferentes tipos de filtrado de texturas.
	    </li></ul>
	

</body></html>