function ActionFlow(flow) {

    var BOX_WIDTH = 825,
        BOX_HEIGHT = 188,
        X_OFFSET = -312, //Because lines don't come from the center
        ROW_SPACING = 350,
        COLUMN_SPACING = 900,
        HEADER_WIDTH = 825,
        HEADER_HEIGHT = 238;

    var self = this;

    var used = [];

    var objectsFlow = {
            mesh : [],
            position :{
                target : [],
                origin : []
            } 
    },
        objectsStep = {
            mesh : [],
            position :{
                target : [],
                origin : []
            }
    };

    this.flow = flow || [];

    this.action = false;

    this.objects = objectsFlow.mesh;

    this.positions = objectsFlow.position;

    initFlow();

    var onClick = function(target) {

        if(window.actualView === 'workflows'){
            window.flowManager.onElementClickHeaderFlow(target.userData.id);
            self.action = true;
        }
    };

    // Public method

    /**
     * Draws the flow
     * @lastmodifiedBy Emmanuel Colina
     * @lastmodifiedBy Ricardo Delgado
     * @param   {Number}  initialX Position where to start
     * @param   {Number}  initialY Position where to start
     */
    this.draw = function(initialX, initialY, initialZ, indice, id) {

        var title = createTitleBox(self.flow.name, self.flow.desc),
            origin = window.helper.getOutOfScreenPoint(0),
            target = new THREE.Vector3(initialX, initialY + window.TILE_DIMENSION.height * 2, initialZ);

        title.userData = {
                id: id,
                onClick : onClick
        };

        objectsFlow.position.origin.push(origin);
        objectsFlow.position.target.push(target);

        title.position.copy(origin);

        objectsFlow.mesh.push(title);

        window.scene.add(title);

        if (indice === 0){

            for(var i = 0, l = self.flow.steps.length; i < l; i++){
                self.drawTree(self.flow.steps[i], initialX + COLUMN_SPACING * i, initialY, 0);
            }

            new TWEEN.Tween(this)
                .to({}, 8000)
                .onUpdate(window.render)
                .start();

            self.showAllFlow();
            self.showSteps();
        }

        else if (indice === 1){
            self.showAllFlow();
        }
    };

    /**
     * @author Miguel Celedon
     * @lastmodifiedBy Ricardo Delgado
     * @lastmodifiedBy Emmanuel Colina
     * Recursively draw the flow tree
     * @param {Object} root The root of the tree
     * @param {Number} x    X position of the root
     * @param {Number} y    Y position of the root
     */

    this.drawTree = function(root, x, y, z) {

        var TYPE = {
            async : 0xFF0000,
            direct: 0x0000FF
        };

        if (typeof root.drawn === 'undefined'){


            drawStep(root, x, y, z);

            var childCount = root.next.length,
                startX = x - 0.5 * (childCount - 1) * COLUMN_SPACING;

            if (childCount !== 0){

                var color = TYPE[root.next[0].type];

                if(root.next[0].type === "direct call")
                    color = (color !== undefined) ? color : TYPE.direct;
                else
                    color = (color !== undefined) ? color : TYPE.async;

                var lineGeo,
                    lineMat, 
                    rootPoint,
                    rootLine,
                    origin;           

                lineGeo = new THREE.BufferGeometry();

                lineMat = new THREE.LineBasicMaterial({color : color}); 

                rootPoint = new THREE.Vector3(x + X_OFFSET, y - ROW_SPACING / 2, -1);

                var vertexPositions = [
                    [x + X_OFFSET, y, -1],
                    [ x + X_OFFSET, y - ROW_SPACING / 2, -1]
                ];
                
                var vertices = new Float32Array( vertexPositions.length * 3 );

                for ( var j = 0; j < vertexPositions.length; j++ )
                {
                    vertices[ j*3 + 0 ] = vertexPositions[j][0];
                    vertices[ j*3 + 1 ] = vertexPositions[j][1];
                    vertices[ j*3 + 2 ] = vertexPositions[j][2];
                }

                lineGeo.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

                rootLine = new THREE.Line(lineGeo, lineMat);
                origin = helper.getOutOfScreenPoint(-1);
                rootLine.position.copy(origin);
                objectsStep.position.origin.push(origin);
                objectsStep.position.target.push(new THREE.Vector3(0, 0, 0));

                objectsStep.mesh.push(rootLine);
                window.scene.add(rootLine);

                var nextX, 
                    nextY, 
                    childLine, 
                    child, 
                    i, 
                    isLoop, 
                    nextZ = z;

                for(i = 0; i < childCount; i++) {

                    child = getStep(root.next[i].id);
                    isLoop = (typeof child.drawn !== 'undefined');


                    nextX = startX + i * COLUMN_SPACING;

                    if(isLoop) {

                        var gradient = new THREE.Color(color);

                        gradient.r = Math.max(gradient.r, 0.5);
                        gradient.g = Math.max(gradient.g, 0.5);
                        gradient.b = Math.max(gradient.b, 0.5); 

                        lineMat = new THREE.LineBasicMaterial({color : gradient.getHex()}); //gradient
                        nextY = child.drawn.y;

                        if(nextX !== rootPoint.x && colides(nextX, root)) {
                            nextX += (childCount + 1) * COLUMN_SPACING;
                        }
                    }
                    else {
                        lineMat = new THREE.LineBasicMaterial({color : color});
                        nextY = y - ROW_SPACING;
                    }

                    lineGeo = new THREE.Geometry();
                    lineGeo.vertices.push(
                            rootPoint,
                            new THREE.Vector3(nextX + X_OFFSET, rootPoint.y, -1),
                            new THREE.Vector3(nextX + X_OFFSET, nextY, -1)
                        );

                    if(isLoop) {

                        lineGeo.vertices[2].setY(nextY + ROW_SPACING * 0.25);

                        lineGeo.vertices.push(
                            new THREE.Vector3(child.drawn.x + X_OFFSET, child.drawn.y + ROW_SPACING * 0.25, -1)
                        );
                    }

                    childLine = new THREE.Line(lineGeo, lineMat);
                    //childLine.position.z = 80000;

                    origin = helper.getOutOfScreenPoint(-1);
                    childLine.position.copy(origin);
                    objectsStep.position.origin.push(origin);
                    objectsStep.position.target.push(new THREE.Vector3(0, 0, 0));

                    objectsStep.mesh.push(childLine);
                    window.scene.add(childLine);

                    self.drawTree(child, nextX, nextY, nextZ);
                }
            }
        }
    };
    
    /**
     * @author Emmanuel Colina
     * @lastmodifiedBy Ricardo Delgado
     * Takes away all the tiles except the one with the id
     */
    this.letAloneHeaderFlow = function() {

        animateFlows('steps', 'origin', false);

        animateFlows('flow', 'origin', true);
    };

    /**
     * @author Ricardo Delgado
     * Displays all flow in the table.
     */
    this.showAllFlow = function() {

        animateFlows('flow', 'target', true, 2500);
    };

    /**
     * @author Ricardo Delgado
     * It shows all the steps of the flow.
     */
    this.showSteps = function() {

        animateFlows('steps', 'target', true, 3000);
    };

    /**
     * @author Ricardo Delgado.
     * Deletes all objects related to the flow.
     */
    this.deleteAll = function() {

        animateFlows('steps', 'origin', false);
        animateFlows('flow', 'origin', false);  
    };

    /**
     * @author Ricardo Delgado.
     * Deletes all step related to the flow.
     */    
    this.deleteStep = function() {

        window.tileManager.letAlone();
        animateFlows('steps', 'origin', false, 3000);
    };

    //Private methods

    /**
     * @lastmodifiedBy Ricardo Delgado
     * Draws a single step
     * @param {Object} node The information of the step
     * @param {Number} x    X position
     * @param {Number} y    Y position
     */
    function drawStep(node, x, y, _z) {

        var z = _z || 0,
            tile,
            stepBox,
            origin,
            target,
            tilePosition = new THREE.Vector3(x - 108, y - 2, z + 1);

        if(node.element !== -1) {

            if(typeof used[node.element] !== 'undefined') {

                tile = window.objects[node.element].clone();
                tile.isClone = true;

                objectsStep.position.origin.push(window.helper.getOutOfScreenPoint(1));
                objectsStep.position.target.push(tilePosition);

                objectsStep.mesh.push(tile);
                window.scene.add(tile);
            }
            else {

                tile = window.objects[node.element];
                used[node.element] = true;

                new TWEEN.Tween(tile.position)
                .to({x : tilePosition.x, y : tilePosition.y, z : tilePosition.z}, 7000)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();
            }


        }

        stepBox = createStepBox(node);

        origin = window.helper.getOutOfScreenPoint(0);

        target = new THREE.Vector3(x, y, z);

        objectsStep.position.origin.push(origin);
        objectsStep.position.target.push(target);

        stepBox.position.copy(origin);

        objectsStep.mesh.push(stepBox);
        scene.add(stepBox);

        node.drawn = {
            x : x,
            y : y
        };
    }

    /**
     * Check if the line collides a block
     * @param   {Number}  x    Position to check
     * @param   {Object}  from Object where the line starts
     * @returns {Boolean} true if collision is detected
     */

    function colides(x, from) {

        var actual;

        for(var i = 0; i < self.flow.steps.length; i++) {
            actual = self.flow.steps[i];

            if(actual.drawn && actual.drawn.x === x && actual !== from) return true;
        }

        return false;
    }


    /**
     * @author Miguel Celedon
     * Creates a flow box and when texture is loaded, calls fillBox
     * @param   {String}     src     The texture to load
     * @param   {Function}   fillBox Function to call after load, receives context and image
     * @returns {THREE.Mesh} The created plane with the drawed texture
     */
    function createFlowBox(src, fillBox, width, height) {

        var canvas = document.createElement('canvas');
        canvas.height = height;
        canvas.width = width;
        var ctx = canvas.getContext('2d');
        var size = 12;
        ctx.fillStyle = '#FFFFFF';

        var image = document.createElement('img');
        var texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.LinearFilter;

        ctx.font = size + 'px Arial';

        image.onload = function() {
            fillBox(ctx, image);
            texture.needsUpdate = true;
        };

        image.src = src;

        var mesh = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(width, height),
            new THREE.MeshBasicMaterial({color : 0xFFFFFF, map : texture, transparent : true})
        );

        return mesh;
    }

    /**
     * Creates a single step box
     * @param {Object} node The node to draw
     * @author Miguel Celedon
     */
    function createStepBox(node) {

        var fillBox = function(ctx, image) {

            ctx.drawImage(image, 0, 0);

            //ID
            var Nodeid = parseInt(node.id) + 1;
            Nodeid = (Nodeid < 10) ? '0' + Nodeid.toString() : Nodeid.toString();

            var size = 83;
            ctx.font = size + 'px Arial';
            ctx.fillStyle = '#000000';
            window.helper.drawText(Nodeid, 57, 130, ctx, 76, size);
            ctx.fillStyle = '#FFFFFF';

            //Title
            size = 18;
            ctx.font = 'bold ' + size + 'px Arial';
            window.helper.drawText(node.title, 421, 59, ctx, 250, size);

            //Description
            size = 12;
            ctx.font = size + 'px Arial';
            window.helper.drawText(node.desc, 421, 114, ctx, 250, size);
        };

        return createFlowBox('images/workflow/stepBox.png', fillBox, BOX_WIDTH, BOX_HEIGHT);
    }

    /**
     * Creates the title box
     * @param {String} title The title of the box
     * @param {String} desc  The description of the whole process
     * @author Miguel Celedon
     */
    function createTitleBox(title, desc) {

        var fillBox = function(ctx, image) {

            ctx.drawImage(image, 0, 0);

            //Title
            var size = 24;
            ctx.font = 'bold ' + size + 'px Arial';
            window.helper.drawText(title, 190, 61, ctx, 400, size);

            //Description
            size = 17;
            ctx.font = size + 'px Arial';
            window.helper.drawText(desc, 190, 126, ctx, 550, size);
        };

        return createFlowBox('images/workflow/titleBox.png', fillBox, HEADER_WIDTH, HEADER_HEIGHT);
    }

    /**
     * @author Ricardo Delgado.
     * Creates the animation for all flow there.
     * @param   {Object}    objects     .     
     * @param   {String}     target     He says the goal should take the flow.
     * @param   {Boolean}    visible    visible of the object.
     * @param   {Number}    duration    Animation length.
     */
    function animateFlows(objects, target, visible, duration){

        var _duration = duration || 2000,
            _target,
            _objects,
            object;

        if(objects === 'steps'){

            _objects = objectsStep;

            if(!visible){

                used = [];

                objectsStep = { mesh : [], position :{ target : [], origin : [] } };

                for(var _i = 0, _l = self.flow.steps.length; _i < _l; _i++)

                    delete self.flow.steps[_i].drawn;
            }
        }
        else{

            _objects = objectsFlow;

            if(!visible){

                used = [];

                objectsFlow = { mesh : [], position :{ target : [], origin : [] } };

            }
        }

        for(var i = 0, l = _objects.mesh.length; i < l; i++){

            _target = _objects.position[target][i];
            object = _objects.mesh[i];
            moveObject(object, _target, _duration, visible);
        }

        function moveObject(object, target, duration, visible) {

            new TWEEN.Tween(object.position)
                .to({
                    x: target.x,
                    y: target.y,
                    z: target.z
                }, duration)
                .easing(TWEEN.Easing.Cubic.InOut)
                .onComplete(function () {
                    if(!visible)
                        window.scene.remove(object);    
                })
                .start();
        }


    }

    /**
     * Looks for the node related to that step
     * @param   {Number} id The id of the step
     * @returns {Object} The node found or null otherwise
     * @author Miguel Celedon
     */
    function getStep(id) {

        var i, l, actual;

        for(i = 0, l = self.flow.steps.length; i < l; i++) {

            actual = self.flow.steps[i];

            //Should not be done, the id in 'next' and in each step should be the same type (strings)
            if(actual.id == id) return actual;
        }

        return null;
    }

    //-----------------------------------------------------------------------------

    function initFlow(){ 

        var i, l;

        for(i = 0, l = self.flow.steps.length; i < l; i++) {

            var element = self.flow.steps[i];

            self.flow.steps[i].element = helper.searchElement(
                (element.platfrm || element.suprlay) + '/' + element.layer + '/' + element.name
            );
        }
    }
}
/**
 * @class
 * @classdesc The base class that represents a node network
 * @author Miguel Celedon
 */
function BaseNetworkViewer() {
    
    this.nodes = {};
    this.edges = [];
    this.NET_RADIOUS = 1000;
    this.hasFocus = false;
}

BaseNetworkViewer.prototype = {

    /**
     * Loads the node data
     * @author Miguel Celedon
     */
    load : function() {

        //Ask for nodes
        var networkNodes = this.test_load();

        this.NET_RADIOUS = this.NET_RADIOUS * networkNodes.length;

        this.drawNodes(networkNodes);
    },

    /**
     * Deletes all data loaded to free memory
     * @author Miguel Celedon
     */
    unload : function() {

        for(var node in this.nodes)
            scene.remove(this.nodes[node].sprite);
        this.nodes = {};

        for(var i = 0; i < this.edges.length; i++)
            scene.remove(this.edges[i].line);
        this.edges = [];
        
        window.render();
    },

    /**
     * Redraws everything
     * @author Miguel Celedon
     */
    reset : function() {

        this.showEdges();
        this.showNodes();
    },

    /**
     * Set the camera transition to get closer to the graph
     * @author Miguel Celedon
     */
    configureCamera : function() {},

    /**
     * Sets the camera to target the center of the network
     * @author Miguel Celedon
     */
    setCameraTarget : function() {

        var position = window.camera.getPosition();

        window.camera.setTarget(new THREE.Vector3(position.x, position.y, -this.NET_RADIOUS), 1);
    },

    /**
     * Draws the nodes in the network
     * @author Miguel Celedon
     * @param {Array} networkNodes Array of nodes to draw
     */
    drawNodes : function(networkNodes) {},

    /**
     * Creates a sprite representing a single node
     * @author Miguel Celedon
     * @param   {object}        nodeData      The data of the actual node
     * @param   {THREE.Vector3} startPosition The starting position of the node
     * @returns {Three.Sprite}  The sprite representing the node
     */
    createNode : function(nodeData, startPosition) {
        
        var texture = THREE.ImageUtils.loadTexture(this.PICTURES[nodeData.subType] || this.PICTURES.pc);
        texture.minFilter = THREE.NearestFilter;
        
        var sprite = new THREE.Sprite(new THREE.SpriteMaterial({color : 0xffffff, map : texture}));
        /*var sprite = new THREE.Mesh(
            new THREE.PlaneGeometry(5, 5),
            new THREE.MeshBasicMaterial({color : 0xffffff, map : texture})
        );*/
        //window.helper.applyTexture(this.PICTURES[nodeData.subType], sprite);
        sprite.renderOrder = 100;
        sprite.material.blending = THREE.NoBlending;
        
        var id = nodeData.id.toString();

        sprite.userData = {
            id : id,
            originPosition : startPosition,
            onClick : this.onNodeClick.bind(this)
        };

        sprite.position.copy(startPosition);

        this.nodes[id] = nodeData;
        this.nodes[id].sprite = sprite;

        return sprite;
    },

    /**
     * Shows the network nodes
     * @author Miguel Celedon
     */
    showNodes : function() {

        for(var nodeID in this.nodes) {
            this.nodes[nodeID].sprite.visible = true;
        }
        window.render();
    },

    /**
     * Hide all nodes
     * @author Miguel Celedon
     * @param {Array} excludedIDs Array of IDs that will be kept visible
     */
    hideNodes : function(excludedIDs) {

        for(var nodeID in this.nodes) {

            if(!excludedIDs.includes(nodeID)) {

                this.nodes[nodeID].sprite.visible = false;
            }
        }
        window.render();
    },

    /**
     * Draws all adjacencies between the nodes
     * @author Miguel Celedon
     */
    createEdges : function() {

        for(var nodeID in this.nodes) {

            var origin, dest;
            var node = this.nodes[nodeID];

            origin = node.sprite.position;

            for(var i = 0; i < node.edges.length; i++) {

                var actualEdge = node.edges[i];

                if(this.nodes.hasOwnProperty(actualEdge.id) && this.edgeExists(nodeID, actualEdge.id) === -1) {

                    dest = this.nodes[actualEdge.id].sprite.position;

                    var lineGeo = new THREE.Geometry();
                    lineGeo.vertices.push(origin, dest);

                    var line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({color : 0x000000}));
                    line.visible = false;

                    scene.add(line);
                    this.edges.push({
                        from : nodeID,
                        to : actualEdge.id,
                        line : line
                    });
                }
            }
        }

        this.showEdges();
    },

    /**
     * Show the edges
     * @author Miguel Celedon
     */
    showEdges : function() {

        var duration = 2000;

        for(var i = 0; i < this.edges.length; i++) {
            this.edges[i].line.visible = true;
        }
        window.render();
    },

    /**
     * Hides the edges
     * @author Miguel Celedon
     * @param {Array} excludedIDs Array of IDs that will be kept visible
     */
    hideEdges : function(excludedIDs) {

        var duration = 2000;
        excludedIDs = excludedIDs || [];

        for(var i = 0; i < this.edges.length; i++) {
            
            if(!excludedIDs.includes(i))
                this.edges[i].line.visible = false;
        }
        window.render();
    },

    /**
     * Checks if an edge alreedges exists
     * @author Miguel Celedon
     * @param   {string} from ID of one node
     * @param   {string} to   ID of the other node
     * @returns {number} The index in the edges array, -1 if not found
     */
    edgeExists : function(from, to) {

        for(var i = 0; i < this.edges.length; i++) {
            var edge = this.edges[i];

            if((edge.from === from && edge.to === to) || (edge.to === from && edge.from === to)) return i;
        }

        return -1;
    },

    test_load : function() {

        var networkNodes = [];
        var NUM_NODES = 25,
            MAX_CONNECTIONS = 10;
        
        var TYPES = ['pc', 'server', 'phone', 'tablet'];

        for(var i = 0; i < NUM_NODES; i++) {

            var node = {
                id : i,
                edges : [],
                subType : TYPES[Math.floor(Math.random() * 10) % 2]
            };

            var connections = Math.floor(Math.random() * MAX_CONNECTIONS);

            for(var j = 0; j < connections; j++) {

                node.edges.push({
                    id : Math.floor(Math.random() * NUM_NODES)
                });
            }

            networkNodes.push(node);
        }

        return networkNodes;
    },

    /**
     * To be executed when a nodes is clicked
     * @author Miguel Celedon
     * @param {object} clickedNode The clicked node
     */
    onNodeClick : function(clickedNode) {

        var goalPosition = new THREE.Vector3(0, -2500, 9000);
        goalPosition.add(clickedNode.position);

        window.camera.move(goalPosition.x, goalPosition.y, goalPosition.z, 2000);

        goalPosition.z -= 9000;
        window.camera.setTarget(goalPosition, 1000);
    },
    
    /**
     * Action to open the details about a node
     * @author Miguel Celedon
     */
    open : function() {},
    
    /**
     * Action to close the details of a node
     * @author Miguel Celedon
     */
    close : function() {},
    
    PICTURES : {
        server : "/images/network/server.png",
        pc : "/images/network/pc.png",
        phone : "/images/network/phone.png",
        actor : "/images/network/actor.png",
        tablet : "/images/network/tablet.png"
    }
};
/**
 * @author Ricardo Delgado
 * @last modified By Miguel Celedon
 * function create a Buttons Browser and charge your textures
 */
function BrowserManager() {

       this.objects = {
            mesh : []
        };

    var self = this;
    
    var wide = (Math.floor(window.camera.aspectRatio * 10) !== Math.floor(40/3));
    
    var LOWER_LAYER = 63000,
        POSITION_X = (wide) ? 15000 : 12000,
        POSITION_Y = (wide) ? 7500 : 8000,
        SCALE = (wide) ? 70 : 40;

    var onClick = function (target) {

       actionButton(target.userData.view);

    };

     /**
     * @author Ricardo Delgado
     * Pressed button function.
     * @param {String} view  vista a cargar
     */
    function actionButton (view) {

       window.goToView(view);

    }

   /**
     * @author Ricardo Delgado
     * Button changes the value legend.
     * @param {Number}  valor    value of opacity.
     * @param {String} display   button status.
     */
   this.modifyButtonLegend = function (valor, display) {
    
      var browserButton = document.getElementById('legendButton');
      
      $(browserButton).fadeTo(1000, valor, function() {

            $(browserButton).show();

            browserButton.style.display = display;

      });
  
   };

   /**
    * @author Ricardo Delgado
    * Initialization of the arrows
    */
   this.init = function () {
       
        for(var view in window.map.views) {
            loadView(view);
        }

   };
    
   /**
    * @author Ricardo Delgado
    * Loading the necessary views and arrows according to varible map. 
    * @param {String} view  view to load
    */
    function loadView (view) {
        
        var directions = ['up', 'down', 'right', 'left'];

        var newCenter = new THREE.Vector3(0, 0, 0);
        newCenter = window.viewManager.translateToSection(view, newCenter);
        
        if(window.map.views[view].enabled !== true)
            showSign(newCenter);
        
        var dir = '';

        for(var i = 0; i < directions.length; i++) {
            
            //Get up, down, left and right views
            dir = window.map.views[view][directions[i]];
            
            if(dir !== '')
                addArrow(dir, newCenter.x, newCenter.y, directions[i]);
        }

    }
    
    /**
     * Shows a sign in the given position
     * @author Miguel Celedon
     * @param {THREE.Vector3} center Center of the sign
     */
     
    function showSign(center) {
        
        var newCenter = center.clone();
        newCenter.z = LOWER_LAYER;
        
        var texture = THREE.ImageUtils.loadTexture('images/sign.png');
        texture.minFilter = THREE.NearestFilter;
        
        //Create placeholder for now
        var sign = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(8000, 6000),
            new THREE.MeshBasicMaterial({color : 0xFFFFFF, map : texture})
        );
        
        sign.position.copy(newCenter);
        
        window.scene.add(sign);
    }

   /**
     * @author Ricardo Delgado
     * creating arrows.
     * @param {String}   view    view load.
     * @param {Number}  center   camera Center.
     * @param {String}  button   position arrow.
     */
   function addArrow (view, centerX, centerY, button) {

        var mesh,
            _position,
            id = self.objects.mesh.length;

        mesh = new THREE.Mesh(
               new THREE.PlaneBufferGeometry( 60, 60 ),
               new THREE.MeshBasicMaterial( { map:null , side: THREE.FrontSide, transparent: true } ));
    
       _position = calculatePositionArrow (centerX, centerY, button);

       mesh.position.set( _position.x, 
                          _position.y, 
                          _position.z );

       mesh.scale.set(SCALE, SCALE, SCALE);

       mesh.userData = { 
        id : id ,
        arrow : button, 
        view : view,
        onClick : onClick };

       mesh.material.opacity = 1;
    
       window.scene.add(mesh);
    
       self.objects.mesh.push(mesh);

       addTextura (view, button, mesh);

   }

   /**
     * @author Ricardo Delgado
     * Calculate Position Arrow .
     * @param {Number}  center   camera Center.
     * @param {String}  button   position arrow.
     */
   function calculatePositionArrow (centerX, centerY, button) {

      var position = {},
          x = centerX,
          y = centerY,
          z = 80000 * -2; 

      if ( button === "right" ) { 

          x = centerX + POSITION_X; 
      }
      else if ( button === "left" ) { 

        x = centerX + ( POSITION_X * -1 );
      }
      else if ( button === "up" ) { 

         y = centerY + POSITION_Y;
      }
      else { 

         y = centerY + ( POSITION_Y * -1 );
      }

     position = { x: x, y: y, z: z };

     return position;

   }

   /**
     * @author Ricardo Delgado
     * Creates textures arrows and stored in the variable texture.
     * @param {String}   view    view.
     * @param {String}  button   image to use.
     * @param {object}   mesh    button to load texture.
     */
   function addTextura (view, button, mesh) {
       
        var canvas,
            ctx,
            img = new Image(),
            texture,
            config = configTexture(view, button);

        canvas = document.createElement('canvas');
        canvas.width  = 400;
        canvas.height = 370;

        ctx = canvas.getContext("2d");
        ctx.globalAlpha = 0.90;

        img.src = "images/browsers_arrows/arrow-"+button+".png";

        img.onload = function () {

            ctx.textAlign = 'center';

            ctx.font = config.text.font;
            window.helper.drawText(config.text.label, 200, config.image.text, ctx, canvas.width, config.text.size);
            ctx.drawImage(img, config.image.x, config.image.y, 200, 200);

            texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;  
            texture.minFilter = THREE.NearestFilter;

            mesh.material.map = texture;
            mesh.material.needsUpdate = true;

            animate(mesh, LOWER_LAYER, 3000);

        };

   }

   /**
     * @author Ricardo Delgado
     * Configures all texture options.
     * @param {String}   view    view.
     * @param {String}  button   image to use.
     */
   function configTexture (view, button) {
     
    var config = {},
        text = {},
        image = {},
        label;

    if (button !== "down") {  
        image = { x: 100, y : 0, text : 238 };
    }
    else { 
        image = { x: 100, y : 120, text : 108 };
    }
 

      label = window.map.views[view].title;


    text = { label : label, font: "48px Canaro, Sans-serif", size : 48 };

    config = { image : image, text : text };

    return config;

   }

   /**
     * @author Ricardo Delgado.
     * Animate Button.
     * @param {Object}     mesh        Button.
     * @param {Number}     target      The objetive Z position.
     * @param {Number} [duration=2000] Duration of the animation.
     */
   function animate (mesh, target, duration) {

        var _duration = duration || 2000,
            z = target;

        new TWEEN.Tween(mesh.position)
            .to({z : z}, _duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .onUpdate(window.render)
            .start();

   }

}
/**
 * @author Ricardo Delgado
 */
function ButtonsManager() {

    this.objects = {
    	left : { 
        	buttons : []
        },
        right : {
        	buttons : []
        }
    };

    var self = this;

    /**
     * @author Ricardo Delgado
     * All the buttons and their functions are added.
     * @param {String} id  Tile ID.
     */
    this.actionButtons = function(id, callback){

    	self.removeAllButtons();

        if(window.table[id].author) {

            self.createButtons('developerButton', 'View developer', function(){

            	if(typeof(callback) === 'function')
                	callback();
            });
        }

        window.screenshotsAndroid.showButtonScreenshot(id);

        window.fermatEdit.addButton(id);

        window.flowManager.getAndShowFlows(id);//Always stop last
    };

    /**
     * @author Ricardo Delgado
     * creation of button and its function is added.
     * @param {String}  id  Button ID.
     * @param {String} text  Button text.
	 * @param {Function} callback Function to call when finished.    
     */
    this.createButtons = function(id, text, callback, _x, _type, _side){

    	var object = {
            id : id,
            text : text
          };

        var x = _x || 5,
        	type = _type || 'button',
        	side = _side || 'left',
        	idSucesor = "backButton";

        if(side === 'right')
        	idSucesor = 'legendButton';

      	if(self.objects[side].buttons.length !== 0)
      		idSucesor = self.objects[side].buttons[self.objects[side].buttons.length - 1].id;

      	var button = document.createElement(type),
          	sucesorButton = document.getElementById(idSucesor);
                  
  		button.id = id;
		button.className = 'actionButton';
		button.style.position = 'absolute';
		button.innerHTML = text;
		button.style.top = '10px';
		button.style.left = calculatePosition(sucesorButton, side, x);
		button.style.zIndex = 10;
		button.style.opacity = 0;

      	button.addEventListener('click', function() {
      		
      			self.removeAllButtons();

                if(typeof(callback) === 'function')
                    callback(); 

        	});

      	document.body.appendChild(button);

      	self.objects[side].buttons.push(object);

      	window.helper.show(button, 1000);

      	return button;
    };

    /**
     * @author Ricardo Delgado
     * Eliminates the desired button.
     * @param {String}  id  Button ID.
	 * @param {Function} callback Function to call when finished.    
     */
    this.deleteButton = function(id, _side, callback){

    	var side = _side || 'left';

    	for(var i = 0; i < self.objects[side].buttons.length; i++){

    		if(self.objects[side].buttons[i].id === id){
    			self.objects[side].buttons.splice(i,1);
    			window.helper.hide($('#'+id), 1000, callback);
    			
    		}
    	}
    };

    /**
     * @author Ricardo Delgado
     * Removes all created buttons. 
     */
    this.removeAllButtons = function(){

        if(self.objects.left.buttons.length !== 0 || self.objects.right.buttons.length !== 0){

            var side = 'left';

            if(self.objects[side].buttons.length === 0)
                side = 'right';

	    	var actualButton = self.objects[side].buttons.shift();

	    	if( $('#'+actualButton.id) != null ) 
	    		window.helper.hide($('#'+actualButton.id), 1000); 
	    	
	    		self.removeAllButtons();
    	}
    };

    function calculatePosition(sucesorButton, side, x){

    	if(side === 'left')
    		return ((sucesorButton.offsetLeft + sucesorButton.clientWidth + x) + 'px');

    	else 
			return ((window.innerWidth - sucesorButton.offsetLeft - x) + 'px'); 
    
	}

}
var ROTATE_SPEED = 1.3,
        MIN_DISTANCE = 50,
        MAX_DISTANCE = 90000;

/**
 *
 * @class Camera
 *
 * @param  {Position}
 * @param  {Renderer}
 * @param  {Function}
 */
function Camera(position, renderer, renderFunc) {
    /**
     * private constans
     */

    /**
     * private properties
     */    
    var camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, MAX_DISTANCE );
    var controls = new THREE.TrackballControls( camera, renderer.domElement );
    var focus = null;
    var self = this;
    var rendering = false;
    
    var fake = new THREE.Object3D();
    fake.position.set(MAX_DISTANCE, MAX_DISTANCE, -MAX_DISTANCE);
    
    camera.position.copy( position );

    controls.rotateSpeed = ROTATE_SPEED;
    controls.noRotate = true;
    controls.noPan = true;
    controls.minDistance = MIN_DISTANCE;
    controls.maxDistance = MAX_DISTANCE;
    controls.addEventListener( 'change', renderFunc );
    controls.position0.copy( position );
    
    // Public properties
    this.dragging = false;
    this.aspectRatio = camera.aspect;
    this.moving = false;
    this.freeView = false;
    
    this.controls = controls;
    
    // Public Methods
    
    this.enableFreeMode = function() {
        controls.noRotate = false;
        controls.noPan = false;
        camera.far = MAX_DISTANCE * 2;
        controls.maxDistance = Infinity;
        self.onWindowResize();
        self.freeView = true;
    };
    
    this.disableFreeMode = function() {
        controls.noRotate = true;
        controls.noPan = true;
        camera.far = MAX_DISTANCE;
        controls.maxDistance = MAX_DISTANCE;
        self.onWindowResize();
        //self.freeView = false;
    };
    
    /**
     * Returns the max distance set
     * @returns {Number} Max distance constant
     */
    this.getMaxDistance = function() { return MAX_DISTANCE; };

    /**
     * @method disable disables camera controls
     */
    this.disable = function() {
        controls.enabled = false;
    };
    
    /**
     *
     * @method enable enables camera controls
     */
    this.enable = function() {
        controls.enabled = true;
    };
    
    /**
     * Returns a copy of the actual position
     * @returns {THREE.Vector3} Actual position of the camera
     */
    this.getPosition = function() {
        return camera.position.clone();
    };
    
    this.setTarget = function(target, duration) {
        
        duration = (duration !== undefined) ? duration : 2000;
        
        new TWEEN.Tween(controls.target)
        .to({x : target.x, y : target.y, z : target.z}, duration)
        .onUpdate(window.render)
        .start();
    };
    
    /**
     * 
     * @method setFocus sets focus to a target given its id
     *
     * @param {Number} id       target id
     * @param {Number} duration animation duration time
     * @param {Object} target  target of the focus
     * @param {Vector} offset  offset of the focus
     */

    /**
     * Sets the focus to one object
     * 
     * @author Miguel Celedon
     * @param {THREE.Object3D} target          The target to see
     * @param {THREE.Vector3}  offset          The distance and position to set the camera
     * @param {number}         [duration=3000] The duration of the animation
     */
    this.setFocus = function(target, offset, duration){

        duration = duration || 3000;
        focus = target;

        self.render(renderer, scene); 
        offset.applyMatrix4( target.matrix );

        new TWEEN.Tween( camera.position )
            .to( { x: offset.x, y: offset.y, z: offset.z }, duration )
            .onComplete(render)
            .start();
        
        self.setTarget(target.position, duration / 2);

        new TWEEN.Tween( camera.up )
            .to( { x: target.up.x, y: target.up.y, z: target.up.z }, duration )
            .easing( TWEEN.Easing.Exponential.InOut )
            .start();
    };

    /**
     *
     * @method loseFocus    loses focus from target
     *
     */
     
    this.loseFocus = function() {
        
        if ( focus != null ) {
            var backButton = document.getElementById('backButton');
            $(backButton).fadeTo(1000, 0, function() { backButton.style.display = 'none'; } );
            $('#sidePanel').fadeTo(1000, 0, function() { $('#sidePanel').remove(); });
            $('#elementPanel').fadeTo(1000, 0, function() { $('#elementPanel').remove(); });
            $('#timelineButton').fadeTo(1000, 0, function() { $('#timelineButton').remove(); });
            if( $('#tlContainer') != null ) helper.hide($('#tlContainer'), 1000);
            $(renderer.domElement).fadeTo(1000, 1);

            buttonsManager.removeAllButtons();

            focus = null;
        }
    };
    
    /**
     *
     * @method onWindowResize   execute in case of window resizing
     * 
     */
    this.onWindowResize = function() {
        var innerWidth = window.innerWidth,
            innerHeight = window.innerHeight;
        
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        self.aspectRatio = camera.aspect;

        renderer.setSize( innerWidth, innerHeight );

        render();
    };
    
    /**
     *
     * @method onKeyDown    execute in case of key down pressed
     *
     * @param {Event} event event to listen to
     * 
     */
    this.onKeyDown = function( event ) {
    
        if ( event.keyCode === 27 /* ESC */ ) {

            //TWEEN.removeAll();
            var duration = 2000;

            if(viewManager.views && viewManager.views[window.actualView])
                viewManager.views[window.actualView].reset();

            self.resetPosition(duration);
        }
    };
    
    /**
     * Resets the camera position
     * @param {Number} [duration=2000] Duration of the animation
     */
    this.resetPosition = function(duration) {
        
        duration = duration || 2000;
        self.disable();
        
        var target = window.viewManager.translateToSection(window.actualView, controls.position0);
        
        if(self.freeView) {
            
            var targetView = window.viewManager.translateToSection(window.actualView, new THREE.Vector3(0, 0, 0));
            
            new TWEEN.Tween( controls.target )
                    .to( { x: targetView.x, y: targetView.y, z: targetView.z }, duration )
                    //.easing( TWEEN.Easing.Cubic.InOut )
                    .start();
        }

            new TWEEN.Tween( camera.position )
                .to( { x: target.x, y: target.y, z: target.z }, duration )
                //.easing( TWEEN.Easing.Exponential.InOut )
                .onUpdate(function(){ if(!self.freeView) controls.target.set(camera.position.x, camera.position.y, 1); })
                .onComplete(function() {
                    self.enable();
                    self.disableFreeMode();
                })
                .start();

            new TWEEN.Tween( camera.up )
                .to( { x: 0, y: 1, z: 0 }, duration )
                //.easing( TWEEN.Easing.Exponential.InOut )
                .start();
    };
    
    /**
     *
     * @method update    updates camera controls  
     *
     */
    this.update = function() {
        
        if(controls.noPan === true && Math.ceil(camera.position.z) !== controls.position0.z) {
            
            controls.noPan = false;
        
            if(self.freeView === true) {
                self.enableFreeMode();
            }
            
            if(window.viewManager && window.actualView)
                window.viewManager.views[window.actualView].zoom();
        }
        else if(controls.noPan === false && Math.ceil(camera.position.z) === controls.position0.z && self.freeView === false) {
            this.onKeyDown({keyCode : 27}); //Force reset if far enough
        }
        
        controls.update();
        self.dragging = controls.dragging;
    };
    
    /**
     *
     * @method render    renders an scene
     *
     * @param {Renderer} renderer renderer for camera
     * @param {Scene}    scene    scene to render
     *
     */
    this.render = function ( renderer, scene ) {
        
        var cam;
        
        if(rendering === false) {
            
            rendering = true;

            scene.traverse( function ( object ) {

                if ( object instanceof THREE.LOD ) {

                    if(object.userData.flying === true) cam = fake;
                    else cam = camera;

                    object.update( cam );
                }
            });

            renderer.render ( scene, camera );
            
            rendering = false;
        }
        else {
            console.log("Render ignored");
        }
    };
    
    /**
     *
     * @method getFocus gets focused target
     *
     * @return {Number} focused target
     */
    this.getFocus = function () { 
        return focus;
    };
    
    /**
     * Casts a ray between the camera to the target
     * @param   {Object} target   Vector2D target
     * @param   {Array}  elements Array of elements expected to collide
     * @returns {Array}  All intercepted members of elements
     */
    this.rayCast = function(target, elements) {
        
        var raycaster = new THREE.Raycaster();
        
        raycaster.setFromCamera(target, camera);
        
        /* Debug code, draw lines representing the clicks
 
        var mat = new THREE.LineBasicMaterial({color : 0xaaaaaa});
        var g = new THREE.Geometry();
        var r = raycaster.ray;
        var dest = new THREE.Vector3(r.origin.x + r.direction.x * MAX_DISTANCE, r.origin.y + r.direction.y * MAX_DISTANCE, r.origin.z + r.direction.z * MAX_DISTANCE);

        g.vertices.push( r.origin, dest);

        var line = new THREE.Line(g, mat);

        scene.add(line);*/
        
        return raycaster.intersectObjects(elements);
    };
    
    /**
     * Moves the camera to a position
     * @author Miguel Celedon
     * @param {Number}  x               X coordinate
     * @param {Number}  y               Y coordinate
     * @param {Number}  z               Z coordinate
     * @param {Number}  [duration=2000] Milliseconds of the animation
     * @param {boolean} [synced]        If true, moves like it were not in free view
     */
    this.move = function(x, y, z, duration, synced) {
        
        var _duration = duration || 2000;
        synced = synced || false;
        
        var tween = null;
        
        if(window.helper.isValidVector({x : x, y : y, z : z})) {
            
            tween = new TWEEN.Tween(camera.position)
                    .to({x : x, y : y, z : z}, _duration)
                    .easing(TWEEN.Easing.Cubic.InOut)
                    .onUpdate(function(){
                        if(!self.freeView || synced)
                            controls.target.set(camera.position.x, camera.position.y, 0);

                        window.render();
                    });
            
            var next = new TWEEN.Tween(camera.up)
                        .to({x : 0, y : 1, z : 0}, _duration)
                        .easing(TWEEN.Easing.Cubic.InOut);
            
            tween.onStart(function() { next.start(); });
            tween.start();
            
        }
        else {
            window.alert("Error: this is not a valid vector (" + x + ", " + y + ", " + z + ")");
        }
        
    };
    
    /**
     * Locks the panning of the camera
     */
    this.lockPan = function() {
        controls.noPan = true;
    };
    
    /**
     * Unlocks the panning of the camera
     */
    this.unlockPan = function() {
        controls.noPan = false;
    };
    
    // Events
    window.addEventListener( 'resize', this.onWindowResize, false );
    window.addEventListener( 'keydown', this.onKeyDown, false );
}
/**
 * Command Line Interface. Contains functions defined to be used when debugging
 * @author Miguel Celedon
 */
function CLI() {
    
    /**
     * Used to execute a condition through an array
     * @author Miguel Celedon
     * @param   {Array}    list      The source of the search
     * @param   {function} condition A function receiving the actual element and must return true or false
     * @returns {Array}    Set of indices of that array that complies the condition
     */
    this.query = function(list, condition) {
        
        var found = [];
        
        for(var i in list) {
            if(condition(list[i]))
                found.push(i);
        }
        
        return found;
    };
    
    /**
     * This function is meant to be used only for testing in the debug console,
     * it cleans the entire scene so the website frees some memory and so you can
     * let it in the background without using so much resources.
     * @author Miguel Celedon
     */
    this.shutDown = function() {

        scene = new THREE.Scene();

    };
    
    /**
     * Executes a click event on a tile
     * @author Miguel Celedon
     * @param {number} id The ID (position in the table) of the element
     */
    this.forceElementClick = function(id) {
        
        var obj = window.objects[id].levels[0].object;
        
        obj.userData.onClick(obj);
        
    };
}

var CLI = new CLI();
function ClientsViewer(parentNode) {
    
    BaseNetworkViewer.call(this);
    
    this.parentNode = parentNode;
    this.nodes = {};
    this.edges = [];
    this.NET_RADIOUS = 1000;
    this.childNetwork = null;
}

ClientsViewer.prototype = Object.create(BaseNetworkViewer.prototype);
ClientsViewer.prototype.constructor = ClientsViewer;

/**
 * @override
 * Executed when a node is clicked, moves the camera and draw its childs
 * @author Miguel Celedon
 * @param {object} clickedNode The clicked node
 */
ClientsViewer.prototype.onNodeClick = function(clickedNode) {
    
    if(this.childNetwork === null) {
        
        BaseNetworkViewer.prototype.onNodeClick.call(this, clickedNode);

        this.hideEdges(clickedNode.userData.id);
        this.hideNodes([clickedNode.userData.id]);
        //this.childNetwork = new ClientsViewer(clickedNode);
        this.childNetwork = {};
        
        this.open();
    }
};

/**
 * Draws the nodes in the network
 * @author Miguel Celedon
 * @param {Array} networkNodes Array of nodes to draw
 */
ClientsViewer.prototype.drawNodes = function(networkNodes) {

    for(var i = 0; i < networkNodes.length; i++) {

        var position = new THREE.Vector3(
            Math.random() * this.NET_RADIOUS,
            - this.NET_RADIOUS / 2,
            Math.random() * this.NET_RADIOUS);
        
        position.add(this.parentNode.position);

        var sprite = this.createNode(networkNodes[i], position);

        sprite.scale.set(500, 500, 1.0);

        window.scene.add(sprite);
    }

    this.createEdges();
};

ClientsViewer.prototype.test_load = function() {
    
    var networkNodes = [];
    var NUM_NODES = 5;
    
    for(var i = 0; i < NUM_NODES; i++) {
        
        var node = {
            id : i,
            edges : [{id : this.parentNode.userData.id}]
        };
        
        networkNodes.push(node);
    }
    
    return networkNodes;
    
};

ClientsViewer.prototype.createEdges = function() {
    
    for(var nodeID in this.nodes) {
        
        var origin = this.nodes[nodeID].sprite.position;
        var dest = this.parentNode.position;
        
        var lineGeo = new THREE.Geometry();
        lineGeo.vertices.push(origin, dest);

        var line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({color : 0x0000ff}));
        line.visible = false;

        scene.add(line);
        
        this.edges.push({
            from : nodeID,
            to : this.parentNode.userData.id,
            line : line
        });
    }
    
    this.showEdges();
    
    //Not needed now
    //BaseNetworkViewer.prototype.createEdges.call(this);
};

/**
 * Hide edges except the one connecting to the parent
 * @author Miguel Celedon
 * @param {string} clickedID The ID of the clicked node to except its edge hiding
 */
ClientsViewer.prototype.hideEdges = function(clickedID) {
    
    var edgeID = this.edgeExists(this.parentNode.userData.id, clickedID);
    
    BaseNetworkViewer.prototype.hideEdges.call(this, [edgeID]);
    
};

/**
 * Closes and unloads the child, if the child is open, closes it
 * @author Miguel Celedon
 * @returns {object} The reference to itself, if there was no children I'll return null
 */
ClientsViewer.prototype.closeChild = function() {
    
    var self = null;
    
    if(this.childNetwork !== null){
        
        //TODO: Change for a call to childNetwork.closeChild() to keep the chain
        this.childNetwork = null;
        
        self = this;
        
        //If direct child is closed, show its brothers
        if(this.childNetwork === null)
            this.reset();
    }
    else {
        this.close();
        this.unload();
    }
    
    return self;
    
};
var testData = '{"platfrms":[{"code":"COR","name":"core and api","logo":"COR_logo.png","deps":["OSA"],"order":0,"upd_at":"561710ef1f1c2be0054fd5e3","_id":"561463f536058c8c64ac2061"},{"code":"PIP","name":"plug-ins platform","logo":"PIP_logo.png","deps":["P2P","COR"],"order":1,"upd_at":"561710f31f1c2be0054fd6e2","_id":"561463fc36058c8c64ac225b"},{"code":"WPD","name":"wallet production and distribution","logo":"WPD_logo.png","deps":["PIP"],"order":2,"upd_at":"561710fb1f1c2be0054fd872","_id":"5614640936058c8c64ac2542"},{"code":"CCP","name":"crypto currency platform","logo":"CCP_logo.png","deps":["WPD","P2P"],"order":3,"upd_at":"561711001f1c2be0054fd952","_id":"5614641036058c8c64ac26ef"},{"code":"CCM","name":"crypto commodity money","logo":"CCM_logo.png","deps":["CCP"],"order":4,"upd_at":"561711071f1c2be0054fdaa2","_id":"5614641836058c8c64ac2966"},{"code":"BNP","name":"bank notes platform","logo":"BNP_logo.png","deps":["CCM"],"order":5,"upd_at":"5617110a1f1c2be0054fdb46","_id":"5614641c36058c8c64ac2a97"},{"code":"SHP","name":"shopping platform","logo":"SHP_logo.png","deps":["WPD"],"order":6,"upd_at":"5617110b1f1c2be0054fdb70","_id":"5614641d36058c8c64ac2ae0"},{"code":"DAP","name":"digital asset platform","logo":"DAP_logo.png","deps":["WPD"],"order":7,"upd_at":"5617110e1f1c2be0054fdc39","_id":"5614642236058c8c64ac2c4c"},{"code":"MKT","name":"marketing platform","logo":"MKT_logo.png","deps":["DAP"],"order":8,"upd_at":"561711171f1c2be0054fddc8","_id":"5614642c36058c8c64ac2f30"},{"code":"CSH","name":"cash handling platform","logo":"CSH_logo.png","deps":["WPD"],"order":9,"upd_at":"5617111a1f1c2be0054fde65","_id":"5614642e36058c8c64ac304c"},{"code":"BNK","name":"banking platform","logo":"BNK_logo.png","deps":["WPD"],"order":10,"upd_at":"5617111c1f1c2be0054fde96","_id":"5614642f36058c8c64ac30a8"},{"code":"CBP","name":"crypto broker platform","logo":"CBP_logo.png","deps":["CCP","CSH","BNK"],"order":11,"upd_at":"5617111c1f1c2be0054fdeb5","_id":"5614642f36058c8c64ac30e0"},{"code":"CDN","name":"crypto distribution netword","logo":"CDN_logo.png","deps":["CBP"],"order":12,"upd_at":"561711251f1c2be0054fe0aa","_id":"5614643d36058c8c64ac3484"},{"code":"DPN","name":"device private network","logo":"DPN_logo.png","deps":["PIP"],"order":13,"upd_at":"5617112d1f1c2be0054fe253","_id":"5614644d36058c8c64ac3790"}],"suprlays":[{"code":"P2P","name":"peer to peer network","deps":["OSA"],"order":0,"upd_at":"5617112e1f1c2be0054fe275","_id":"5614644e36058c8c64ac37cb"},{"code":"BCH","name":"crypto","deps":["OSA"],"order":1,"upd_at":"5617112f1f1c2be0054fe2a8","_id":"5614645136058c8c64ac3839"},{"code":"OSA","name":"operating system api","deps":[],"order":2,"upd_at":"561711331f1c2be0054fe327","_id":"5614645536058c8c64ac392b"}],"layers":[{"name":"core","lang":"java","order":0,"upd_at":"561463f536058c8c64ac2063","_id":"561463f536058c8c64ac2064"},{"name":"niche wallet","lang":"java-android","order":1,"upd_at":"561463f836058c8c64ac2138","_id":"561463f836058c8c64ac2139"},{"name":"reference wallet","lang":"java-android","order":2,"upd_at":"561463f836058c8c64ac213b","_id":"561463f836058c8c64ac213c"},{"name":"sub app","lang":"java-android","order":3,"upd_at":"561463f936058c8c64ac213e","_id":"561463f936058c8c64ac213f"},{"name":"desktop","lang":"java-android","order":4,"upd_at":"56146e85f47b82b16565da0b","_id":"561463f936058c8c64ac2142"},{"name":"engine","lang":"java","order":6,"upd_at":"5614c457bb35d6a86933e58f","_id":"561463f936058c8c64ac2145"},{"name":"wallet module","lang":"java","order":7,"upd_at":"5614c457bb35d6a86933e591","_id":"561463f936058c8c64ac2148"},{"name":"sub app module","lang":"java","order":8,"upd_at":"5614c457bb35d6a86933e593","_id":"561463f936058c8c64ac214b"},{"name":"desktop module","lang":"java","order":9,"upd_at":"5614c457bb35d6a86933e595","_id":"561463f936058c8c64ac214e"},{"name":"agent","lang":"java","order":10,"upd_at":"5614c457bb35d6a86933e597","_id":"561463f936058c8c64ac2151"},{"name":"actor","lang":"java","order":11,"upd_at":"5614c457bb35d6a86933e599","_id":"561463f936058c8c64ac2154"},{"name":"middleware","lang":"java","order":12,"upd_at":"5614c457bb35d6a86933e59b","_id":"561463f936058c8c64ac2157"},{"name":"request","lang":"java","order":13,"upd_at":"5614c457bb35d6a86933e59d","_id":"561463f936058c8c64ac215a"},{"name":"business transaction","lang":"java","order":14,"upd_at":"5614c457bb35d6a86933e59f","_id":"561463f936058c8c64ac215d"},{"name":"digital asset transaction","lang":"java","order":15,"upd_at":"5614c457bb35d6a86933e5a1","_id":"561463f936058c8c64ac2160"},{"name":"crypto money transaction","lang":"java","order":16,"upd_at":"5614c457bb35d6a86933e5a3","_id":"561463f936058c8c64ac2163"},{"name":"cash money transaction","lang":"java","order":17,"upd_at":"5614c457bb35d6a86933e5a5","_id":"561463f936058c8c64ac2166"},{"name":"bank money transaction","lang":"java","order":18,"upd_at":"5614c457bb35d6a86933e5a7","_id":"561463f936058c8c64ac2169"},{"name":"contract","lang":"java","order":19,"upd_at":"5614c458bb35d6a86933e5a9","_id":"561463f936058c8c64ac216c"},{"name":"composite wallet","lang":"java","order":20,"upd_at":"5614c458bb35d6a86933e5ab","_id":"561463f936058c8c64ac216f"},{"name":"wallet","lang":"java","order":21,"upd_at":"5614c458bb35d6a86933e5ad","_id":"561463f936058c8c64ac2172"},{"name":"world","lang":"java","order":22,"upd_at":"5614c458bb35d6a86933e5af","_id":"561463f936058c8c64ac2175"},{"name":"identity","lang":"java","order":23,"upd_at":"5614c458bb35d6a86933e5b1","_id":"561463f936058c8c64ac2178"},{"name":"actor network service","lang":"java","order":24,"upd_at":"5614c458bb35d6a86933e5b3","_id":"561463f936058c8c64ac217b"},{"name":"network service","lang":"java","order":25,"upd_at":"5614c458bb35d6a86933e5b5","_id":"561463f936058c8c64ac217e"},{"name":"communication","lang":"java","order":28,"upd_at":"5614c4a5bb35d6a86933f1c6","_id":"5614644e36058c8c64ac37ce"},{"name":"crypto router","lang":"java","order":30,"upd_at":"5614c4a6bb35d6a86933f1fa","_id":"5614645136058c8c64ac383c"},{"name":"crypto module","lang":"java","order":31,"upd_at":"5614c4a7bb35d6a86933f20a","_id":"5614645136058c8c64ac385d"},{"name":"crypto vault","lang":"java","order":32,"upd_at":"5614c4a7bb35d6a86933f215","_id":"5614645236058c8c64ac3873"},{"name":"crypto network","lang":"java","order":33,"upd_at":"5614c4a8bb35d6a86933f241","_id":"5614645336058c8c64ac38d0"},{"name":"license","lang":"java","order":35,"upd_at":"5614c458bb35d6a86933e5b7","_id":"561463f936058c8c64ac2181"},{"name":"plugin","lang":"java","order":36,"upd_at":"5614c458bb35d6a86933e5b9","_id":"561463f936058c8c64ac2184"},{"name":"user","lang":"java","order":37,"upd_at":"5614c458bb35d6a86933e5bb","_id":"561463f936058c8c64ac2187"},{"name":"hardware","lang":"java","order":38,"upd_at":"5614c458bb35d6a86933e5bd","_id":"561463f936058c8c64ac218a"},{"name":"platform service","lang":"java","order":39,"upd_at":"5614c458bb35d6a86933e5bf","_id":"561463f936058c8c64ac218d"},{"name":"multi os","lang":"java","order":41,"upd_at":"5614c4a9bb35d6a86933f27d","_id":"5614645536058c8c64ac392e"},{"name":"android","lang":"java","order":42,"upd_at":"5614c4aabb35d6a86933f291","_id":"5614645636058c8c64ac3957"},{"name":"api","lang":"java","order":43,"upd_at":"5614c458bb35d6a86933e5c1","_id":"561463f936058c8c64ac2190"}],"comps":[{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"fermat core","type":"library","description":"","difficulty":10,"code_level":"development","repo_dir":"COR/library/core/fermat-cor-library-core-fermat-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"implementation","percnt":70},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":30},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[{"_comp_id":"561463f536058c8c64ac2067","name":"Concept","target":null,"reached":"2015-06-01T00:00:00.000Z","_id":"561463f636058c8c64ac2082","__v":0,"upd_at":"561710ef1f1c2be0054fd5f1"},{"_comp_id":"561463f536058c8c64ac2067","name":"Development","target":"2015-09-01T00:00:00.000Z","reached":"2015-08-20T00:00:00.000Z","_id":"561463f636058c8c64ac2085","__v":0,"upd_at":"561710ef1f1c2be0054fd5f3"},{"_comp_id":"561463f536058c8c64ac2067","name":"QA","target":"2015-09-20T00:00:00.000Z","reached":"2015-09-15T00:00:00.000Z","_id":"561463f636058c8c64ac2088","__v":0,"upd_at":"561710ef1f1c2be0054fd5f5"},{"_comp_id":"561463f536058c8c64ac2067","name":"Production","target":"2015-10-01T00:00:00.000Z","reached":"2015-09-25T00:00:00.000Z","_id":"561463f636058c8c64ac208b","__v":0,"upd_at":"561710ef1f1c2be0054fd5f7"}],"upd_at":"561710ef1f1c2be0054fd5f9","_id":"561463f536058c8c64ac2067"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"android core","type":"library","description":"","difficulty":10,"code_level":"development","repo_dir":"COR/library/core/fermat-cor-library-core-android-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"implementation","percnt":70},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":30},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[{"_comp_id":"561463f636058c8c64ac2090","name":"Concept","target":null,"reached":"2015-06-01T00:00:00.000Z","_id":"561463f636058c8c64ac20a9","__v":0,"upd_at":"561710f01f1c2be0054fd606"},{"_comp_id":"561463f636058c8c64ac2090","name":"Development","target":"2015-10-01T00:00:00.000Z","reached":"2015-09-20T00:00:00.000Z","_id":"561463f636058c8c64ac20ac","__v":0,"upd_at":"561710f01f1c2be0054fd608"},{"_comp_id":"561463f636058c8c64ac2090","name":"QA","target":"2015-10-20T00:00:00.000Z","reached":"2015-09-15T00:00:00.000Z","_id":"561463f636058c8c64ac20af","__v":0,"upd_at":"561710f01f1c2be0054fd60a"},{"_comp_id":"561463f636058c8c64ac2090","name":"Production","target":"2015-10-01T00:00:00.000Z","reached":"2015-09-25T00:00:00.000Z","_id":"561463f636058c8c64ac20b2","__v":0,"upd_at":"561710f01f1c2be0054fd60c"}],"upd_at":"561710f01f1c2be0054fd60e","_id":"561463f636058c8c64ac2090"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"osa core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-osa-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f01f1c2be0054fd615","_id":"561463f636058c8c64ac20b7"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"bch core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-bch-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f01f1c2be0054fd61c","_id":"561463f736058c8c64ac20c4"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"p2p core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-p2p-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f01f1c2be0054fd623","_id":"561463f736058c8c64ac20d1"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"dpn core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-dpn-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f01f1c2be0054fd62a","_id":"561463f736058c8c64ac20de"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"pip core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-pip-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f01f1c2be0054fd631","_id":"561463f736058c8c64ac20eb"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"dmp core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-dmp-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f11f1c2be0054fd638","_id":"561463f836058c8c64ac20f8"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"wpd core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-wpd-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f11f1c2be0054fd63f","_id":"561463f836058c8c64ac2105"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"dap core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-dap-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f11f1c2be0054fd646","_id":"561463f836058c8c64ac2112"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"mkt core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-mkt-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f11f1c2be0054fd64d","_id":"561463f836058c8c64ac211f"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f536058c8c64ac2064","name":"cdn core","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/core/fermat-cor-library-core-cdn-core-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f11f1c2be0054fd654","_id":"561463f836058c8c64ac212c"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"fermat api","type":"library","description":"","difficulty":10,"code_level":"development","repo_dir":"COR/library/api/fermat-cor-library-api-fermat-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[{"_comp_id":"561463fa36058c8c64ac2193","name":"Concept","target":null,"reached":"2015-05-01T00:00:00.000Z","_id":"561463fa36058c8c64ac21a2","__v":0,"upd_at":"561710f21f1c2be0054fd67b"},{"_comp_id":"561463fa36058c8c64ac2193","name":"Development","target":"2015-06-01T00:00:00.000Z","reached":"2015-05-20T00:00:00.000Z","_id":"561463fa36058c8c64ac21a5","__v":0,"upd_at":"561710f21f1c2be0054fd67d"},{"_comp_id":"561463fa36058c8c64ac2193","name":"QA","target":"2015-07-20T00:00:00.000Z","reached":"2015-08-15T00:00:00.000Z","_id":"561463fa36058c8c64ac21a8","__v":0,"upd_at":"561710f21f1c2be0054fd67f"},{"_comp_id":"561463fa36058c8c64ac2193","name":"Production","target":"2015-10-01T00:00:00.000Z","reached":"2015-09-25T00:00:00.000Z","_id":"561463fa36058c8c64ac21ab","__v":0,"upd_at":"561710f21f1c2be0054fd681"}],"upd_at":"561710f21f1c2be0054fd683","_id":"561463fa36058c8c64ac2193"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"android api","type":"library","description":"","difficulty":10,"code_level":"development","repo_dir":"COR/library/api/fermat-cor-library-api-android-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f21f1c2be0054fd68c","_id":"561463fa36058c8c64ac21b0"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"osa api","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/api/fermat-cor-library-api-osa-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f21f1c2be0054fd693","_id":"561463fa36058c8c64ac21c1"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"bch api","type":"library","description":"","difficulty":10,"code_level":"development","repo_dir":"COR/library/api/fermat-cor-library-api-bch-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[{"_comp_id":"561463fa36058c8c64ac21ce","name":"Concept","target":null,"reached":"2015-04-01T00:00:00.000Z","_id":"561463fb36058c8c64ac21dd","__v":0,"upd_at":"561710f21f1c2be0054fd69c"},{"_comp_id":"561463fa36058c8c64ac21ce","name":"Development","target":"2015-05-01T00:00:00.000Z","reached":"2015-05-20T00:00:00.000Z","_id":"561463fb36058c8c64ac21e0","__v":0,"upd_at":"561710f21f1c2be0054fd69e"},{"_comp_id":"561463fa36058c8c64ac21ce","name":"QA","target":"2015-06-20T00:00:00.000Z","reached":"2015-05-15T00:00:00.000Z","_id":"561463fb36058c8c64ac21e3","__v":0,"upd_at":"561710f21f1c2be0054fd6a0"},{"_comp_id":"561463fa36058c8c64ac21ce","name":"Production","target":"2015-10-01T00:00:00.000Z","reached":"2015-09-25T00:00:00.000Z","_id":"561463fb36058c8c64ac21e6","__v":0,"upd_at":"561710f21f1c2be0054fd6a2"}],"upd_at":"561710f21f1c2be0054fd6a4","_id":"561463fa36058c8c64ac21ce"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"p2p api","type":"library","description":"","difficulty":10,"code_level":"development","repo_dir":"COR/library/api/fermat-cor-library-api-p2p-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f21f1c2be0054fd6ad","_id":"561463fb36058c8c64ac21eb"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"dpn api","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/api/fermat-cor-library-api-dpn-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f21f1c2be0054fd6b4","_id":"561463fb36058c8c64ac21fc"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"pip api","type":"library","description":"","difficulty":10,"code_level":"development","repo_dir":"COR/library/api/fermat-cor-library-api-pip-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f31f1c2be0054fd6bd","_id":"561463fb36058c8c64ac2209"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"dmp api","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/api/fermat-cor-library-api-dmp-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f31f1c2be0054fd6c4","_id":"561463fb36058c8c64ac221a"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"wpd api","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/api/fermat-cor-library-api-wpd-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f31f1c2be0054fd6cb","_id":"561463fc36058c8c64ac2227"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"dap api","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/api/fermat-cor-library-api-dap-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f31f1c2be0054fd6d2","_id":"561463fc36058c8c64ac2234"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"mkt api","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/api/fermat-cor-library-api-mkt-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f31f1c2be0054fd6d9","_id":"561463fc36058c8c64ac2241"},{"_platfrm_id":"561463f536058c8c64ac2061","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2190","name":"cdn api","type":"library","description":"","difficulty":0,"code_level":"concept","repo_dir":"COR/library/api/fermat-cor-library-api-cdn-api-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f31f1c2be0054fd6e0","_id":"561463fc36058c8c64ac224e"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"shell","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/android/sub_app/fermat-pip-android-sub-app-shell-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f31f1c2be0054fd6ea","_id":"561463fd36058c8c64ac225f"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"designer","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/android/sub_app/fermat-pip-android-sub-app-designer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f41f1c2be0054fd6f1","_id":"561463fd36058c8c64ac226c"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"developer","type":"android","description":"","difficulty":5,"code_level":"production","repo_dir":"PIP/android/sub_app/fermat-pip-android-sub-app-developer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f41f1c2be0054fd6fc","_id":"561463fd36058c8c64ac2279"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"technical support","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/android/sub_app/fermat-pip-android-sub-app-technical-support-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f41f1c2be0054fd703","_id":"561463fd36058c8c64ac228e"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"system monitor","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/android/sub_app/fermat-pip-android-sub-app-system-monitor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f41f1c2be0054fd70a","_id":"561463fe36058c8c64ac229b"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"feedback","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/android/sub_app/fermat-pip-android-sub-app-feedback-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f41f1c2be0054fd711","_id":"561463fe36058c8c64ac22a8"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"reviews","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/android/sub_app/fermat-pip-android-sub-app-reviews-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f41f1c2be0054fd718","_id":"561463fe36058c8c64ac22b5"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2142","name":"sub app manager","type":"android","description":"","difficulty":3,"code_level":"production","repo_dir":"PIP/android/desktop/fermat-pip-android-desktop-sub-app-manager-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f41f1c2be0054fd724","_id":"561463fe36058c8c64ac22c3"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2145","name":"sub app runtime","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"PIP/plugin/engine/fermat-pip-plugin-engine-sub-app-runtime-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f51f1c2be0054fd730","_id":"561463fe36058c8c64ac22d9"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2145","name":"desktop runtime","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"PIP/plugin/engine/fermat-pip-plugin-engine-desktop-runtime-bitdubai","found":true,"devs":[{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f51f1c2be0054fd73b","_id":"561463ff36058c8c64ac22ee"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"shell","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/sub_app_module/fermat-pip-plugin-sub-app-module-shell-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f51f1c2be0054fd743","_id":"561463ff36058c8c64ac2304"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"designer","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/sub_app_module/fermat-pip-plugin-sub-app-module-designer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f51f1c2be0054fd74a","_id":"561463ff36058c8c64ac2311"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"developer","type":"plugin","description":"","difficulty":4,"code_level":"production","repo_dir":"PIP/plugin/sub_app_module/fermat-pip-plugin-sub-app-module-developer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f51f1c2be0054fd755","_id":"561463ff36058c8c64ac231e"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"technical support","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/sub_app_module/fermat-pip-plugin-sub-app-module-technical-support-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f51f1c2be0054fd75c","_id":"5614640036058c8c64ac2337"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"system monitor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/sub_app_module/fermat-pip-plugin-sub-app-module-system-monitor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f61f1c2be0054fd763","_id":"5614640036058c8c64ac2344"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"feedback","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/sub_app_module/fermat-pip-plugin-sub-app-module-feedback-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f61f1c2be0054fd76a","_id":"5614640036058c8c64ac2351"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"reviews","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/sub_app_module/fermat-pip-plugin-sub-app-module-reviews-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f61f1c2be0054fd771","_id":"5614640036058c8c64ac235e"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214e","name":"sub app manager","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"PIP/plugin/desktop_module/fermat-pip-plugin-desktop-module-sub-app-manager-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f61f1c2be0054fd77d","_id":"5614640136058c8c64ac236c"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"developer","type":"plugin","description":"","difficulty":6,"code_level":"production","repo_dir":"PIP/plugin/actor/fermat-pip-plugin-actor-developer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f61f1c2be0054fd789","_id":"5614640136058c8c64ac2382"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"designer","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/actor/fermat-pip-plugin-actor-designer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f61f1c2be0054fd790","_id":"5614640136058c8c64ac2397"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"intra user technical support","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/middleware/fermat-pip-plugin-middleware-intra-user-technical-support-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f61f1c2be0054fd798","_id":"5614640136058c8c64ac23a5"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"developer technical support","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/middleware/fermat-pip-plugin-middleware-developer-technical-support-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f71f1c2be0054fd79f","_id":"5614640236058c8c64ac23b2"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"developer error manager","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/middleware/fermat-pip-plugin-middleware-developer-error-manager-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f71f1c2be0054fd7a6","_id":"5614640236058c8c64ac23bf"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"sub app settings","type":"plugin","description":"","difficulty":2,"code_level":"development","repo_dir":"PIP/plugin/middleware/fermat-pip-plugin-middleware-sub-app-settings-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f71f1c2be0054fd7b1","_id":"5614640236058c8c64ac23cc"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"notification","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"PIP/plugin/middleware/fermat-pip-plugin-middleware-notification-bitdubai","found":false,"devs":[{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":60},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f71f1c2be0054fd7bc","_id":"5614640336058c8c64ac23e1"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2175","name":"location","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/world/fermat-pip-plugin-world-location-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f71f1c2be0054fd7c4","_id":"5614640336058c8c64ac23f7"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"developer","type":"plugin","description":"","difficulty":1,"code_level":"production","repo_dir":"PIP/plugin/identity/fermat-pip-plugin-identity-developer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f81f1c2be0054fd7d0","_id":"5614640336058c8c64ac2405"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"designer","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/identity/fermat-pip-plugin-identity-designer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f81f1c2be0054fd7d7","_id":"5614640436058c8c64ac241a"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"developer","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/actor_network_service/fermat-pip-plugin-actor-network-service-developer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f81f1c2be0054fd7df","_id":"5614640436058c8c64ac2428"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"sub app resources","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"PIP/plugin/network_service/fermat-pip-plugin-network-service-sub-app-resources-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710f81f1c2be0054fd7eb","_id":"5614640436058c8c64ac2436"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"system monitor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/network_service/fermat-pip-plugin-network-service-system-monitor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f91f1c2be0054fd7f2","_id":"5614640536058c8c64ac244b"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"error manager","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/network_service/fermat-pip-plugin-network-service-error-manager-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f91f1c2be0054fd7f9","_id":"5614640536058c8c64ac2458"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"messanger","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/network_service/fermat-pip-plugin-network-service-messanger-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f91f1c2be0054fd800","_id":"5614640536058c8c64ac2465"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"technical support","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/plugin/network_service/fermat-pip-plugin-network-service-technical-support-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f91f1c2be0054fd807","_id":"5614640536058c8c64ac2472"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2181","name":"plugin","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/addon/license/fermat-pip-addon-license-plugin-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f91f1c2be0054fd80f","_id":"5614640636058c8c64ac2480"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2184","name":"identity","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/addon/plugin/fermat-pip-addon-plugin-identity-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f91f1c2be0054fd817","_id":"5614640636058c8c64ac248e"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2184","name":"dependency","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/addon/plugin/fermat-pip-addon-plugin-dependency-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710f91f1c2be0054fd81e","_id":"5614640636058c8c64ac249b"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2187","name":"device user","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/addon/user/fermat-pip-addon-user-device-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fa1f1c2be0054fd82a","_id":"5614640636058c8c64ac24a9"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac218a","name":"local device","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/addon/hardware/fermat-pip-addon-hardware-local-device-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710fa1f1c2be0054fd832","_id":"5614640736058c8c64ac24bf"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac218a","name":"device network","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/addon/hardware/fermat-pip-addon-hardware-device-network-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710fa1f1c2be0054fd839","_id":"5614640736058c8c64ac24cc"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac218d","name":"error manager","type":"addon","description":"","difficulty":4,"code_level":"production","repo_dir":"PIP/addon/platform_service/fermat-pip-addon-platform-service-error-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fa1f1c2be0054fd845","_id":"5614640736058c8c64ac24da"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac218d","name":"event manager","type":"addon","description":"","difficulty":8,"code_level":"production","repo_dir":"PIP/addon/platform_service/fermat-pip-addon-platform-service-event-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fa1f1c2be0054fd850","_id":"5614640736058c8c64ac24f1"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac218d","name":"connectivity subsystem","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/addon/platform_service/fermat-pip-addon-platform-service-connectivity-subsystem-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710fb1f1c2be0054fd857","_id":"5614640836058c8c64ac2506"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac218d","name":"location subsystem","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/addon/platform_service/fermat-pip-addon-platform-service-location-subsystem-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710fb1f1c2be0054fd85e","_id":"5614640836058c8c64ac2513"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac218d","name":"power subsystem","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"PIP/addon/platform_service/fermat-pip-addon-platform-service-power-subsystem-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561710fb1f1c2be0054fd865","_id":"5614640836058c8c64ac2520"},{"_platfrm_id":"561463fc36058c8c64ac225b","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac218d","name":"platform info","type":"addon","description":"","difficulty":2,"code_level":"production","repo_dir":"PIP/addon/platform_service/fermat-pip-addon-platform-service-platform-info-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fb1f1c2be0054fd870","_id":"5614640836058c8c64ac252d"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"wallet factory","type":"android","description":"","difficulty":10,"code_level":"development","repo_dir":"WPD/android/sub_app/fermat-wpd-android-sub-app-wallet-factory-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fb1f1c2be0054fd87e","_id":"5614640936058c8c64ac2546"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"wallet publisher","type":"android","description":"","difficulty":6,"code_level":"development","repo_dir":"WPD/android/sub_app/fermat-wpd-android-sub-app-wallet-publisher-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fb1f1c2be0054fd889","_id":"5614640936058c8c64ac255d"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"wallet store","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"WPD/android/sub_app/fermat-wpd-android-sub-app-wallet-store-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fc1f1c2be0054fd894","_id":"5614640a36058c8c64ac2572"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2142","name":"wallet manager","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"WPD/android/desktop/fermat-wpd-android-desktop-wallet-manager-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fc1f1c2be0054fd8a0","_id":"5614640a36058c8c64ac258a"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2145","name":"wallet runtime","type":"plugin","description":"","difficulty":8,"code_level":"production","repo_dir":"WPD/plugin/engine/fermat-wpd-plugin-engine-wallet-runtime-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fc1f1c2be0054fd8ac","_id":"5614640a36058c8c64ac25a0"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"wallet factory","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"WPD/plugin/sub_app_module/fermat-wpd-plugin-sub-app-module-wallet-factory-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":80},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fc1f1c2be0054fd8b8","_id":"5614640b36058c8c64ac25b6"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"wallet publisher","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"WPD/plugin/sub_app_module/fermat-wpd-plugin-sub-app-module-wallet-publisher-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"rart3001","email":null,"name":"Roberto Requena","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/12099493?v=3","url":"https://github.com/Rart3001","bio":null,"upd_at":"56171a4d1f1c2be0054feb62","_id":"5614640b36058c8c64ac25d6"},"role":"author","scope":"implementation","percnt":80},{"dev":{"usrnm":"rart3001","email":null,"name":"Roberto Requena","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/12099493?v=3","url":"https://github.com/Rart3001","bio":null,"upd_at":"56171a4d1f1c2be0054feb62","_id":"5614640b36058c8c64ac25d6"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fd1f1c2be0054fd8c3","_id":"5614640b36058c8c64ac25cb"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"wallet store","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"WPD/plugin/sub_app_module/fermat-wpd-plugin-sub-app-module-wallet-store-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fd1f1c2be0054fd8ce","_id":"5614640c36058c8c64ac25e2"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214e","name":"wallet manager","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"WPD/plugin/desktop_module/fermat-wpd-plugin-desktop-module-wallet-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":80},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fd1f1c2be0054fd8da","_id":"5614640c36058c8c64ac25f8"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"publisher","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"WPD/plugin/actor/fermat-wpd-plugin-actor-publisher-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"rart3001","email":null,"name":"Roberto Requena","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/12099493?v=3","url":"https://github.com/Rart3001","bio":null,"upd_at":"56171a4d1f1c2be0054feb62","_id":"5614640b36058c8c64ac25d6"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"rart3001","email":null,"name":"Roberto Requena","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/12099493?v=3","url":"https://github.com/Rart3001","bio":null,"upd_at":"56171a4d1f1c2be0054feb62","_id":"5614640b36058c8c64ac25d6"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fe1f1c2be0054fd8e6","_id":"5614640d36058c8c64ac2610"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"wallet manager","type":"plugin","description":"","difficulty":8,"code_level":"production","repo_dir":"WPD/plugin/middleware/fermat-wpd-plugin-middleware-wallet-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":60},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":40},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fe1f1c2be0054fd8f4","_id":"5614640d36058c8c64ac2626"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"wallet factory","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"WPD/plugin/middleware/fermat-wpd-plugin-middleware-wallet-factory-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":85},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":15},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710fe1f1c2be0054fd901","_id":"5614640d36058c8c64ac2641"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"wallet store","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"WPD/plugin/middleware/fermat-wpd-plugin-middleware-wallet-store-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710ff1f1c2be0054fd90c","_id":"5614640e36058c8c64ac265a"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"wallet settings","type":"plugin","description":"","difficulty":3,"code_level":"development","repo_dir":"WPD/plugin/middleware/fermat-wpd-plugin-middleware-wallet-settings-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710ff1f1c2be0054fd917","_id":"5614640e36058c8c64ac266f"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"publisher","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"WPD/plugin/identity/fermat-wpd-plugin-identity-publisher-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710ff1f1c2be0054fd923","_id":"5614640e36058c8c64ac2685"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"wallet resources","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"WPD/plugin/network_service/fermat-wpd-plugin-network-service-wallet-resources-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561710ff1f1c2be0054fd92f","_id":"5614640f36058c8c64ac269d"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"wallet store","type":"plugin","description":"enables searching for intra users and conecting one to the other","difficulty":8,"code_level":"development","repo_dir":"WPD/plugin/network_service/fermat-wpd-plugin-network-service-wallet-store-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711001f1c2be0054fd93a","_id":"5614640f36058c8c64ac26b2"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"wallet statistics","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"WPD/plugin/network_service/fermat-wpd-plugin-network-service-wallet-statistics-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711001f1c2be0054fd941","_id":"5614640f36058c8c64ac26c7"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"wallet community","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"WPD/plugin/network_service/fermat-wpd-plugin-network-service-wallet-community-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711001f1c2be0054fd948","_id":"5614640f36058c8c64ac26d4"},{"_platfrm_id":"5614640936058c8c64ac2542","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2181","name":"wallet","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"WPD/addon/license/fermat-wpd-addon-license-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711001f1c2be0054fd950","_id":"5614640f36058c8c64ac26e2"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"bitcoin wallet","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"CCP/android/reference_wallet/fermat-ccp-android-reference-wallet-bitcoin-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711001f1c2be0054fd95e","_id":"5614641036058c8c64ac26f3"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"extra user","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCP/plugin/sub_app_module/fermat-ccp-plugin-sub-app-module-extra-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711021f1c2be0054fd99f","_id":"5614641136058c8c64ac2774"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"intra user","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CCP/plugin/actor/fermat-ccp-plugin-actor-intra-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711021f1c2be0054fd9ab","_id":"5614641136058c8c64ac2782"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"bitcoin loss protected","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"CCP/android/reference_wallet/fermat-ccp-android-reference-wallet-bitcoin-loss-protected-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711011f1c2be0054fd969","_id":"5614641036058c8c64ac2708"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"intra user identity","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"CCP/android/sub_app/fermat-ccp-android-sub-app-intra-user-identity-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711011f1c2be0054fd975","_id":"5614641036058c8c64ac271e"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"intra user community","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"CCP/android/sub_app/fermat-ccp-android-sub-app-intra-user-community-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711011f1c2be0054fd980","_id":"5614641036058c8c64ac2733"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"crypto wallet","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CCP/plugin/wallet_module/fermat-ccp-plugin-wallet-module-crypto-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711011f1c2be0054fd98c","_id":"5614641136058c8c64ac2749"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"intra user","type":"plugin","description":"","difficulty":2,"code_level":"development","repo_dir":"CCP/plugin/sub_app_module/fermat-ccp-plugin-sub-app-module-intra-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711021f1c2be0054fd998","_id":"5614641136058c8c64ac275f"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"extra user","type":"plugin","description":"","difficulty":4,"code_level":"production","repo_dir":"CCP/plugin/actor/fermat-ccp-plugin-actor-extra-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711031f1c2be0054fd9b6","_id":"5614641236058c8c64ac2797"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"wallet contacts","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CCP/plugin/middleware/fermat-ccp-plugin-middleware-wallet-contacts-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711031f1c2be0054fd9c2","_id":"5614641236058c8c64ac27ad"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215a","name":"crypto request","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CCP/plugin/request/fermat-ccp-plugin-request-crypto-request-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711031f1c2be0054fd9ce","_id":"5614641236058c8c64ac27c3"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"incoming device user","type":"plugin","description":"","difficulty":1,"code_level":"concept","repo_dir":"CCP/plugin/crypto_money_transaction/fermat-ccp-plugin-crypto-money-transaction-incoming-device-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711031f1c2be0054fd9d6","_id":"5614641336058c8c64ac27d9"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"incoming extra actor","type":"plugin","description":"","difficulty":10,"code_level":"production","repo_dir":"CCP/plugin/crypto_money_transaction/fermat-ccp-plugin-crypto-money-transaction-incoming-extra-actor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711041f1c2be0054fd9e1","_id":"5614641336058c8c64ac27e6"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"incoming intra actor","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"CCP/plugin/crypto_money_transaction/fermat-ccp-plugin-crypto-money-transaction-incoming-intra-actor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711041f1c2be0054fd9ec","_id":"5614641336058c8c64ac27fd"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"intra wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCP/plugin/crypto_money_transaction/fermat-ccp-plugin-crypto-money-transaction-intra-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711041f1c2be0054fd9f3","_id":"5614641336058c8c64ac2812"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"outgoing device user","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCP/plugin/crypto_money_transaction/fermat-ccp-plugin-crypto-money-transaction-outgoing-device-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711041f1c2be0054fd9fa","_id":"5614641436058c8c64ac281f"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"outgoing extra actor","type":"plugin","description":"","difficulty":10,"code_level":"production","repo_dir":"CCP/plugin/crypto_money_transaction/fermat-ccp-plugin-crypto-money-transaction-outgoing-extra-actor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711041f1c2be0054fda05","_id":"5614641436058c8c64ac282c"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"outgoin intra actor","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"CCP/plugin/crypto_money_transaction/fermat-ccp-plugin-crypto-money-transaction-outgoin-intra-actor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711041f1c2be0054fda10","_id":"5614641436058c8c64ac2841"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"inter account","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCP/plugin/crypto_money_transaction/fermat-ccp-plugin-crypto-money-transaction-inter-account-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711041f1c2be0054fda17","_id":"5614641436058c8c64ac2856"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216f","name":"multi account","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCP/plugin/composite_wallet/fermat-ccp-plugin-composite-wallet-multi-account-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711051f1c2be0054fda1f","_id":"5614641536058c8c64ac2864"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"bitcoin wallet","type":"plugin","description":"","difficulty":4,"code_level":"production","repo_dir":"CCP/plugin/wallet/fermat-ccp-plugin-wallet-bitcoin-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":60},{"dev":{"usrnm":"jorgegonzalez","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/586130?v=3","url":"https://github.com/JorgeGonzalez","bio":null,"upd_at":"56147cf0c9e113c46518db35","_id":"5614641536058c8c64ac2881"},"role":"author","scope":"implementation","percnt":10},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":30},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711051f1c2be0054fda2f","_id":"5614641536058c8c64ac2872"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"bitcoin loss protected","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CCP/plugin/wallet/fermat-ccp-plugin-wallet-bitcoin-loss-protected-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711051f1c2be0054fda3a","_id":"5614641536058c8c64ac2891"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2175","name":"crypto index","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CCP/plugin/world/fermat-ccp-plugin-world-crypto-index-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"laderuner","email":"sonnik42@hotmail.com","name":"Francisco Javier Arce","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/3421830?v=3","url":"https://github.com/laderuner","bio":null,"upd_at":"56147cf0c9e113c46518db37","_id":"5614641636058c8c64ac28b2"},"role":"author","scope":"implementation","percnt":60},{"dev":{"usrnm":"laderuner","email":"sonnik42@hotmail.com","name":"Francisco Javier Arce","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/3421830?v=3","url":"https://github.com/laderuner","bio":null,"upd_at":"56147cf0c9e113c46518db37","_id":"5614641636058c8c64ac28b2"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711051f1c2be0054fda46","_id":"5614641536058c8c64ac28a7"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2175","name":"blockchain info","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCP/plugin/world/fermat-ccp-plugin-world-blockchain-info-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711051f1c2be0054fda4d","_id":"5614641636058c8c64ac28be"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2175","name":"coinapult","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCP/plugin/world/fermat-ccp-plugin-world-coinapult-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711051f1c2be0054fda54","_id":"5614641636058c8c64ac28cb"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2175","name":"shape shift","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCP/plugin/world/fermat-ccp-plugin-world-shape-shift-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711051f1c2be0054fda5b","_id":"5614641636058c8c64ac28d8"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2175","name":"coinbase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCP/plugin/world/fermat-ccp-plugin-world-coinbase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711061f1c2be0054fda62","_id":"5614641636058c8c64ac28e5"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"intra user","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CCP/plugin/identity/fermat-ccp-plugin-identity-intra-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":70},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":30},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711061f1c2be0054fda70","_id":"5614641636058c8c64ac28f3"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"intra user","type":"plugin","description":"enables searching for intra users and conecting one to the other","difficulty":6,"code_level":"development","repo_dir":"CCP/plugin/actor_network_service/fermat-ccp-plugin-actor-network-service-intra-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"unit-tests","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711061f1c2be0054fda7e","_id":"5614641736058c8c64ac290d"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"crypto address","type":"plugin","description":"enables the underground exchange of crypto addresses","difficulty":5,"code_level":"development","repo_dir":"CCP/plugin/network_service/fermat-ccp-plugin-network-service-crypto-address-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711061f1c2be0054fda8a","_id":"5614641736058c8c64ac2927"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"crypto request","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CCP/plugin/network_service/fermat-ccp-plugin-network-service-crypto-request-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711071f1c2be0054fda95","_id":"5614641736058c8c64ac293c"},{"_platfrm_id":"5614641036058c8c64ac26ef","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"crypto transmission","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CCP/plugin/network_service/fermat-ccp-plugin-network-service-crypto-transmission-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711071f1c2be0054fdaa0","_id":"5614641836058c8c64ac2951"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"crypto commodity money","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"CCM/android/reference_wallet/fermat-ccm-android-reference-wallet-crypto-commodity-money-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711071f1c2be0054fdaae","_id":"5614641836058c8c64ac296a"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"discount wallet","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"CCM/android/reference_wallet/fermat-ccm-android-reference-wallet-discount-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711071f1c2be0054fdab9","_id":"5614641836058c8c64ac297f"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215a","name":"money request","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CCM/plugin/request/fermat-ccm-plugin-request-money-request-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711071f1c2be0054fdac5","_id":"5614641936058c8c64ac2995"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"incoming device user","type":"plugin","description":"","difficulty":1,"code_level":"concept","repo_dir":"CCM/plugin/crypto_money_transaction/fermat-ccm-plugin-crypto-money-transaction-incoming-device-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711081f1c2be0054fdacd","_id":"5614641936058c8c64ac29ab"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"incoming extra actor","type":"plugin","description":"","difficulty":10,"code_level":"production","repo_dir":"CCM/plugin/crypto_money_transaction/fermat-ccm-plugin-crypto-money-transaction-incoming-extra-actor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711081f1c2be0054fdad8","_id":"5614641936058c8c64ac29b8"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"incoming intra actor","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"CCM/plugin/crypto_money_transaction/fermat-ccm-plugin-crypto-money-transaction-incoming-intra-actor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711081f1c2be0054fdae3","_id":"5614641936058c8c64ac29cd"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"intra wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCM/plugin/crypto_money_transaction/fermat-ccm-plugin-crypto-money-transaction-intra-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711081f1c2be0054fdaea","_id":"5614641a36058c8c64ac29e2"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"outgoing device user","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCM/plugin/crypto_money_transaction/fermat-ccm-plugin-crypto-money-transaction-outgoing-device-user-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711081f1c2be0054fdaf1","_id":"5614641a36058c8c64ac29ef"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"outgoing extra actor","type":"plugin","description":"","difficulty":10,"code_level":"production","repo_dir":"CCM/plugin/crypto_money_transaction/fermat-ccm-plugin-crypto-money-transaction-outgoing-extra-actor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711081f1c2be0054fdafc","_id":"5614641a36058c8c64ac29fc"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"outgoin intra actor","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"CCM/plugin/crypto_money_transaction/fermat-ccm-plugin-crypto-money-transaction-outgoin-intra-actor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711091f1c2be0054fdb07","_id":"5614641a36058c8c64ac2a11"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"inter account","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCM/plugin/crypto_money_transaction/fermat-ccm-plugin-crypto-money-transaction-inter-account-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711091f1c2be0054fdb0e","_id":"5614641b36058c8c64ac2a26"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216f","name":"multi account","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CCM/plugin/composite_wallet/fermat-ccm-plugin-composite-wallet-multi-account-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711091f1c2be0054fdb16","_id":"5614641b36058c8c64ac2a34"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"crypto commodity money","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CCM/plugin/wallet/fermat-ccm-plugin-wallet-crypto-commodity-money-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nattyco","email":"natalia_veronica_c@hotmail.com","name":"Natalia Cortez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10051490?v=3","url":"https://github.com/nattyco","bio":null,"upd_at":"56171a4d1f1c2be0054feb4e","_id":"5614640036058c8c64ac232f"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711091f1c2be0054fdb22","_id":"5614641b36058c8c64ac2a42"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"discount wallet","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"CCM/plugin/wallet/fermat-ccm-plugin-wallet-discount-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711091f1c2be0054fdb2d","_id":"5614641b36058c8c64ac2a57"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"money request","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CCM/plugin/network_service/fermat-ccm-plugin-network-service-money-request-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"lnacosta","email":null,"name":"León","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/7293791?v=3","url":"https://github.com/lnacosta","bio":null,"upd_at":"56171a4d1f1c2be0054feb53","_id":"561463f536058c8c64ac2078"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"5617110a1f1c2be0054fdb39","_id":"5614641b36058c8c64ac2a6d"},{"_platfrm_id":"5614641836058c8c64ac2966","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"money transmission","type":"plugin","description":"","difficulty":5,"code_level":"development","repo_dir":"CCM/plugin/network_service/fermat-ccm-plugin-network-service-money-transmission-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"ezequielpostan","email":null,"name":"Ezequiel Postan","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/6744814?v=3","url":"https://github.com/EzequielPostan","bio":null,"upd_at":"56147cf0c9e113c46518db33","_id":"5614641336058c8c64ac27f1"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"5617110a1f1c2be0054fdb44","_id":"5614641c36058c8c64ac2a82"},{"_platfrm_id":"5614641c36058c8c64ac2a97","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"bank notes","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"BNP/android/reference_wallet/fermat-bnp-android-reference-wallet-bank-notes-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110a1f1c2be0054fdb4e","_id":"5614641c36058c8c64ac2a9b"},{"_platfrm_id":"5614641c36058c8c64ac2a97","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"bank notes wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BNP/plugin/wallet_module/fermat-bnp-plugin-wallet-module-bank-notes-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110a1f1c2be0054fdb56","_id":"5614641c36058c8c64ac2aa9"},{"_platfrm_id":"5614641c36058c8c64ac2a97","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"bank notes","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BNP/plugin/middleware/fermat-bnp-plugin-middleware-bank-notes-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110a1f1c2be0054fdb5e","_id":"5614641c36058c8c64ac2ab7"},{"_platfrm_id":"5614641c36058c8c64ac2a97","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"bank notes","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"BNP/plugin/wallet/fermat-bnp-plugin-wallet-bank-notes-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110a1f1c2be0054fdb66","_id":"5614641c36058c8c64ac2ac5"},{"_platfrm_id":"5614641c36058c8c64ac2a97","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"bank notes","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BNP/plugin/network_service/fermat-bnp-plugin-network-service-bank-notes-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110b1f1c2be0054fdb6e","_id":"5614641d36058c8c64ac2ad3"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"shop wallet","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/android/reference_wallet/fermat-shp-android-reference-wallet-shop-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110b1f1c2be0054fdb78","_id":"5614641d36058c8c64ac2ae4"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"brand wallet","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/android/reference_wallet/fermat-shp-android-reference-wallet-brand-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110b1f1c2be0054fdb7f","_id":"5614641d36058c8c64ac2af1"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"retailer wallet","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/android/reference_wallet/fermat-shp-android-reference-wallet-retailer-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110b1f1c2be0054fdb86","_id":"5614641d36058c8c64ac2afe"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"shop","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/android/sub_app/fermat-shp-android-sub-app-shop-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110b1f1c2be0054fdb8e","_id":"5614641d36058c8c64ac2b0c"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"brand","type":"android","description":"","difficulty":6,"code_level":"concept","repo_dir":"SHP/android/sub_app/fermat-shp-android-sub-app-brand-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110b1f1c2be0054fdb95","_id":"5614641e36058c8c64ac2b19"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"retailer","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/android/sub_app/fermat-shp-android-sub-app-retailer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110b1f1c2be0054fdb9c","_id":"5614641e36058c8c64ac2b26"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"shop wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/wallet_module/fermat-shp-plugin-wallet-module-shop-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110b1f1c2be0054fdba4","_id":"5614641e36058c8c64ac2b34"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"brand wallet","type":"plugin","description":"","difficulty":3,"code_level":"concept","repo_dir":"SHP/plugin/wallet_module/fermat-shp-plugin-wallet-module-brand-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110c1f1c2be0054fdbab","_id":"5614641e36058c8c64ac2b41"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"retailer wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/wallet_module/fermat-shp-plugin-wallet-module-retailer-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110c1f1c2be0054fdbb2","_id":"5614641e36058c8c64ac2b4e"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"shop","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/sub_app_module/fermat-shp-plugin-sub-app-module-shop-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110c1f1c2be0054fdbba","_id":"5614641f36058c8c64ac2b5c"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"brand","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"SHP/plugin/sub_app_module/fermat-shp-plugin-sub-app-module-brand-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110c1f1c2be0054fdbc1","_id":"5614641f36058c8c64ac2b69"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"retailer","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/sub_app_module/fermat-shp-plugin-sub-app-module-retailer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110c1f1c2be0054fdbc8","_id":"5614641f36058c8c64ac2b76"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"shop","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/actor/fermat-shp-plugin-actor-shop-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110c1f1c2be0054fdbd0","_id":"5614641f36058c8c64ac2b84"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"brand","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"SHP/plugin/actor/fermat-shp-plugin-actor-brand-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110c1f1c2be0054fdbd7","_id":"5614641f36058c8c64ac2b91"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"retailer","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/actor/fermat-shp-plugin-actor-retailer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110c1f1c2be0054fdbde","_id":"5614642036058c8c64ac2b9e"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/crypto_money_transaction/fermat-shp-plugin-crypto-money-transaction-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110d1f1c2be0054fdbe6","_id":"5614642036058c8c64ac2bac"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2163","name":"sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/crypto_money_transaction/fermat-shp-plugin-crypto-money-transaction-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110d1f1c2be0054fdbed","_id":"5614642036058c8c64ac2bb9"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"shop wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/wallet/fermat-shp-plugin-wallet-shop-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110d1f1c2be0054fdbf5","_id":"5614642036058c8c64ac2bc7"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"brand wallet","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"SHP/plugin/wallet/fermat-shp-plugin-wallet-brand-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110d1f1c2be0054fdbfc","_id":"5614642036058c8c64ac2bd4"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"retailer wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/wallet/fermat-shp-plugin-wallet-retailer-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110d1f1c2be0054fdc03","_id":"5614642136058c8c64ac2be1"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"shop","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/identity/fermat-shp-plugin-identity-shop-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110d1f1c2be0054fdc0b","_id":"5614642136058c8c64ac2bef"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"brand","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"SHP/plugin/identity/fermat-shp-plugin-identity-brand-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110d1f1c2be0054fdc12","_id":"5614642136058c8c64ac2bfc"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"retailer","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/identity/fermat-shp-plugin-identity-retailer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110d1f1c2be0054fdc19","_id":"5614642136058c8c64ac2c09"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"shop","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/actor_network_service/fermat-shp-plugin-actor-network-service-shop-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110d1f1c2be0054fdc21","_id":"5614642136058c8c64ac2c17"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"brand","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"SHP/plugin/actor_network_service/fermat-shp-plugin-actor-network-service-brand-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110e1f1c2be0054fdc28","_id":"5614642236058c8c64ac2c24"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"retailer","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/actor_network_service/fermat-shp-plugin-actor-network-service-retailer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110e1f1c2be0054fdc2f","_id":"5614642236058c8c64ac2c31"},{"_platfrm_id":"5614641d36058c8c64ac2ae0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"purchase transmission","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"SHP/plugin/network_service/fermat-shp-plugin-network-service-purchase-transmission-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617110e1f1c2be0054fdc37","_id":"5614642236058c8c64ac2c3f"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"asset issuer","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"DAP/android/reference_wallet/fermat-dap-android-reference-wallet-asset-issuer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"5617110e1f1c2be0054fdc45","_id":"5614642236058c8c64ac2c50"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"asset user","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"DAP/android/reference_wallet/fermat-dap-android-reference-wallet-asset-user-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"5617110e1f1c2be0054fdc50","_id":"5614642336058c8c64ac2c65"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"redeem point","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"DAP/android/reference_wallet/fermat-dap-android-reference-wallet-redeem-point-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"5617110f1f1c2be0054fdc5b","_id":"5614642336058c8c64ac2c7a"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"asset factory","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/android/sub_app/fermat-dap-android-sub-app-asset-factory-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"5617110f1f1c2be0054fdc67","_id":"5614642336058c8c64ac2c90"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"asset issuer community","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/android/sub_app/fermat-dap-android-sub-app-asset-issuer-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"5617110f1f1c2be0054fdc72","_id":"5614642436058c8c64ac2ca5"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"asset user community","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/android/sub_app/fermat-dap-android-sub-app-asset-user-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"5617110f1f1c2be0054fdc7d","_id":"5614642436058c8c64ac2cba"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"redeem point community","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/android/sub_app/fermat-dap-android-sub-app-redeem-point-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"fvasquezjatar","email":"fvasquezjatar@gmail.com","name":"Francisco Vasquez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8290154?v=3","url":"https://github.com/fvasquezjatar","bio":null,"upd_at":"56171a4d1f1c2be0054feb51","_id":"5614640936058c8c64ac2551"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711101f1c2be0054fdc88","_id":"5614642436058c8c64ac2ccf"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2142","name":"sub app manager","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/android/desktop/fermat-dap-android-desktop-sub-app-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711101f1c2be0054fdc92","_id":"5614642536058c8c64ac2ce5"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2142","name":"wallet manager","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/android/desktop/fermat-dap-android-desktop-wallet-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"furszy","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/5377650?v=3","url":"https://github.com/furszy","bio":null,"upd_at":"56147cf0c9e113c46518db21","_id":"561463f636058c8c64ac209f"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711101f1c2be0054fdc9b","_id":"5614642536058c8c64ac2cf6"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"asset issuer","type":"plugin","description":"","difficulty":3,"code_level":"development","repo_dir":"DAP/plugin/wallet_module/fermat-dap-plugin-wallet-module-asset-issuer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711101f1c2be0054fdca5","_id":"5614642536058c8c64ac2d08"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"asset user","type":"plugin","description":"","difficulty":3,"code_level":"development","repo_dir":"DAP/plugin/wallet_module/fermat-dap-plugin-wallet-module-asset-user-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711101f1c2be0054fdcae","_id":"5614642636058c8c64ac2d19"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"redeem point","type":"plugin","description":"","difficulty":3,"code_level":"development","repo_dir":"DAP/plugin/wallet_module/fermat-dap-plugin-wallet-module-redeem-point-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711111f1c2be0054fdcb7","_id":"5614642636058c8c64ac2d2a"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"asset factory","type":"plugin","description":"","difficulty":2,"code_level":"development","repo_dir":"DAP/plugin/sub_app_module/fermat-dap-plugin-sub-app-module-asset-factory-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711111f1c2be0054fdcc3","_id":"5614642636058c8c64ac2d3c"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"asset issuer community","type":"plugin","description":"","difficulty":2,"code_level":"development","repo_dir":"DAP/plugin/sub_app_module/fermat-dap-plugin-sub-app-module-asset-issuer-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711111f1c2be0054fdcce","_id":"5614642736058c8c64ac2d51"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"asset user community","type":"plugin","description":"","difficulty":2,"code_level":"development","repo_dir":"DAP/plugin/sub_app_module/fermat-dap-plugin-sub-app-module-asset-user-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711111f1c2be0054fdcd9","_id":"5614642736058c8c64ac2d66"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"redeem point community","type":"plugin","description":"","difficulty":2,"code_level":"development","repo_dir":"DAP/plugin/sub_app_module/fermat-dap-plugin-sub-app-module-redeem-point-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711121f1c2be0054fdce4","_id":"5614642736058c8c64ac2d7b"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214e","name":"sub app manager","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/desktop_module/fermat-dap-plugin-desktop-module-sub-app-manager-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711121f1c2be0054fdcee","_id":"5614642836058c8c64ac2d91"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214e","name":"wallet manager","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/desktop_module/fermat-dap-plugin-desktop-module-wallet-manager-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711121f1c2be0054fdcf7","_id":"5614642836058c8c64ac2da0"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"asset issuer","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/actor/fermat-dap-plugin-actor-asset-issuer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711121f1c2be0054fdd01","_id":"5614642836058c8c64ac2db0"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"asset user","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/actor/fermat-dap-plugin-actor-asset-user-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711121f1c2be0054fdd0a","_id":"5614642936058c8c64ac2dc1"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"redeem point","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/actor/fermat-dap-plugin-actor-redeem-point-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711131f1c2be0054fdd13","_id":"5614642936058c8c64ac2dd2"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"asset factory","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"DAP/plugin/middleware/fermat-dap-plugin-middleware-asset-factory-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"author","scope":"implementation","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"mantainer","percnt":0}],"certs":[],"life_cycle":[],"upd_at":"561711131f1c2be0054fdd1f","_id":"5614642936058c8c64ac2de4"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"asset distribution","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"DAP/plugin/digital_asset_transaction/fermat-dap-plugin-digital-asset-transaction-asset-distribution-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711131f1c2be0054fdd29","_id":"5614642936058c8c64ac2dfa"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"asset reception","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"DAP/plugin/digital_asset_transaction/fermat-dap-plugin-digital-asset-transaction-asset-reception-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711131f1c2be0054fdd32","_id":"5614642a36058c8c64ac2e0b"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"asset issuing","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"DAP/plugin/digital_asset_transaction/fermat-dap-plugin-digital-asset-transaction-asset-issuing-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711131f1c2be0054fdd3b","_id":"5614642a36058c8c64ac2e1c"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"issuer redemption","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"DAP/plugin/digital_asset_transaction/fermat-dap-plugin-digital-asset-transaction-issuer-redemption-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711141f1c2be0054fdd44","_id":"5614642a36058c8c64ac2e2d"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"user redemption","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"DAP/plugin/digital_asset_transaction/fermat-dap-plugin-digital-asset-transaction-user-redemption-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711141f1c2be0054fdd4d","_id":"5614642a36058c8c64ac2e3e"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"redeem point redemption","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"DAP/plugin/digital_asset_transaction/fermat-dap-plugin-digital-asset-transaction-redeem-point-redemption-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711141f1c2be0054fdd56","_id":"5614642a36058c8c64ac2e4f"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"asset appropriation","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"DAP/plugin/digital_asset_transaction/fermat-dap-plugin-digital-asset-transaction-asset-appropriation-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711141f1c2be0054fdd5f","_id":"5614642a36058c8c64ac2e60"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"appropriation stats","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"DAP/plugin/digital_asset_transaction/fermat-dap-plugin-digital-asset-transaction-appropriation-stats-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"darkestpriest","email":"darkpriestrelative@gmail.com","name":"Manuel Pérez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/10060413?v=3","url":"https://github.com/darkestpriest","bio":null,"upd_at":"56171a4d1f1c2be0054feb57","_id":"5614640c36058c8c64ac2603"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711141f1c2be0054fdd68","_id":"5614642a36058c8c64ac2e71"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"assets issuer wallet","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/wallet/fermat-dap-plugin-wallet-assets-issuer-wallet-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711151f1c2be0054fdd72","_id":"5614642b36058c8c64ac2e83"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"assets user wallet","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/wallet/fermat-dap-plugin-wallet-assets-user-wallet-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711151f1c2be0054fdd7b","_id":"5614642b36058c8c64ac2e94"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"redeem point wallet","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/wallet/fermat-dap-plugin-wallet-redeem-point-wallet-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"franklinmarcano1970","email":"franklinmarcano1970@gmail.com","name":"Franklin Marcano","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/8689068?v=3","url":"https://github.com/franklinmarcano1970","bio":null,"upd_at":"56171a4d1f1c2be0054feb5e","_id":"5614640d36058c8c64ac2639"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711151f1c2be0054fdd84","_id":"5614642b36058c8c64ac2ea5"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"asset issuer","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/identity/fermat-dap-plugin-identity-asset-issuer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711151f1c2be0054fdd8e","_id":"5614642b36058c8c64ac2eb7"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"asset user","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/identity/fermat-dap-plugin-identity-asset-user-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711161f1c2be0054fdd97","_id":"5614642b36058c8c64ac2ec8"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"redeem point","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"DAP/plugin/identity/fermat-dap-plugin-identity-redeem-point-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nindriago","email":null,"name":"Nerio Indriago","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13187461?v=3","url":"https://github.com/nindriago","bio":null,"upd_at":"56171a4d1f1c2be0054feb55","_id":"5614640e36058c8c64ac2690"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711161f1c2be0054fdda0","_id":"5614642b36058c8c64ac2ed9"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"asset issuer","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"DAP/plugin/actor_network_service/fermat-dap-plugin-actor-network-service-asset-issuer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"rart3001","email":null,"name":"Roberto Requena","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/12099493?v=3","url":"https://github.com/Rart3001","bio":null,"upd_at":"56171a4d1f1c2be0054feb62","_id":"5614640b36058c8c64ac25d6"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711161f1c2be0054fddaa","_id":"5614642c36058c8c64ac2eeb"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"asset user","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"DAP/plugin/actor_network_service/fermat-dap-plugin-actor-network-service-asset-user-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711161f1c2be0054fddb3","_id":"5614642c36058c8c64ac2efc"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"redeem point","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"DAP/plugin/actor_network_service/fermat-dap-plugin-actor-network-service-redeem-point-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"acostarodrigo","email":null,"name":"Rodrigo","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9518556?v=3","url":"https://github.com/acostarodrigo","bio":null,"upd_at":"56147cf0c9e113c46518db1d","_id":"5614640036058c8c64ac2329"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711161f1c2be0054fddbc","_id":"5614642c36058c8c64ac2f0d"},{"_platfrm_id":"5614642236058c8c64ac2c4c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"asset transmission","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"DAP/plugin/network_service/fermat-dap-plugin-network-service-asset-transmission-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"rart3001","email":null,"name":"Roberto Requena","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/12099493?v=3","url":"https://github.com/Rart3001","bio":null,"upd_at":"56171a4d1f1c2be0054feb62","_id":"5614640b36058c8c64ac25d6"},"role":"author","scope":"implementation","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711171f1c2be0054fddc6","_id":"5614642c36058c8c64ac2f1f"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"wallet branding","type":"android","description":"","difficulty":10,"code_level":"concept","repo_dir":"MKT/android/sub_app/fermat-mkt-android-sub-app-wallet-branding-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711171f1c2be0054fddd0","_id":"5614642c36058c8c64ac2f34"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"marketer","type":"android","description":"","difficulty":6,"code_level":"concept","repo_dir":"MKT/android/sub_app/fermat-mkt-android-sub-app-marketer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711171f1c2be0054fddd7","_id":"5614642c36058c8c64ac2f41"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"voucher wallet","type":"android","description":"","difficulty":8,"code_level":"concept","repo_dir":"MKT/android/reference_wallet/fermat-mkt-android-reference-wallet-voucher-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711171f1c2be0054fdddf","_id":"5614642c36058c8c64ac2f4f"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"coupon wallet","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"MKT/android/reference_wallet/fermat-mkt-android-reference-wallet-coupon-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711171f1c2be0054fdde6","_id":"5614642c36058c8c64ac2f5c"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"discount wallet","type":"android","description":"","difficulty":8,"code_level":"concept","repo_dir":"MKT/android/reference_wallet/fermat-mkt-android-reference-wallet-discount-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711181f1c2be0054fdded","_id":"5614642c36058c8c64ac2f69"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"wallet branding","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"MKT/plugin/sub_app_module/fermat-mkt-plugin-sub-app-module-wallet-branding-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711181f1c2be0054fddf5","_id":"5614642d36058c8c64ac2f77"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"marketer","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"MKT/plugin/sub_app_module/fermat-mkt-plugin-sub-app-module-marketer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711181f1c2be0054fddfc","_id":"5614642d36058c8c64ac2f84"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"marketer","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"MKT/plugin/actor/fermat-mkt-plugin-actor-marketer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711181f1c2be0054fde04","_id":"5614642d36058c8c64ac2f92"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"voucher wallet","type":"plugin","description":"","difficulty":3,"code_level":"concept","repo_dir":"MKT/plugin/wallet_module/fermat-mkt-plugin-wallet-module-voucher-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711181f1c2be0054fde0c","_id":"5614642d36058c8c64ac2fa0"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"coupon wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"MKT/plugin/wallet_module/fermat-mkt-plugin-wallet-module-coupon-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711181f1c2be0054fde13","_id":"5614642d36058c8c64ac2fad"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"discount wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"MKT/plugin/wallet_module/fermat-mkt-plugin-wallet-module-discount-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711191f1c2be0054fde1a","_id":"5614642d36058c8c64ac2fba"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"incoming voucher","type":"plugin","description":"","difficulty":6,"code_level":"concept","repo_dir":"MKT/plugin/digital_asset_transaction/fermat-mkt-plugin-digital-asset-transaction-incoming-voucher-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711191f1c2be0054fde22","_id":"5614642d36058c8c64ac2fc8"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"outgoing voucher","type":"plugin","description":"","difficulty":6,"code_level":"concept","repo_dir":"MKT/plugin/digital_asset_transaction/fermat-mkt-plugin-digital-asset-transaction-outgoing-voucher-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711191f1c2be0054fde29","_id":"5614642d36058c8c64ac2fd5"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"incoming coupon","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"MKT/plugin/digital_asset_transaction/fermat-mkt-plugin-digital-asset-transaction-incoming-coupon-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711191f1c2be0054fde30","_id":"5614642d36058c8c64ac2fe2"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"outgoing coupon","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"MKT/plugin/digital_asset_transaction/fermat-mkt-plugin-digital-asset-transaction-outgoing-coupon-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711191f1c2be0054fde37","_id":"5614642d36058c8c64ac2fef"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"incoming discount","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"MKT/plugin/digital_asset_transaction/fermat-mkt-plugin-digital-asset-transaction-incoming-discount-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711191f1c2be0054fde3e","_id":"5614642d36058c8c64ac2ffc"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2160","name":"outgoing discount","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"MKT/plugin/digital_asset_transaction/fermat-mkt-plugin-digital-asset-transaction-outgoing-discount-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711191f1c2be0054fde45","_id":"5614642e36058c8c64ac3009"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"voucher","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"MKT/plugin/wallet/fermat-mkt-plugin-wallet-voucher-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617111a1f1c2be0054fde4d","_id":"5614642e36058c8c64ac3017"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"coupon","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"MKT/plugin/wallet/fermat-mkt-plugin-wallet-coupon-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617111a1f1c2be0054fde54","_id":"5614642e36058c8c64ac3024"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"discount","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"MKT/plugin/wallet/fermat-mkt-plugin-wallet-discount-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617111a1f1c2be0054fde5b","_id":"5614642e36058c8c64ac3031"},{"_platfrm_id":"5614642c36058c8c64ac2f30","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"marketer","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"MKT/plugin/identity/fermat-mkt-plugin-identity-marketer-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617111a1f1c2be0054fde63","_id":"5614642e36058c8c64ac303f"},{"_platfrm_id":"5614642e36058c8c64ac304c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2166","name":"give cash on hand","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CSH/plugin/cash_money_transaction/fermat-csh-plugin-cash-money-transaction-give-cash-on-hand-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111b1f1c2be0054fde6f","_id":"5614642e36058c8c64ac3050"},{"_platfrm_id":"5614642e36058c8c64ac304c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2166","name":"receive cash on hand","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CSH/plugin/cash_money_transaction/fermat-csh-plugin-cash-money-transaction-receive-cash-on-hand-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111b1f1c2be0054fde78","_id":"5614642e36058c8c64ac3063"},{"_platfrm_id":"5614642e36058c8c64ac304c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2166","name":"send cash delivery","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CSH/plugin/cash_money_transaction/fermat-csh-plugin-cash-money-transaction-send-cash-delivery-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111b1f1c2be0054fde81","_id":"5614642e36058c8c64ac3074"},{"_platfrm_id":"5614642e36058c8c64ac304c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2166","name":"receive cash delivery","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CSH/plugin/cash_money_transaction/fermat-csh-plugin-cash-money-transaction-receive-cash-delivery-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111b1f1c2be0054fde8a","_id":"5614642e36058c8c64ac3085"},{"_platfrm_id":"5614642e36058c8c64ac304c","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"cash money","type":"plugin","description":"","difficulty":2,"code_level":"development","repo_dir":"CSH/plugin/wallet/fermat-csh-plugin-wallet-cash-money-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111c1f1c2be0054fde94","_id":"5614642e36058c8c64ac3097"},{"_platfrm_id":"5614642f36058c8c64ac30a8","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2169","name":"make offline bank transfer","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"BNK/plugin/bank_money_transaction/fermat-bnk-plugin-bank-money-transaction-make-offline-bank-transfer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111c1f1c2be0054fdea0","_id":"5614642f36058c8c64ac30ac"},{"_platfrm_id":"5614642f36058c8c64ac30a8","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2169","name":"receive offline bank transfer","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"BNK/plugin/bank_money_transaction/fermat-bnk-plugin-bank-money-transaction-receive-offline-bank-transfer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111c1f1c2be0054fdea9","_id":"5614642f36058c8c64ac30bd"},{"_platfrm_id":"5614642f36058c8c64ac30a8","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"bank money","type":"plugin","description":"","difficulty":2,"code_level":"development","repo_dir":"BNK/plugin/wallet/fermat-bnk-plugin-wallet-bank-money-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111c1f1c2be0054fdeb3","_id":"5614642f36058c8c64ac30cf"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"crypto broker","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/android/reference_wallet/fermat-cbp-android-reference-wallet-crypto-broker-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111c1f1c2be0054fdebf","_id":"5614642f36058c8c64ac30e4"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"crypto customer","type":"android","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/android/reference_wallet/fermat-cbp-android-reference-wallet-crypto-customer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111d1f1c2be0054fdec8","_id":"5614642f36058c8c64ac30f5"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"crypto broker identity","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/android/sub_app/fermat-cbp-android-sub-app-crypto-broker-identity-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111d1f1c2be0054fded2","_id":"5614642f36058c8c64ac3107"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"crypto broker community","type":"android","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/android/sub_app/fermat-cbp-android-sub-app-crypto-broker-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111d1f1c2be0054fdedb","_id":"5614643036058c8c64ac3118"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"crypto customer identity","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/android/sub_app/fermat-cbp-android-sub-app-crypto-customer-identity-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111d1f1c2be0054fdee4","_id":"5614643036058c8c64ac3129"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"crypto customer community","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/android/sub_app/fermat-cbp-android-sub-app-crypto-customer-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111d1f1c2be0054fdeed","_id":"5614643036058c8c64ac313a"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"customers","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/android/sub_app/fermat-cbp-android-sub-app-customers-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111d1f1c2be0054fdef6","_id":"5614643036058c8c64ac314b"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"suppliers","type":"android","description":"","difficulty":6,"code_level":"concept","repo_dir":"CBP/android/sub_app/fermat-cbp-android-sub-app-suppliers-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617111d1f1c2be0054fdefd","_id":"5614643136058c8c64ac315c"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2142","name":"sub app manager","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/android/desktop/fermat-cbp-android-desktop-sub-app-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111e1f1c2be0054fdf07","_id":"5614643136058c8c64ac316a"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2142","name":"wallet manager","type":"android","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/android/desktop/fermat-cbp-android-desktop-wallet-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"nelsonalfo","email":"nelsonalfo@gmail.com","name":"Nelson Ramirez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/1823627?v=3","url":"https://github.com/nelsonalfo","bio":null,"upd_at":"56171a4d1f1c2be0054feb59","_id":"5614640a36058c8c64ac257d"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111e1f1c2be0054fdf10","_id":"5614643136058c8c64ac317b"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"crypto broker","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/wallet_module/fermat-cbp-plugin-wallet-module-crypto-broker-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111e1f1c2be0054fdf1a","_id":"5614643136058c8c64ac318d"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"crypto customer","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/wallet_module/fermat-cbp-plugin-wallet-module-crypto-customer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111e1f1c2be0054fdf23","_id":"5614643136058c8c64ac31a0"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"crypto broker identity","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/sub_app_module/fermat-cbp-plugin-sub-app-module-crypto-broker-identity-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111e1f1c2be0054fdf2d","_id":"5614643236058c8c64ac31b2"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"crypto broker community","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/sub_app_module/fermat-cbp-plugin-sub-app-module-crypto-broker-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111e1f1c2be0054fdf36","_id":"5614643236058c8c64ac31c3"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"crypto customer identity","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/sub_app_module/fermat-cbp-plugin-sub-app-module-crypto-customer-identity-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111f1f1c2be0054fdf3f","_id":"5614643236058c8c64ac31d4"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"crypto customer community","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/sub_app_module/fermat-cbp-plugin-sub-app-module-crypto-customer-community-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111f1f1c2be0054fdf48","_id":"5614643236058c8c64ac31e5"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"customers","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/sub_app_module/fermat-cbp-plugin-sub-app-module-customers-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111f1f1c2be0054fdf51","_id":"5614643336058c8c64ac31f6"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"suppliers","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"CBP/plugin/sub_app_module/fermat-cbp-plugin-sub-app-module-suppliers-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617111f1f1c2be0054fdf58","_id":"5614643336058c8c64ac3207"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214e","name":"sub app manager","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/desktop_module/fermat-cbp-plugin-desktop-module-sub-app-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111f1f1c2be0054fdf62","_id":"5614643336058c8c64ac3215"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214e","name":"wallet manager","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/desktop_module/fermat-cbp-plugin-desktop-module-wallet-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"5617111f1f1c2be0054fdf6b","_id":"5614643336058c8c64ac3226"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"crypto broker","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/actor/fermat-cbp-plugin-actor-crypto-broker-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711201f1c2be0054fdf75","_id":"5614643336058c8c64ac3238"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"crypto customer","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/actor/fermat-cbp-plugin-actor-crypto-customer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711201f1c2be0054fdf7e","_id":"5614643436058c8c64ac3249"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"customer broker crypto money purchase","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/contract/fermat-cbp-plugin-contract-customer-broker-crypto-money-purchase-bitdubai","found":true,"devs":[{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711201f1c2be0054fdf88","_id":"5614643436058c8c64ac325b"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"customer broker cash money purchase","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/contract/fermat-cbp-plugin-contract-customer-broker-cash-money-purchase-bitdubai","found":true,"devs":[{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711201f1c2be0054fdf91","_id":"5614643436058c8c64ac326c"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"customer broker bank money purchase","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/contract/fermat-cbp-plugin-contract-customer-broker-bank-money-purchase-bitdubai","found":true,"devs":[{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711201f1c2be0054fdf9a","_id":"5614643436058c8c64ac327d"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"customer broker crypto money sale","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/contract/fermat-cbp-plugin-contract-customer-broker-crypto-money-sale-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711201f1c2be0054fdfa3","_id":"5614643536058c8c64ac328e"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"customer broker cash money sale","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/contract/fermat-cbp-plugin-contract-customer-broker-cash-money-sale-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711211f1c2be0054fdfac","_id":"5614643536058c8c64ac329f"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"customer broker bank money sale","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/contract/fermat-cbp-plugin-contract-customer-broker-bank-money-sale-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711211f1c2be0054fdfb5","_id":"5614643536058c8c64ac32b0"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"broker to broker","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CBP/plugin/contract/fermat-cbp-plugin-contract-broker-to-broker-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711211f1c2be0054fdfbc","_id":"5614643536058c8c64ac32c1"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"broker to wholesaler","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CBP/plugin/contract/fermat-cbp-plugin-contract-broker-to-wholesaler-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711211f1c2be0054fdfc3","_id":"5614643636058c8c64ac32ce"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215a","name":"customer broker purchase","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/request/fermat-cbp-plugin-request-customer-broker-purchase-bitdubai","found":true,"devs":[{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711211f1c2be0054fdfcd","_id":"5614643636058c8c64ac32dc"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215a","name":"customer broker sale","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/request/fermat-cbp-plugin-request-customer-broker-sale-bitdubai","found":true,"devs":[{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711211f1c2be0054fdfd6","_id":"5614643636058c8c64ac32ed"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"customers","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/middleware/fermat-cbp-plugin-middleware-customers-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711221f1c2be0054fdfe0","_id":"5614643636058c8c64ac32ff"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"wholesalers","type":"plugin","description":"","difficulty":4,"code_level":"concept","repo_dir":"CBP/plugin/middleware/fermat-cbp-plugin-middleware-wholesalers-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711221f1c2be0054fdfe9","_id":"5614643736058c8c64ac3310"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"crypto broker wallet identity","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/middleware/fermat-cbp-plugin-middleware-crypto-broker-wallet-identity-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711221f1c2be0054fdff2","_id":"5614643736058c8c64ac3321"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"wallet manager","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/middleware/fermat-cbp-plugin-middleware-wallet-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711221f1c2be0054fdffb","_id":"5614643736058c8c64ac3332"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"sub app manager","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/middleware/fermat-cbp-plugin-middleware-sub-app-manager-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"vlzangel","email":null,"name":null,"bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/13138418?v=3","url":"https://github.com/vlzangel","bio":null,"upd_at":"56147cf0c9e113c46518db3b","_id":"5614643136058c8c64ac3198"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711221f1c2be0054fe004","_id":"5614643836058c8c64ac3343"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2151","name":"crypto broker","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/agent/fermat-cbp-plugin-agent-crypto-broker-bitdubai","found":true,"devs":[{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711221f1c2be0054fe00e","_id":"5614643836058c8c64ac3355"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"crypto money stock replenishment","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-crypto-money-stock-replenishment-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711221f1c2be0054fe018","_id":"5614643836058c8c64ac3367"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"cash money stock replenishment","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-cash-money-stock-replenishment-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711231f1c2be0054fe021","_id":"5614643836058c8c64ac3378"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"bank money stock replenishment","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-bank-money-stock-replenishment-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711231f1c2be0054fe02a","_id":"5614643936058c8c64ac3389"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"customer broker crypto sale","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-customer-broker-crypto-sale-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711231f1c2be0054fe033","_id":"5614643936058c8c64ac339a"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"customer broker cash sale","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-customer-broker-cash-sale-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711231f1c2be0054fe03c","_id":"5614643936058c8c64ac33ab"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"customer broker bank sale","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-customer-broker-bank-sale-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711231f1c2be0054fe045","_id":"5614643a36058c8c64ac33bc"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"customer broker crypto purchase","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-customer-broker-crypto-purchase-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711231f1c2be0054fe04e","_id":"5614643a36058c8c64ac33cd"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"customer broker cash purchase","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-customer-broker-cash-purchase-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711241f1c2be0054fe057","_id":"5614643a36058c8c64ac33de"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"customer broker bank purchase","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-customer-broker-bank-purchase-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711241f1c2be0054fe060","_id":"5614643b36058c8c64ac33ef"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"whosale crypto sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-whosale-crypto-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711241f1c2be0054fe067","_id":"5614643b36058c8c64ac3400"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"whosale fiat sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CBP/plugin/business_transaction/fermat-cbp-plugin-business-transaction-whosale-fiat-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711241f1c2be0054fe06e","_id":"5614643b36058c8c64ac340d"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"crypto broker","type":"plugin","description":"","difficulty":2,"code_level":"development","repo_dir":"CBP/plugin/wallet/fermat-cbp-plugin-wallet-crypto-broker-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711241f1c2be0054fe078","_id":"5614643b36058c8c64ac341b"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"crypto broker","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/identity/fermat-cbp-plugin-identity-crypto-broker-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711241f1c2be0054fe082","_id":"5614643c36058c8c64ac342d"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"crypto customer","type":"plugin","description":"","difficulty":4,"code_level":"development","repo_dir":"CBP/plugin/identity/fermat-cbp-plugin-identity-crypto-customer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711241f1c2be0054fe08b","_id":"5614643c36058c8c64ac343e"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2175","name":"fiat index","type":"plugin","description":"","difficulty":6,"code_level":"development","repo_dir":"CBP/plugin/world/fermat-cbp-plugin-world-fiat-index-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"yalayn","email":"y.alayn@gmail.com","name":"Yordin Alayn","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/4664287?v=3","url":"https://github.com/yalayn","bio":null,"upd_at":"56171a4d1f1c2be0054feb65","_id":"5614642e36058c8c64ac305b"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711251f1c2be0054fe095","_id":"5614643c36058c8c64ac3450"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"crypto broker","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/plugin/actor_network_service/fermat-cbp-plugin-actor-network-service-crypto-broker-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711251f1c2be0054fe09f","_id":"5614643d36058c8c64ac3462"},{"_platfrm_id":"5614642f36058c8c64ac30e0","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"crypto customer","type":"plugin","description":"","difficulty":8,"code_level":"development","repo_dir":"CBP/plugin/actor_network_service/fermat-cbp-plugin-actor-network-service-crypto-customer-bitdubai","found":true,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100},{"dev":{"usrnm":"jorgeejgonzalez","email":"jorgeejgonzalez@gmail.com","name":"Jorge Gonzalez","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/2023125?v=3","url":"https://github.com/jorgeejgonzalez","bio":null,"upd_at":"56171a4d1f1c2be0054feb5c","_id":"5614640736058c8c64ac24e5"},"role":"author","scope":"implementation","percnt":10}],"certs":[],"life_cycle":[],"upd_at":"561711251f1c2be0054fe0a8","_id":"5614643d36058c8c64ac3473"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"crypto wholesaler","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/android/reference_wallet/fermat-cdn-android-reference-wallet-crypto-wholesaler-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711251f1c2be0054fe0b2","_id":"5614643d36058c8c64ac3488"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"crypto distributor","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/android/reference_wallet/fermat-cdn-android-reference-wallet-crypto-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711251f1c2be0054fe0b9","_id":"5614643e36058c8c64ac3495"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"top up point","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/android/reference_wallet/fermat-cdn-android-reference-wallet-top-up-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711251f1c2be0054fe0c0","_id":"5614643e36058c8c64ac34a2"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f836058c8c64ac213c","name":"cash out point","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/android/reference_wallet/fermat-cdn-android-reference-wallet-cash-out-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711251f1c2be0054fe0c7","_id":"5614643e36058c8c64ac34af"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"crypto wholesaler","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/android/sub_app/fermat-cdn-android-sub-app-crypto-wholesaler-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711251f1c2be0054fe0cf","_id":"5614643e36058c8c64ac34bd"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"crypto distributor","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/android/sub_app/fermat-cdn-android-sub-app-crypto-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711261f1c2be0054fe0d6","_id":"5614643f36058c8c64ac34ca"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"top up point","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/android/sub_app/fermat-cdn-android-sub-app-top-up-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711261f1c2be0054fe0dd","_id":"5614643f36058c8c64ac34d7"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"cash out point","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/android/sub_app/fermat-cdn-android-sub-app-cash-out-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711261f1c2be0054fe0e4","_id":"5614643f36058c8c64ac34e4"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"crypto wholesaler","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/wallet_module/fermat-cdn-plugin-wallet-module-crypto-wholesaler-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711261f1c2be0054fe0ec","_id":"5614643f36058c8c64ac34f2"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"crypto distributor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/wallet_module/fermat-cdn-plugin-wallet-module-crypto-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711261f1c2be0054fe0f3","_id":"5614644036058c8c64ac34ff"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"top up point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/wallet_module/fermat-cdn-plugin-wallet-module-top-up-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711261f1c2be0054fe0fa","_id":"5614644036058c8c64ac350c"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2148","name":"cash out point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/wallet_module/fermat-cdn-plugin-wallet-module-cash-out-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711261f1c2be0054fe101","_id":"5614644036058c8c64ac3519"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"crypto wholesaler","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/sub_app_module/fermat-cdn-plugin-sub-app-module-crypto-wholesaler-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711261f1c2be0054fe109","_id":"5614644136058c8c64ac3527"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"crypto distributor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/sub_app_module/fermat-cdn-plugin-sub-app-module-crypto-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711261f1c2be0054fe110","_id":"5614644136058c8c64ac3534"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"top up point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/sub_app_module/fermat-cdn-plugin-sub-app-module-top-up-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711271f1c2be0054fe117","_id":"5614644136058c8c64ac3541"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"cash out point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/sub_app_module/fermat-cdn-plugin-sub-app-module-cash-out-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711271f1c2be0054fe11e","_id":"5614644136058c8c64ac354e"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"crypto wholesaler","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/actor/fermat-cdn-plugin-actor-crypto-wholesaler-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711271f1c2be0054fe126","_id":"5614644236058c8c64ac355c"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"crypto distributor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/actor/fermat-cdn-plugin-actor-crypto-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711271f1c2be0054fe12d","_id":"5614644236058c8c64ac3569"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"top up point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/actor/fermat-cdn-plugin-actor-top-up-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711271f1c2be0054fe134","_id":"5614644236058c8c64ac3576"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2154","name":"cash out point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/actor/fermat-cdn-plugin-actor-cash-out-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711271f1c2be0054fe13b","_id":"5614644236058c8c64ac3583"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"wholesaler broker crypto purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-wholesaler-broker-crypto-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711271f1c2be0054fe143","_id":"5614644336058c8c64ac3591"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"wholesaler broker fiat purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-wholesaler-broker-fiat-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711281f1c2be0054fe14a","_id":"5614644336058c8c64ac359e"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"wholesaler distributor crypto sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-wholesaler-distributor-crypto-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711281f1c2be0054fe151","_id":"5614644336058c8c64ac35ab"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"wholesaler distributor fiat sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-wholesaler-distributor-fiat-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711281f1c2be0054fe158","_id":"5614644336058c8c64ac35b8"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"distributor wholesaler crypto purchare","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-distributor-wholesaler-crypto-purchare-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711281f1c2be0054fe15f","_id":"5614644436058c8c64ac35c5"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"distributor wholesaler fiat purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-distributor-wholesaler-fiat-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711281f1c2be0054fe166","_id":"5614644436058c8c64ac35d2"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"distributor distributor crypto sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-distributor-distributor-crypto-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711281f1c2be0054fe16d","_id":"5614644436058c8c64ac35df"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"distributor distributor fiat sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-distributor-distributor-fiat-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711281f1c2be0054fe174","_id":"5614644536058c8c64ac35ec"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"distributor distributor crypto purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-distributor-distributor-crypto-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711291f1c2be0054fe17b","_id":"5614644536058c8c64ac35f9"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"distributor distributor fiat purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-distributor-distributor-fiat-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711291f1c2be0054fe182","_id":"5614644536058c8c64ac3606"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"distributor top up point crypto sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-distributor-top-up-point-crypto-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711291f1c2be0054fe189","_id":"5614644536058c8c64ac3613"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"distributor top up point fiat sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-distributor-top-up-point-fiat-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711291f1c2be0054fe190","_id":"5614644636058c8c64ac3620"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"top up point distributor crypto purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-top-up-point-distributor-crypto-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711291f1c2be0054fe197","_id":"5614644636058c8c64ac362d"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"top up point distributor fiat purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-top-up-point-distributor-fiat-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711291f1c2be0054fe19e","_id":"5614644636058c8c64ac363a"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"top up point intra user crypto sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-top-up-point-intra-user-crypto-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"561711291f1c2be0054fe1a5","_id":"5614644636058c8c64ac3647"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"cash out point intra user fiat sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-cash-out-point-intra-user-fiat-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112a1f1c2be0054fe1ac","_id":"5614644736058c8c64ac3654"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"top up point cash out point crypto purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-top-up-point-cash-out-point-crypto-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112a1f1c2be0054fe1b3","_id":"5614644736058c8c64ac3661"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"cash out point top up point crypto sell","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-cash-out-point-top-up-point-crypto-sell-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112a1f1c2be0054fe1ba","_id":"5614644736058c8c64ac366e"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"shop top up point crypto sale","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-shop-top-up-point-crypto-sale-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112a1f1c2be0054fe1c1","_id":"5614644736058c8c64ac367b"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac215d","name":"top up point shop crypto purchase","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/business_transaction/fermat-cdn-plugin-business-transaction-top-up-point-shop-crypto-purchase-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112a1f1c2be0054fe1c8","_id":"5614644836058c8c64ac3688"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"wholesaler broker","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/contract/fermat-cdn-plugin-contract-wholesaler-broker-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112a1f1c2be0054fe1d0","_id":"5614644836058c8c64ac3696"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"wholesaler distributor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/contract/fermat-cdn-plugin-contract-wholesaler-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112a1f1c2be0054fe1d7","_id":"5614644836058c8c64ac36a3"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"distributor distributor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/contract/fermat-cdn-plugin-contract-distributor-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112b1f1c2be0054fe1de","_id":"5614644936058c8c64ac36b0"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"distributor top up point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/contract/fermat-cdn-plugin-contract-distributor-top-up-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112b1f1c2be0054fe1e5","_id":"5614644936058c8c64ac36bd"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"top up point cash out point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/contract/fermat-cdn-plugin-contract-top-up-point-cash-out-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112b1f1c2be0054fe1ec","_id":"5614644936058c8c64ac36ca"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac216c","name":"top up point shop","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/contract/fermat-cdn-plugin-contract-top-up-point-shop-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112b1f1c2be0054fe1f3","_id":"5614644936058c8c64ac36d7"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"crypto wholesaler","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/wallet/fermat-cdn-plugin-wallet-crypto-wholesaler-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112b1f1c2be0054fe1fb","_id":"5614644a36058c8c64ac36e5"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"crypto distributor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/wallet/fermat-cdn-plugin-wallet-crypto-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112b1f1c2be0054fe202","_id":"5614644a36058c8c64ac36f2"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"crypto top up","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/wallet/fermat-cdn-plugin-wallet-crypto-top-up-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112b1f1c2be0054fe209","_id":"5614644a36058c8c64ac36ff"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"crypto cash out","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/wallet/fermat-cdn-plugin-wallet-crypto-cash-out-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112b1f1c2be0054fe210","_id":"5614644a36058c8c64ac370c"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2172","name":"crypto pos wallet","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/wallet/fermat-cdn-plugin-wallet-crypto-pos-wallet-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112c1f1c2be0054fe217","_id":"5614644b36058c8c64ac3719"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"crypto wholesaler","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/identity/fermat-cdn-plugin-identity-crypto-wholesaler-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112c1f1c2be0054fe21f","_id":"5614644b36058c8c64ac3727"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"crypto distributor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/identity/fermat-cdn-plugin-identity-crypto-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112c1f1c2be0054fe226","_id":"5614644b36058c8c64ac3734"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"top up point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/identity/fermat-cdn-plugin-identity-top-up-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112c1f1c2be0054fe22d","_id":"5614644b36058c8c64ac3741"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2178","name":"cash out point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/identity/fermat-cdn-plugin-identity-cash-out-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112c1f1c2be0054fe234","_id":"5614644c36058c8c64ac374e"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"crypto wholesaler","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/actor_network_service/fermat-cdn-plugin-actor-network-service-crypto-wholesaler-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112c1f1c2be0054fe23c","_id":"5614644c36058c8c64ac375c"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"crypto distributor","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/actor_network_service/fermat-cdn-plugin-actor-network-service-crypto-distributor-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112d1f1c2be0054fe243","_id":"5614644c36058c8c64ac3769"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"top up point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/actor_network_service/fermat-cdn-plugin-actor-network-service-top-up-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112d1f1c2be0054fe24a","_id":"5614644d36058c8c64ac3776"},{"_platfrm_id":"5614643d36058c8c64ac3484","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217b","name":"cash out point","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"CDN/plugin/actor_network_service/fermat-cdn-plugin-actor-network-service-cash-out-point-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112d1f1c2be0054fe251","_id":"5614644d36058c8c64ac3783"},{"_platfrm_id":"5614644d36058c8c64ac3790","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac213f","name":"device private network","type":"android","description":"","difficulty":0,"code_level":"concept","repo_dir":"DPN/android/sub_app/fermat-dpn-android-sub-app-device-private-network-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112d1f1c2be0054fe25b","_id":"5614644d36058c8c64ac3794"},{"_platfrm_id":"5614644d36058c8c64ac3790","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac214b","name":"device private network","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"DPN/plugin/sub_app_module/fermat-dpn-plugin-sub-app-module-device-private-network-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112d1f1c2be0054fe263","_id":"5614644e36058c8c64ac37a2"},{"_platfrm_id":"5614644d36058c8c64ac3790","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac2157","name":"device private network","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"DPN/plugin/middleware/fermat-dpn-plugin-middleware-device-private-network-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112e1f1c2be0054fe26b","_id":"5614644e36058c8c64ac37b0"},{"_platfrm_id":"5614644d36058c8c64ac3790","_suprlay_id":null,"_layer_id":"561463f936058c8c64ac217e","name":"device private network","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"DPN/plugin/network_service/fermat-dpn-plugin-network-service-device-private-network-bitdubai","found":false,"devs":[{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"architecture","percnt":100},{"dev":{"usrnm":"luis-fernando-molina","email":null,"name":"Luis Fernando Molina","bday":null,"location":null,"avatar_url":"https://avatars.githubusercontent.com/u/9479367?v=3","url":"https://github.com/Luis-Fernando-Molina","bio":null,"upd_at":"56147cf0c9e113c46518db1f","_id":"561463f536058c8c64ac206a"},"role":"author","scope":"design","percnt":100}],"certs":[],"life_cycle":[],"upd_at":"5617112e1f1c2be0054fe273","_id":"5614644e36058c8c64ac37be"},{"_platfrm_id":null,"_suprlay_id":"5614644e36058c8c64ac37cb","_layer_id":"5614644e36058c8c64ac37ce","name":"cloud client","type":"plugin","description":"","difficulty":10,"code_level":"production","repo_dir":"P2P/plugin/communication/fermat-p2p-plugin-communication-cloud-client-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c62","_id":"5614644e36058c8c64ac37d1"},{"_platfrm_id":null,"_suprlay_id":"5614644e36058c8c64ac37cb","_layer_id":"5614644e36058c8c64ac37ce","name":"cloud server","type":"plugin","description":"","difficulty":10,"code_level":"production","repo_dir":"P2P/plugin/communication/fermat-p2p-plugin-communication-cloud-server-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c64","_id":"5614644f36058c8c64ac37e4"},{"_platfrm_id":null,"_suprlay_id":"5614644e36058c8c64ac37cb","_layer_id":"5614644e36058c8c64ac37ce","name":"p2p","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"P2P/plugin/communication/fermat-p2p-plugin-communication-p2p-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614644f36058c8c64ac37f6","_id":"5614644f36058c8c64ac37f7"},{"_platfrm_id":null,"_suprlay_id":"5614644e36058c8c64ac37cb","_layer_id":"5614644e36058c8c64ac37ce","name":"geo fenced p2p","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"P2P/plugin/communication/fermat-p2p-plugin-communication-geo-fenced-p2p-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645036058c8c64ac3801","_id":"5614645036058c8c64ac3802"},{"_platfrm_id":null,"_suprlay_id":"5614644e36058c8c64ac37cb","_layer_id":"5614644e36058c8c64ac37ce","name":"wifi","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"P2P/plugin/communication/fermat-p2p-plugin-communication-wifi-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645036058c8c64ac380c","_id":"5614645036058c8c64ac380d"},{"_platfrm_id":null,"_suprlay_id":"5614644e36058c8c64ac37cb","_layer_id":"5614644e36058c8c64ac37ce","name":"bluetooth","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"P2P/plugin/communication/fermat-p2p-plugin-communication-bluetooth-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645036058c8c64ac3817","_id":"5614645036058c8c64ac3818"},{"_platfrm_id":null,"_suprlay_id":"5614644e36058c8c64ac37cb","_layer_id":"5614644e36058c8c64ac37ce","name":"nfc","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"P2P/plugin/communication/fermat-p2p-plugin-communication-nfc-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645036058c8c64ac3822","_id":"5614645036058c8c64ac3823"},{"_platfrm_id":null,"_suprlay_id":"5614644e36058c8c64ac37cb","_layer_id":"5614644e36058c8c64ac37ce","name":"mesh","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"P2P/plugin/communication/fermat-p2p-plugin-communication-mesh-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645036058c8c64ac382d","_id":"5614645036058c8c64ac382e"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645136058c8c64ac383c","name":"incomming crypto","type":"plugin","description":"","difficulty":10,"code_level":"production","repo_dir":"BCH/plugin/crypto_router/fermat-bch-plugin-crypto-router-incomming-crypto-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645136058c8c64ac383e","_id":"5614645136058c8c64ac383f"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645136058c8c64ac383c","name":"outgoing crypto","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BCH/plugin/crypto_router/fermat-bch-plugin-crypto-router-outgoing-crypto-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645136058c8c64ac3851","_id":"5614645136058c8c64ac3852"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645136058c8c64ac385d","name":"crypto address book","type":"plugin","description":"","difficulty":5,"code_level":"production","repo_dir":"BCH/plugin/crypto_module/fermat-bch-plugin-crypto-module-crypto-address-book-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645136058c8c64ac385f","_id":"5614645136058c8c64ac3860"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645236058c8c64ac3873","name":"bitcoin currency","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"BCH/plugin/crypto_vault/fermat-bch-plugin-crypto-vault-bitcoin-currency-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645236058c8c64ac3875","_id":"5614645236058c8c64ac3876"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645236058c8c64ac3873","name":"assets over bitcoin","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"BCH/plugin/crypto_vault/fermat-bch-plugin-crypto-vault-assets-over-bitcoin-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c68","_id":"5614645236058c8c64ac3889"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645236058c8c64ac3873","name":"bitcoin watch only","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"BCH/plugin/crypto_vault/fermat-bch-plugin-crypto-vault-bitcoin-watch-only-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c66","_id":"5614645236058c8c64ac389c"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645236058c8c64ac3873","name":"litecoin","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BCH/plugin/crypto_vault/fermat-bch-plugin-crypto-vault-litecoin-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645236058c8c64ac38ae","_id":"5614645236058c8c64ac38af"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645236058c8c64ac3873","name":"ripple","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BCH/plugin/crypto_vault/fermat-bch-plugin-crypto-vault-ripple-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645336058c8c64ac38b9","_id":"5614645336058c8c64ac38ba"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645236058c8c64ac3873","name":"ethereum","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BCH/plugin/crypto_vault/fermat-bch-plugin-crypto-vault-ethereum-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645336058c8c64ac38c4","_id":"5614645336058c8c64ac38c5"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645336058c8c64ac38d0","name":"bitcoin","type":"plugin","description":"","difficulty":10,"code_level":"development","repo_dir":"BCH/plugin/crypto_network/fermat-bch-plugin-crypto-network-bitcoin-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c6a","_id":"5614645336058c8c64ac38d3"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645336058c8c64ac38d0","name":"litecoin","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BCH/plugin/crypto_network/fermat-bch-plugin-crypto-network-litecoin-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645436058c8c64ac3909","_id":"5614645436058c8c64ac390a"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645336058c8c64ac38d0","name":"ripple","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BCH/plugin/crypto_network/fermat-bch-plugin-crypto-network-ripple-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645536058c8c64ac3914","_id":"5614645536058c8c64ac3915"},{"_platfrm_id":null,"_suprlay_id":"5614645136058c8c64ac3839","_layer_id":"5614645336058c8c64ac38d0","name":"ethereum","type":"plugin","description":"","difficulty":0,"code_level":"concept","repo_dir":"BCH/plugin/crypto_network/fermat-bch-plugin-crypto-network-ethereum-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645536058c8c64ac391f","_id":"5614645536058c8c64ac3920"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645536058c8c64ac392e","name":"file system","type":"addon","description":"is the interface between the os specific file system and the platform components that need to consume file system services","difficulty":3,"code_level":"production","repo_dir":"OSA/addon/multi_os/fermat-osa-addon-multi-os-file-system-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c6c","_id":"5614645536058c8c64ac3931"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645536058c8c64ac392e","name":"database system","type":"addon","description":"is a wrapper designed to isolate the rest of the components from the os dependent database system","difficulty":5,"code_level":"production","repo_dir":"OSA/addon/multi_os/fermat-osa-addon-multi-os-database-system-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c6e","_id":"5614645536058c8c64ac3944"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645636058c8c64ac3957","name":"file system","type":"addon","description":"is the interface between the os specific file system and the platform components that need to consume file system services","difficulty":3,"code_level":"production","repo_dir":"OSA/addon/android/fermat-osa-addon-android-file-system-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c72","_id":"5614645636058c8c64ac395a"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645636058c8c64ac3957","name":"database system","type":"addon","description":"is a wrapper designed to isolate the rest of the components from the os dependent database system","difficulty":5,"code_level":"production","repo_dir":"OSA/addon/android/fermat-osa-addon-android-database-system-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c74","_id":"5614645636058c8c64ac3975"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645636058c8c64ac3957","name":"logger","type":"addon","description":"","difficulty":4,"code_level":"production","repo_dir":"OSA/addon/android/fermat-osa-addon-android-logger-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c70","_id":"5614645736058c8c64ac3990"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645636058c8c64ac3957","name":"device location","type":"addon","description":"","difficulty":4,"code_level":"development","repo_dir":"OSA/addon/android/fermat-osa-addon-android-device-location-bitdubai","found":true,"devs":[],"certs":[],"life_cycle":[],"upd_at":"561468ac36058c8c64ac3c76","_id":"5614645736058c8c64ac39a3"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645636058c8c64ac3957","name":"device connectivity","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"OSA/addon/android/fermat-osa-addon-android-device-connectivity-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645736058c8c64ac39b5","_id":"5614645736058c8c64ac39b6"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645636058c8c64ac3957","name":"device power","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"OSA/addon/android/fermat-osa-addon-android-device-power-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645736058c8c64ac39c0","_id":"5614645736058c8c64ac39c1"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645636058c8c64ac3957","name":"device contacts","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"OSA/addon/android/fermat-osa-addon-android-device-contacts-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645836058c8c64ac39cb","_id":"5614645836058c8c64ac39cc"},{"_platfrm_id":null,"_suprlay_id":"5614645536058c8c64ac392b","_layer_id":"5614645636058c8c64ac3957","name":"device hardware","type":"addon","description":"","difficulty":0,"code_level":"concept","repo_dir":"OSA/addon/android/fermat-osa-addon-android-device-hardware-bitdubai","found":false,"devs":[],"certs":[],"life_cycle":[],"upd_at":"5614645836058c8c64ac39d6","_id":"5614645836058c8c64ac39d7"}]}';
var test_map = {load : "table",table : {top : "",bottom : "",right : "stack",left : ""},stack : {top : "",bottom : "",right : "",left : "table"} };
var testFlow = [
    {
        "platfrm": "CBP",
        "name": "connection request from customer to broker",
        "desc": "a customer sends a connection request to crypto broker in order to be able to see his products and start a negotiation.",
        "prev": "list crypto brokers",
        "next": null,
        "steps": [
            {
                "id": 0,
                "title": "select broker and submit request",
                "desc": "the customer selects a broker from the list and submits the request to connect to him.",
                "type": "start",
                "next": [
                    {
                        "id": "1",
                        "type": "direct call"
                    }
                ],
                "name": "crypto broker community",
                "layer": "sub app",
                "platfrm": "CBP"
            },
            {
                "id": 1,
                "title": "route request to network service",
                "desc": "the module routes this request to the network service to reach the selected broker.",
                "type": "activity",
                "next": [
                    {
                        "id": "2",
                        "type": "direct call"
                    }
                ],
                "name": "crypto broker community",
                "layer": "sub app module",
                "platfrm": "CBP"
            },
            {
                "id": 2,
                "title": "call the broker to deliver the request",
                "desc": "the network service places a call to the broker and then it delivers the request via the fermat network.",
                "type": "activity",
                "next": [
                    {
                        "id": "1",
                        "type": "direct call"
                    }
                ],
                "name": "crypto broker",
                "layer": "actor network service",
                "platfrm": "CBP"
            }
        ],
        "upd_at": "5629db8be934756e08c9751a",
        "_id": "5629db8be934756e08c9751b"
    }
];
var testNetworkNodes = [
    {
        id : "server0",
        type : "node",
        subType : "server",
        os : "linux",
        ady : [
            {
                id : "server1",
                linkType : "connected"
            }
        ]
    },
    {
        id : "server1",
        type : "node",
        subType : "server",
        os : "windows",
        ady : [
            {
                id : "server2",
                linkType : "connected"
            }
        ]
    },
    {
        id : "server2",
        type : "node",
        subType : "pc",
        os : "linux",
        ady : []
    }
];
var testNetworkClients = {
    server0 : [
        {
            id : "client0",
            type : "client",
            subType : "phone",
            ady : [
                {
                    id : "server0",
                    linkType : "connected"
                },
                {
                    id : "client3",
                    from : "nService0",
                    linkType : "connected"
                }
            ]
        },
        {
            id : "client1",
            type : "client",
            subType : "pc",
            ady : [
                {
                    id : "server0",
                    linkType : "connected"
                }
            ]
        },
        {
            id : "client2",
            type : "client",
            subType : "phone",
            ady : [
                {
                    id : "server0",
                    linkType : "connected"
                }
            ]
        }
    ],
    server1 : [
        {
            id : "client3",
            type : "client",
            subType : "phone",
            ady : [
                {
                    id : "server1",
                    linkType : "connected"
                },
                {
                    id : "client0",
                    from : "nService0",
                    linkType : "connected"
                }
            ]
        }
    ],
    server2 : []
};
var testNetworkServices = {
    client0 : [
        {
            id : "wallet0",
            type : "wallet",
            subType : "bitcoin_wallet",
            currency : "bitcoin",
            symbol : "BTC",
            balance : "0.0123",
            ady : [
                {
                    id : "client0",
                    linkType : "installed"
                }
            ]
        },
        {
            id : "nService0",
            type : "nservice",
            subType : "ukn_service",
            ady : [
                {
                    id : "client0",
                    linkType : "running"
                }
            ]
        },
        {
            id : "nService1",
            type : "nservice",
            subType : "ukn_service",
            ady : [
                {
                    id : "client0",
                    linkType : "running"
                }
            ]
        },
        {
            id : "nService2",
            type : "nservice",
            subType : "ukn_service",
            ady : [
                {
                    id : "client0",
                    linkType : "running"
                }
            ]
        }
    ],
    client1 : [],
    client2 : [],
    client3 : [
        {
            id : "nService0",
            type : "nservice",
            subType : "ukn_service",
            ady : [
                {
                    id : "client3",
                    linkType : "running"
                }
            ]
        }
    ]
};


var layers = {
    
    size : function(){
        var size = 0;
        
        for(var key in this){
            //if(this.hasOwnProperty(key))
                size++;
        }
        
        return size - 1;
    }
};

var groups = {
    
    size : function(){
        var size = 0;
        
        for(var key in this){
            //if(this.hasOwnProperty(key))
                size++;
        }
        
        return size - 1;
    }
};

var superLayers = {
    
    size : function(){
        var size = 0;
        
        for(var key in this){
            //if(this.hasOwnProperty(key))
                size++;
        }
        
        return size - 1;
    }
};
function Developer (){

	var objectsDeveloper = [];
	var developerLink = [];
	var developerAuthor = [];
	var developerAuthorRealName = [];
	var developerAuthorEmail = [];
	var self = this;
	var position = {
		target : [],
		lastTarget : []
	};

	var onClick = function(target) {
        if(window.actualView === 'developers')
            onElementClickDeveloper(target.userData.id, objectsDeveloper);
    };

    function onElementClickDeveloper(id, objectsDevelopers){

        var duration = 1000;

        if(camera.getFocus() == null){
            var camTarget = objectsDevelopers[id].clone();

            window.camera.setFocus(camTarget, new THREE.Vector4(0, 0, 1000, 1), duration);

            for (var i = 0; i < objectsDevelopers.length ; i++) {
                if(id !== i)
                    letAloneDeveloper(objectsDevelopers[i]);
            }

            helper.showBackButton();
            self.showDeveloperTiles(id);
        }
    }

    /**
     * Let Alone Developer 
     * @param   {object}     objectsDevelopers all the developers
     * @author Emmanuel Colina
     */
     
    function letAloneDeveloper(objectsDevelopers){

        var i, _duration = 2000,
            distance = camera.getMaxDistance() * 2,
            out = window.viewManager.translateToSection('developers', new THREE.Vector3(0, 0, distance));

        var target;

        var animate = function (object, target, dur) {

            new TWEEN.Tween(object.position)
                .to({
                    x: target.x,
                    y: target.y,
                    z: target.z
                }, dur)
                .easing(TWEEN.Easing.Exponential.InOut)
                .onComplete(function () {
                    object.userData.flying = false;
                })
                .start();
        };

        target = out;
        objectsDevelopers.userData.flying = true;
        animate(objectsDevelopers, target, Math.random() * _duration + _duration);
    }

    function drawPictureDeveloper(data, ctx, texture) {

        var image = new Image();
        var actual = data.shift();

        if (actual.src && actual.src != 'undefined') {

            image.onload = function () {


                if (actual.alpha)
                    ctx.globalAlpha = actual.alpha;

                ctx.drawImage(image, actual.x, actual.y, actual.w, actual.h);
                if (texture)
                    texture.needsUpdate = true;

                ctx.globalAlpha = 1;

                if (data.length !== 0) {

                    if (data[0].text)
                        drawTextDeveloper(data, ctx, texture);
                    else
                        drawPictureDeveloper(data, ctx, texture);
                }
            };

            image.onerror = function () {
                if (data.length !== 0) {
                    if (data[0].text)
                        drawTextDeveloper(data, ctx, texture);
                    else
                        drawPictureDeveloper(data, ctx, texture);
                }
            };

            image.crossOrigin = "anonymous";
            image.src = actual.src;
        } else {
            if (data.length !== 0) {
                if (data[0].text)
                    drawTextDeveloper(data, ctx, texture);
                else
                    drawPictureDeveloper(data, ctx, texture);
            }
        }
    }

    /**
     * Draws a texture in canvas
     * @param {Array}  data    Options of the texture
     * @param {Object} ctx     Canvas Context
     * @param {Object} texture Texture to update
     */
    function drawTextDeveloper(data, ctx, texture) {

        var actual = data.shift();

        if (actual.color)
            ctx.fillStyle = actual.color;

        ctx.font = actual.font;

        if (actual.constraint)
            if (actual.wrap)
                helper.drawText(actual.text, actual.x, actual.y, ctx, actual.constraint, actual.lineHeight);
            else
                ctx.fillText(actual.text, actual.x, actual.y, actual.constraint);
        else
            ctx.fillText(actual.text, actual.x, actual.y);

        if (texture)
            texture.needsUpdate = true;

        ctx.fillStyle = "#FFFFFF";

        if (data.length !== 0){ 

          if(data[0].text)
            drawTextDeveloper(data, ctx, texture); 
          else 
            drawPictureDeveloper(data, ctx, texture);
        }
    }
	this.getDeveloper = function(){
		
		var find = false;

		for (var i = 0; i < table.length; i++) {
			if(i === 0){
				developerLink.push(table[i].picture);
				developerAuthor.push(table[i].author);
				developerAuthorRealName.push(table[i].authorRealName);
				developerAuthorEmail.push(table[i].authorEmail);
			}	
			else{

				for(var j = 0; j < developerLink.length; j++)
					if(developerLink[j] === table[i].picture && find === false){
						find = true;
					}
			}
			if(find === false && i !== 0){
				if(table[i].picture !== undefined){
					developerLink.push(table[i].picture);
					developerAuthor.push(table[i].author);
					developerAuthorRealName.push(table[i].authorRealName);
					developerAuthorEmail.push(table[i].authorEmail);
				}
				find = false;
			}
			else
				find = false;
		}
		self.createDeveloper(developerLink, developerAuthor, developerAuthorRealName, developerAuthorEmail);
	};

	/**
     * Creates a Texture
     * @param   {Number}     id ID of the developer
     * @param   {object}     developerLink link of the picture developer
     * @param   {object}     developerAuthor nick of the developer
     * @param   {object}     developerAuthorRealName name of the developer
     * @param   {object}     developerAuthorEmail email of the developer
     * @returns {texture} 	 Texture of the developer
     * @author Emmanuel Colina
     */
	this.createTextureDeveloper = function(id, developerLink, developerAuthor, developerAuthorRealName, developerAuthorEmail){
		
		var canvas = document.createElement('canvas');
        canvas.width = 183 * 5 ;
        canvas.height = 92 * 5;
        var ctx = canvas.getContext('2d');
        ctx.globalAlpha = 0;
        ctx.fillStyle = "#FFFFFF";
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';

        var texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.LinearFilter;

		var pic = {
            src: developerLink[id],
            alpha: 0.8
        };
        pic.x = 26.5;
        pic.y = 40;
        pic.w = 84 * 1.9;
        pic.h = 84 * 1.9;

		var background = {
		    src: 'images/developer/background_300.png',
		    x: 0,
		    y: 0,
		    w: 230 * 2,
		    h: 120 * 2
		};

		var ringDeveloper = {
			
			src: 'images/developer/icon_developer_300.png'
		};
		ringDeveloper.x = 25.5;
        ringDeveloper.y = 33.5;
        ringDeveloper.w = 82.7 * 2.0;
        ringDeveloper.h = 82.7 * 2.0;

        var nameDeveloper = {
            text: developerAuthorRealName[id],
            font: (9 * 2.2) + 'px Roboto Bold'
        };
        nameDeveloper.x = 250;
        nameDeveloper.y = 90;
        nameDeveloper.color = "#FFFFFF";
        
        var nickDeveloper = {
            text: developerAuthor[id],
            font: (5 * 2.2) + 'px Canaro'
        };
        nickDeveloper.x = 250;
        nickDeveloper.y = 176;
        nickDeveloper.color = "#00B498";

        var emailDeveloper = {
            text: developerAuthorEmail[id],
            font: (5 * 2.2) + 'px Roboto Medium'
        };
        emailDeveloper.x = 250;
        emailDeveloper.y = 202;
        emailDeveloper.color = "#E05A52";

		var data = [
		pic,
		background,
		ringDeveloper,
		nameDeveloper,
        nickDeveloper,
		emailDeveloper
		];

        drawPictureDeveloper(data, ctx, texture);

        return texture;
	};

	/**
     * Creates a Developer 
     * @param   {object}     developerLink link of the picture developer
     * @param   {object}     developerAuthor nick of the developer
     * @param   {object}     developerAuthorRealName name of the developer
     * @param   {object}     developerAuthorEmail email of the developer
     * @author Emmanuel Colina
     */
	this.createDeveloper = function (developerLink, developerAuthor, developerAuthorRealName, developerAuthorEmail){

		var mesh, texture, lastTarget;

		position.target = self.setPositionDeveloper(developerLink);

		for(var i = 0; i < developerLink.length; i++){

			lastTarget = window.helper.getOutOfScreenPoint(0);
			position.lastTarget.push(lastTarget);

			texture = self.createTextureDeveloper(i, developerLink, developerAuthor, developerAuthorRealName, developerAuthorEmail);

			mesh = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(230, 120),
            new THREE.MeshBasicMaterial({ transparent : true, color : 0xFFFFFF}));
            mesh.userData = {
                id: i,
                onClick : onClick
            };
            mesh.material.map = texture;
            mesh.material.needsUpdate = true;
        	mesh.position.x = position.lastTarget[i].x;
        	mesh.position.y = position.lastTarget[i].y;
        	mesh.position.z = position.lastTarget[i].z;

        	mesh.name = developerAuthor[i];
        	mesh.scale.set(5, 5, 5);
        	scene.add(mesh);
        	objectsDeveloper.push(mesh);
		}
	};

	/**
     * Creates a Position 
     * @param   {object}     mesh of the picture developer
     * @author Emmanuel Colina
     */
	this.setPositionDeveloper = function(mesh){
		
		var positionDeveloper = [];
		var position;
	    var indice = 1;
	    
	    var center = new THREE.Vector3(0, 0, 0);
	    center = viewManager.translateToSection('developers', center);

	    if (mesh.length === 1) {

	        positionDeveloper.push(center);
	    }

	    else if (mesh.length === 2) {

	        center.x = center.x - 500;

	        for (var k = 0; k < mesh.length; k++) {

	            position = new THREE.Vector3();

	            position.x = center.x;
	            position.y = center.y;
	        
	            positionDeveloper.push(position);

	            center.x = center.x + 1000;
	        }

	    }
	    else if (mesh.length > 2) {

	        var sqrt, round, column, row, initialY, count, raizC, raizC2;
	        count = 0;
	        round = 0;
	        column = 0;

	        //calculamos columnas y filas

	        if((Math.sqrt(mesh.length) % 1) !== 0) {

	            for(var r = mesh.length; r < mesh.length * 2; r++){

	                if((Math.sqrt(r) % 1) === 0){

	                    raizC = r;
	                    sqrt = Math.sqrt(raizC);

	                    for(var l = raizC - 1; l > 0; l--){ 

	                        if((Math.sqrt(l) % 1) === 0){

	                            raizC2 = l;
	                            break;
	                        }
	                        count = count + 1;
	                    }
	                    count = count / 2;

	                    for(var f = raizC2 + 1; f <= raizC2 + count; f++){
	                        if(mesh.length === f) {
	                            row = sqrt - 1;
	                            column = sqrt;
	                        }
	                    }
	                    for(var t = raizC - 1; t >= raizC - count; t--){
	                        if(mesh.length === t) {
	                            row = column = sqrt ;
	                        }
	                    }
	                }
	                if(row !== 0  && column !== 0){
	                    break;
	                }
	            }
	        }
	        else{
	            row = column = Math.sqrt(mesh.length);
	        }

	        count = 0;
	        var positionY = center.y - 1500;  

	        //calculando Y
	        for(var p = 0; p < row; p++) { 

	            if(p === 0)
	                positionY = positionY + 250;
	            else
	                positionY = positionY + 500;
	        }
	        
	        for(var y = 0; y < row; y++){ //filas

	            var positionX = center.x + 1500;

	            for(var m = 0; m < column; m++) { 

	                if(m===0)
	                    positionX = positionX - 500;
	                else
	                    positionX = positionX - 1000;
	            }
	            //calculando X
	            for(var x = 0; x < column; x++){  //columnas              

	                position = new THREE.Vector3();

	                position.y = positionY;

	                position.x = positionX;

	                if(count < mesh.length){

	                    positionDeveloper.push(position);
	                    count = count + 1;
	                }

	                if((positionX + 500) === center.x + 1500) {
	                    positionX = positionX + 1000;
	                }
	                else
	                    positionX = positionX + 1000;
	            }

	            if((positionY - 250) === center.y - 1500) {
	                positionY = positionY - 500;
	            }
	            else
	                positionY = positionY - 500;     
	        }      
	    }

	    return positionDeveloper;
	};

	/**
     * Animate Developer 
     * @author Emmanuel Colina
     */
	this.animateDeveloper = function(){
		
		var duration = 3000;

		for (var i = 0, l = objectsDeveloper.length; i < l; i++) {
            new TWEEN.Tween(objectsDeveloper[i].position)
            .to({
                x : position.target[i].x,
                y : position.target[i].y,
                z : position.target[i].z
            }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        }
	};

	/**
     * Delete Developer 
     * @author Emmanuel Colina
     */
	this.delete = function() {
        var _duration = 2000;
        var moveAndDelete = function(id) {
            
            var target = position.lastTarget[id];
            
            new TWEEN.Tween(objectsDeveloper[id].position)
                .to({x : target.x, y : target.y, z : target.z}, 6000)
                .easing(TWEEN.Easing.Cubic.InOut)
                .onComplete(function() { window.scene.remove(objectsDeveloper[id]); })
                .start();
        };
        
        for(var i = 0, l = objectsDeveloper.length; i < l; i++) {
            moveAndDelete(i);
            helper.hideObject(objectsDeveloper[i], false, _duration);
        }
        objectsDeveloper = [];
        developerLink = [];
		developerAuthor = [];
		developerAuthorRealName = [];
		developerAuthorEmail = [];
		position = {
			target : [],
			lastTarget : []
		};
    };

    this.showDeveloperTiles = function(id){

        var section = 0;
        var center = objectsDeveloper[id].position;

        for (var i = 0; i < table.length; i++) {
            
            if (table[i].author === objectsDeveloper[id].name && !isNaN(objects[i].position.y)){

                new TWEEN.Tween(objects[i].position)
                .to({x : (center.x + (section % 5) * window.TILE_DIMENSION.width) - 750, y : (center.y - Math.floor(section / 5) * window.TILE_DIMENSION.height) - 250, z : 0}, 2000)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();
                
                section += 1;
            }
        }
    };
}
/**
 * @author Ricardo Delgado
 */
function FermatEdit() {

    var objects = {
            row1 : {
                div : null,
                buttons : [],
                y : 10
            },
            row2 : {            
                div : null,
                buttons : [],
                y : 30
            },
            till : { 
                mesh : null,
                target : {}
            },
            idFields : {}
        };

    var tileWidth = window.TILE_DIMENSION.width - window.TILE_SPACING,
        tileHeight = window.TILE_DIMENSION.height - window.TILE_SPACING;

    var self = this;

    var testDataUser = [
            {
               "_id": null,
               "usrnm": "campol",
               "upd_at": null,
               "bio": null,
               "url": "https://github.com/campol",
               "avatar_url": "https://avatars3.githubusercontent.com/u/12051946?v=3&s=400",
               "location": null,
               "bday": null,
               "name": "Luis Campo",
               "email": "campusprize@gmail.com",
               "__v": null
            },
            {
               "_id": null,
               "usrnm": "Miguelcldn",
               "upd_at": null,
               "bio": null,
               "url": "https://github.com/Miguelcldn",
               "avatar_url": "https://avatars1.githubusercontent.com/u/5544266?v=3&s=400",
               "location": null,
               "bday": null,
               "name": "Miguel Celedon",
               "email": "miguelceledon@outlook.com",
               "__v": null 
            }
        ];

    /**
     * @author Ricardo Delgado
     */
    this.initNew = function(){

        drawTile(addAllFilds);
    };

    this.initEdit = function(){

        drawTile(addAllFilds);
    };

    this.addButton = function(_id){

        var id = _id || null,
            text = 'Edit Component';

        var callback = function(){ self.initEdit(); };

        if(id === null){
            callback = function(){ self.initNew(); };
            text = 'Add New Component';
        }
        
        if( $('#buttonEdit') === null || $('#buttonEdit') === undefined){ 

            buttonsManager.createButtons('buttonEdit', 'Edit Component',callback);
        }    
    };

    this.removeAllFields = function(){

        if(objects.row1.buttons.length !== 0 || objects.row2.buttons.length !== 0){

            var row = 'row1';

            if(objects[row].buttons.length === 0)
                row = 'row2';

            var actualButton = objects[row].buttons.shift();

            if( $('#'+actualButton.id) != null ) 
                window.helper.hide($('#'+actualButton.id), 1000); 
            
                self.removeAllFields();
        }
        else {

            if( $('#'+objects.row1.div) != null ) 
                window.helper.hide($('#'+objects.row1.div), 1000);

            if( $('#'+objects.row2.div) != null ) 
                window.helper.hide($('#'+objects.row2.div), 1000);

            objects.row1.div = null;
            objects.row2.div = null;
            objects.idFields = {};
            deleteMesh();
        }
    };

    function fillFields(id){

        var tile = window.table[id]; 

        if(tile.group != undefined)
            document.getElementById('select-Platform').value = tile.group;

        changeLayer(document.getElementById('select-Platform').value);

        if(tile.layer != undefined)        
            document.getElementById('select-layer').value = tile.layer;

        if(tile.type != undefined)
            document.getElementById('select-Type').value = tile.type;
        
        if(tile.difficulty != undefined)
            document.getElementById('select-Difficulty').value = tile.difficulty; 

        if(tile.code_level != undefined)
            document.getElementById('select-State').value = tile.code_level; 

        if(tile.name != undefined)
            document.getElementById('imput-Name').value = tile.name;         
        
        if(tile.author != undefined)
            document.getElementById('imput-autor').value = tile.author; 

        if(tile.maintainer != undefined)
            document.getElementById('imput-Maintainer').value = tile.maintainer; 
    }

    function createElement() {

        var px = Math.random() * 80000 - 40000,
            py = Math.random() * 80000 - 40000,
            pz = 80000 * 2,
            rx = Math.random() * 180,
            ry = Math.random() * 180,
            rz = Math.random() * 180,
            newCenter = new THREE.Vector3(0, 0, 0);

        var mesh = new THREE.Mesh(
                   new THREE.PlaneBufferGeometry(tileWidth, tileHeight),
                   new THREE.MeshBasicMaterial({
                            side: THREE.DoubleSide,
                            transparent : true,
                            map : null
                        })
                );

        mesh.userData = {
            onClick : onClick
        };

        newCenter = window.viewManager.translateToSection('table', newCenter);

        var target = { x : newCenter.x, y : newCenter.y, z : newCenter.z,
                       px : px, py : py, pz : pz,
                       rx : rx, ry : ry, rz : rz };

        mesh.position.set(px, py, pz);

        mesh.rotation.set(rx, ry, rz);

        mesh.renderOrder = 1;

        scene.add(mesh);

        objects.till.mesh = mesh;

        objects.till.target = target;
    }

    function drawTile(callback){

        if(objects.till.mesh === null)
            createElement();

        mesh = objects.till.mesh;

        if (window.camera.getFocus() === null) {

            window.tileManager.letAlone();

            animate(mesh, objects.till.target, true, 500, function(){ 

                window.camera.setFocus(mesh, new THREE.Vector4(0, 0, tileWidth, 1), 2000);
                
                window.headers.hideHeaders(2000);

                if(typeof(callback) === 'function')
                    callback(); 
                
                changeTexture();

                window.helper.showBackButton();

            });
        }
    } 

    function addAllFilds() {

        var button,
            text,
            x,
            type;

        sesionPlatform();
        sesionType();
        sesionName();
        sesionAuthor();
        sesionDifficulty();
        sesionMaintainer();
        sesionState();
        createbutton();

        function createDiv(row){

            var div = document.createElement('div');

            div.id = 'div-Edit' + row;

            document.body.appendChild(div);

            objects['row' + row].div = 'div-Edit' + row;

            window.helper.show(div, 1000);

        }

        function createField(id, text, _x, _type, _row){

            var object = {
                id : id,
                text : text
              };

            var x = _x || 5,
                type = _type || 'button',
                idSucesor = "backButton",
                row = _row || '1';

            if( objects['row' + row].div === null)
                createDiv(row);

            if(objects['row' + row].buttons.length !== 0)
                idSucesor = objects['row' + row].buttons[objects['row' + row].buttons.length - 1].id;

            var div = document.getElementById(objects['row' + row].div);

            var button = document.createElement(type),
                sucesorButton = document.getElementById(idSucesor);
                      
            button.id = id;
            button.className = 'edit-Fermat';
            button.style.position = 'absolute';
            button.innerHTML = text;
            button.style.top = objects['row' + row].y + 'px';
            button.style.left = (sucesorButton.offsetLeft + sucesorButton.clientWidth + x) + 'px';
            button.style.zIndex = 10;
            button.style.opacity = 0;

            div.appendChild(button);

            objects['row' + row].buttons.push(object);

            window.helper.show(button, 1000);

            return button;
        }

        function sesionPlatform(){

            var id = 'label-Platform'; text = 'Select the Platform : '; type = 'label';

            createField(id, text, null, type);

            id = 'select-Platform'; text = ''; type = 'select';

            createField(id, text, null, type);

            var optgroup = "<optgroup label = Platform>",
                option = "";

            objects.idFields.platform = id;

            for(var i in groups){

                if(i != "size"){

                    option += "<option value = "+i+" >"+i+"</option>";
                }

            }

            optgroup += option + "</optgroup>";

            option = "";

            optgroup += "<optgroup label = superLayer>";

            for(var i in superLayers){

                if(i != "size"){

                    option += "<option value = "+i+" >"+i+"</option>";
                }

            }

            optgroup += option + "</optgroup>";

            $("#"+id).html(optgroup);

            sesionLayer();

            changeLayer(document.getElementById(id).value);

           $("#"+id).change('click', function() {
            
                changeLayer(document.getElementById(id).value);
                changeTexture();
            });
        }

        function sesionLayer(){

            var id = 'label-layer'; text = 'Select the Layer : '; type = 'label';

            createField(id, text, 15, type);

            id = 'select-layer'; text = ''; type = 'select';

            createField(id, text, null, type);

            objects.idFields.layer = id;

            $("#"+id).change('click', function() {
            
                changeTexture();
            });
        }

        function changeLayer(platform){

            var state = false;

            if(typeof groups[platform] === 'undefined')
                state = platform;

            var _layers = CLI.query(window.layers,function(el){return (el.super_layer === state)});

            var option = "";

            for(var i = 0;i < _layers.length; i++){

                option += "<option value = '"+_layers[i]+"' >"+_layers[i]+"</option>";

            }

            $("#select-layer").html(option);          
        }

        function sesionType(){

            var id = 'label-Type'; text = 'Select the Type : '; type = 'label';

            createField(id, text, 15, type);

            id = 'select-Type'; text = ''; type = 'select';

            createField(id, text, null, type);

            objects.idFields.type = id;        

            var option = "";

            option += "<option value = Addon>Addon</option>";
            option += "<option value = Android>Android</option>";
            option += "<option value = Library>Library</option>";
            option += "<option value = Plugin>Plugin</option>";

            $("#"+id).html(option);

            $("#"+id).change('click', function() {
            
                changeTexture();
            });

        }

        function sesionName(){

            var id = 'label-Name'; text = 'Enter Name : '; type = 'label';

            createField(id, text, null, type, 2);

            idSucesor = objects.row2.buttons[objects.row2.buttons.length - 1].id;

            var object = {
                id : "imput-Name",
                text : "textfield"
              };

            objects.idFields.name = object.id;

            var imput = $('<input />', {"id" : object.id, "type" : "text", "text" : object.text });

            $("#"+objects.row2.div).append(imput);

            var button = document.getElementById(object.id);

            sucesorButton = document.getElementById(idSucesor);
                  
            button.placeholder = 'Component Name';      
            button.style.position = 'absolute';
            button.style.top = objects.row2.y + 'px';
            button.style.left = (sucesorButton.offsetLeft + sucesorButton.clientWidth + 5) + 'px';
            button.style.zIndex = 10;
            button.style.opacity = 0;

            window.helper.show(button, 1000);

            objects.row2.buttons.push(object);

            button.addEventListener('blur', function() {

                changeTexture();
            });

        }

        function sesionAuthor(){

            var id = 'label-author'; text = 'Enter Author : '; type = 'label';

            createField(id, text, 15, type, 2);

            idSucesor = objects.row2.buttons[objects.row2.buttons.length - 1].id;

            var object = {
                id : "imput-author",
                text : "textfield"
              };

            objects.idFields.author = object.id;

            var imput = $('<input />', {"id" : object.id, "type" : "text", "text" : object.text });

            $("#"+objects.row2.div).append(imput);

            var button = document.getElementById(object.id);

            sucesorButton = document.getElementById(idSucesor);

            button.placeholder = 'Github User';     
            button.style.position = 'absolute';
            button.style.top = objects.row2.y + 'px';
            button.style.left = (sucesorButton.offsetLeft + sucesorButton.clientWidth + 5) + 'px';
            button.style.zIndex = 10;
            button.style.opacity = 0;

            button.addEventListener('blur', function() {

                changeTexture();
            });

            window.helper.show(button, 1000);

            objects.row2.buttons.push(object);

        }

        function sesionDifficulty(){

            var id = 'label-Difficulty'; text = 'Select Difficulty : '; type = 'label';

            createField(id, text, 15, type);

            id = 'select-Difficulty'; text = ''; type = 'select';

            createField(id, text, null, type);

            objects.idFields.difficulty = id;

            var option = "";

            option += "<option value = 0>0</option>";
            option += "<option value = 1>1</option>";
            option += "<option value = 2>2</option>";
            option += "<option value = 3>3</option>";
            option += "<option value = 4>4</option>";
            option += "<option value = 5>5</option>";
            option += "<option value = 6>6</option>";
            option += "<option value = 7>7</option>";
            option += "<option value = 8>8</option>";
            option += "<option value = 9>9</option>";
            option += "<option value = 10>10</option>";

            $("#"+id).html(option);

            $("#"+id).change('click', function() {
            
                changeTexture();
            });

        }

        function sesionMaintainer(){

            var id = 'label-Maintainer'; text = 'Enter Maintainer : '; type = 'label';

            createField(id, text, 15, type, 2);

            idSucesor = objects.row2.buttons[objects.row2.buttons.length - 1].id;

            var object = {
                id : "imput-Maintainer",
                text : "textfield"
              };

            objects.idFields.maintainer = object.id;

            var imput = $('<input />', {"id" : object.id, "type" : "text", "text" : object.text });

            $("#"+objects.row2.div).append(imput);

            var button = document.getElementById(object.id);

            sucesorButton = document.getElementById(idSucesor);
                  
            button.placeholder = 'Github User';      
            button.style.position = 'absolute';
            button.style.top = objects.row2.y + 'px';
            button.style.left = (sucesorButton.offsetLeft + sucesorButton.clientWidth + 5) + 'px';
            button.style.zIndex = 10;
            button.style.opacity = 0;

            window.helper.show(button, 1000);

            objects.row2.buttons.push(object);

            button.addEventListener('blur', function() {

                changeTexture();
            });        

        }

        function sesionState(){

            var id = 'label-State'; text = 'Select the State : '; type = 'label';

            createField(id, text, 15, type);

            id = 'select-State'; text = ''; type = 'select';

            createField(id, text, 8, type);

            objects.idFields.state = id;

            var option = "";

            option += "<option value = concept>Concept</option>";
            option += "<option value = development>Development</option>";
            option += "<option value = production>Production</option>";
            option += "<option value = qa>QA</option>";

            $("#"+id).html(option);

            $("#"+id).change('click', function() {
            
                changeTexture();
            });

        }

        function createbutton(){

            var id = 'button-save'; text = 'Save'; type = 'button';

            var button = createField(id, text, 20, type, 2);

            button.className = 'actionButton';
            
            button.addEventListener('click', function() {

            });

        }

    }

    function changeTexture(){

        var table = {},
            data = {},
            scale = 5,
            mesh = null;

        table.group = document.getElementById(objects.idFields.platform).value;
        table.layer = document.getElementById(objects.idFields.layer).value;
        table.type = document.getElementById(objects.idFields.type).value;
        table.code_level = document.getElementById(objects.idFields.state).value;
        table.difficulty = document.getElementById(objects.idFields.difficulty).value;
        table.name = document.getElementById(objects.idFields.name).value;
        table.code = fillCode(document.getElementById(objects.idFields.name).value);
        table.author = document.getElementById(objects.idFields.author).value;
        table.maintainer = document.getElementById(objects.idFields.maintainer).value;
        table.found = true;

        data = dataUser(table.author);

        table.picture = data.picture;
        table.authorRealName = data.authorRealName;

        data = dataUser(table.maintainer);

        table.maintainerPicture = data.picture;
        table.maintainerRealName = data.authorRealName;

        mesh = objects.till.mesh;

        mesh.material.map = tileManager.createTexture(null, 'high', tileWidth, tileHeight, scale, table); 
        mesh.material.needsUpdate = true; 

        function dataUser(user){

            var data = {};

            for(var i = 0; i < testDataUser.length; i++){

                if(user.toLowerCase() === testDataUser[i].usrnm.toLowerCase()){

                    data.picture = testDataUser[i].avatar_url;
                    data.authorRealName = testDataUser[i].name;
                    data.authorEmail = testDataUser[i].email;
                }
            }

            return data;
        }

        function fillCode(text){

            var code = '',
                words = text.split(" "),
                cantWord = words.length,
                end = 1;

            if(cantWord === 1)       
                end = 3;
            else if(cantWord === 2)
                end = 2;

            for(var i = 0; i < words.length; i++){

                code += words[i].substr(0, end);
            }

            return code;
        }
    }

    function deleteMesh(){

        var mesh = objects.till.mesh;

        if(mesh != null){

            animate(mesh, objects.till.target, false, 1500, function(){ 
                    window.scene.remove(mesh);
                });

            objects.till.mesh = null;
        }
    }

    function animate(mesh, target, state, duration, callback){

        var _duration = duration || 2000,
            x,
            y,
            z,
            rx,
            ry,
            rz;

        if (state) {

           x = target.x;
           y = target.y;
           z = target.z;

           rx = 0;
           ry = 0;
           rz = 0;
        } 
        else {

           x = target.px;
           y = target.py;
           z = target.pz;
           
           rx = target.rx;
           ry = target.ry;
           rz = target.rz; 
        }  

        _duration = Math.random() * _duration + _duration;

        new TWEEN.Tween(mesh.position)
            .to({x : x, y : y, z : z}, _duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

        new TWEEN.Tween(mesh.rotation)
            .to({x: rx, y: ry, z: rz}, _duration + 500)
            .easing(TWEEN.Easing.Exponential.InOut)
            .onComplete(function () {
                    if(typeof(callback) === 'function')
                        callback();   
                })
            .start();
    }
    
}



/**
 * Represents a flow of actions related to some tiles
 * @param   {Object}  flow The objects that describes the flow including a set of steps
 */
function FlowManager(){

    // Private Variables
    var headerFlow = [],
        positionHeaderFlow = [],
        actualFlow = null;

    // Public method
    /**
     * @author Emmanuel Colina
     * Set position for each Header Flow
     * @param {Object} header target
     */

    this.createColumHeaderFlow = function (header){

        var countElement = 0, 
            obj, 
            ids = [], 
            position = [], 
            center;

        for (var i = 0; i < headerFlow.length; i++) {
            if(header.name === headerFlow[i].flow.platfrm){
                countElement = countElement + 1;
                ids.push(i);
            }
        }

        center = new THREE.Vector3();
        center.copy(header.position);
        center.y = center.y - 2700;

        if(countElement === 1){

            position.push(center); 
        }
        else if(countElement === 2) {

            center.x = center.x - 500;

            for (var k = 0; k < countElement; k++) {

                obj = new THREE.Vector3();

                obj.x = center.x;
                obj.y = center.y;
            
                position.push(obj);

                center.x = center.x + 1000;
            }
        }
        else if(countElement > 2){
            var mid;


            mid = Math.round(countElement / 2);
            
            for (var x = mid; x > 0; x--) {
                
                center.x = center.x - 1500;
            }

            for(var j = 0; j < countElement; j++){

                obj = new THREE.Vector3();

                obj.x = center.x + 1000;
                obj.y = center.y;

                position.push(obj);

                center.x = center.x + 1500;
            }
        }

        letAloneColumHeaderFlow(ids);
        setPositionColumHeaderFlow(ids, position);
        drawColumHeaderFlow(ids, position);
    };

    /**
    * @author Emmanuel Colina
    * @lastmodifiedBy Ricardo Delgado
    * Delete All the actual view to table
    */
    this.deleteAllWorkFlows = function(){

        var _duration = 2000;

        if(headerFlow){
            for(var i = 0; i < headerFlow.length; i++) {

                headerFlow[i].deleteAll();
                window.helper.hideObject(headerFlow[i].objects[0], false, _duration);
            }
        }
        
        headerFlow = [];
    };

    this.getActualFlow = function(){

        if(actualFlow) {
            for(var i = 0; i < actualFlow.length; i++) {
                actualFlow[i].deleteAll();
            }
            actualFlow = null;
        }
    };

    this.getAndShowFlows = function(id) {
        
        var element = window.table[id];
        
        var button = buttonsManager.createButtons('showFlows', 'Loading flows...');
        
        var url = window.helper.getAPIUrl("procs");
        url += '?platform=' + (element.group || element.superLayer) + '&layer=' + element.layer + '&component=' + element.name;
        
        $.ajax({
            url: url,
            method: "GET"
        }).success(
            function(processes) {
                var p = processes,
                    flows = [];
                
                for(var i = 0; i < p.length; i++) {
                    
                    flows.push(new ActionFlow(p[i]));
                }
                
                if(flows.length > 0) {
                    button.innerHTML = 'Show Workflows';
                    button.addEventListener('click', function() {
                        showFlow(flows);
                        buttonsManager.removeAllButtons();
                    });
                }
                else {
                    buttonsManager.deleteButton('showFlows');
                } 
            }
        );
    };

    this.showWorkFlow = function() {

        if (window.camera.getFocus() !== null) {

            window.camera.loseFocus();

            window.headers.transformWorkFlow(2000);

            for (var i = 0; i < headerFlow.length ; i++) {

                if(headerFlow[i].action){

                    headerFlow[i].deleteStep();
                    headerFlow[i].action = false;
                    headerFlow[i].showAllFlow();
                }
                else{
                    headerFlow[i].showAllFlow();
                }
            }
            
            window.helper.hideBackButton();
        }
    };

    /**
     * @author Emmanuel Colina
     * Get the headers flows
     */
    this.getHeaderFLow = function() {

        var url = window.helper.getAPIUrl("procs");
        
        $.ajax({
            url: url,
            method: "GET"
        }).success(
            function(processes) {
                var p = processes, objectHeaderInWFlowGroup;    
                
                for(var i = 0; i < p.length; i++){
                    headerFlow.push(new ActionFlow(p[i])); 
                }
                objectHeaderInWFlowGroup = window.headers.getPositionHeaderViewInFlow();   
                calculatePositionHeaderFLow(headerFlow, objectHeaderInWFlowGroup);   
            }
        );
    };

    // Private method

    /**
     * @author Emmanuel Colina
     * 
     */
     
    this.onElementClickHeaderFlow = function(id) {

        var duration = 1000;

        if (window.camera.getFocus() == null) {
            
            var camTarget = headerFlow[id].objects[0].clone();
            camTarget.position.y -= 850;

            window.camera.setFocus(camTarget, new THREE.Vector4(0, -850, 2600, 1),duration);

            for (var i = 0; i < headerFlow.length ; i++) {
                if(id !== i)
                    headerFlow[i].letAloneHeaderFlow();
            }

            headers.hidetransformWorkFlow(duration);

            setTimeout(function() {
                for (var i = 0; i < headerFlow[id].flow.steps.length; i++) {
                    headerFlow[id].drawTree(headerFlow[id].flow.steps[i], headerFlow[id].positions.target[0].x + 900 * i, headerFlow[id].positions.target[0].y - 211, 0);
                }
               headerFlow[id].showSteps();
            }, 1000);

            window.helper.showBackButton();
        }
    };

    /**
     * @author Emmanuel Colina
     * Calculate the headers flows
     */
    function calculatePositionHeaderFLow (headerFlow, objectHeaderInWFlowGroup) { 

        var position, indice = 1;
        var find = false;

        for (var i = 0; i < objectHeaderInWFlowGroup.length; i++) {

            for (var j = 0; j < headerFlow.length; j++) {

                if(objectHeaderInWFlowGroup[i].name === headerFlow[j].flow.platfrm){
                    
                    if(find === false){

                        position = new THREE.Vector3();

                        position.x = objectHeaderInWFlowGroup[i].position.x - 1500;

                        position.y = objectHeaderInWFlowGroup[i].position.y - 2500;

                        positionHeaderFlow.push(position);

                        headerFlow[j].draw(position.x, position.y, 0, indice, j);

                        find = true;
                    }
                    else
                    {
                        position = new THREE.Vector3();

                        position.x = objectHeaderInWFlowGroup[i].position.x - 1500;
                        
                        position.y = positionHeaderFlow[positionHeaderFlow.length - 1].y - 500;

                        headerFlow[j].draw(position.x, position.y, 0, indice, j);

                        positionHeaderFlow.push(position);
                    }    
                }
            }
            find = false;     
        }
    }

    //Should draw ONLY one flow at a time
    function showFlow (flows) {
    
        var position = window.camera.getFocus().position;
        var indice = 0;

        window.camera.enable();
        window.camera.move(position.x, position.y, position.z + window.TILE_DIMENSION.width * 5);
        
        setTimeout(function() {
            
            actualFlow = [];
            
            for(var i = 0; i < flows.length; i++) {
                actualFlow.push(flows[i]);
                flows[i].draw(position.x, position.y, 0, indice, i);
                
                //Dummy, set distance between flows
                position.x += window.TILE_DIMENSION.width * 10;
            }
            
        }, 1500);
    }

    /**
     * @author Emmanuel Colina
     * let alone the header flow
     * @param {Object} ids id of header flow
     */
    function letAloneColumHeaderFlow(ids){

        var find = false;

        for (var p = 0; p < headerFlow.length ; p++) {

            for(var q = 0; q < ids.length; q++){
                if(ids[q] === p)
                    find = true;
            }
            if(find === false)
                headerFlow[p].letAloneHeaderFlow();

            find = false;
        }
    }

    /**
     * @author Emmanuel Colina
     * set position to header flow
     * @param {Object} ids id of header flow
     * @param {Object} position of header flow
     */
    function setPositionColumHeaderFlow(ids, position){

        var duration = 3000;

        for (var i = 0, l = ids.length; i < l; i++) {
            new TWEEN.Tween(headerFlow[ids[i]].objects[0].position)
            .to({
                x : position[i].x,
                y : position[i].y,
                z : position[i].z
            }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        }
    }

    /**
     * @author Emmanuel Colina
     * draw header flow
     * @param {Object} ids id of header flow
     * @param {Object} position of header flow
     */
    function drawColumHeaderFlow(ids, position){

        for (var m = 0; m < ids.length; m++) {
            for (var k = 0; k < headerFlow[ids[m]].flow.steps.length; k++) {
                    headerFlow[ids[m]].drawTree(headerFlow[ids[m]].flow.steps[k], position[m].x + 900 * k, position[m].y - 211, 0);
            }

            headerFlow[ids[m]].showSteps();
            headerFlow[ids[m]].action = true;   
        }
    }
}
//var URL = "get_plugins.php";
//var URL = "http://52.11.156.16:3000/repo/comps";

function getData() {
    animate();
    
    var url = window.helper.getAPIUrl("comps");
    
    //url += "?env=development"; //When needed the development branch, for lab.fermat.org
    
 $.ajax({
        url: url,
        method: "GET"
    }).success(
        function (lists) {
        
            window.loadMap(function() {

                window.tileManager.JsonTile(function() {

                    window.preLoad(function() {

                        tileManager.fillTable(lists);

                        TWEEN.removeAll();
                        window.logo.stopFade();
                        init();
                    });
                });
            });
        });

//Use when you don't want to connect to server
/*setTimeout(function(){
        var l = JSON.parse(testData);
        
        window.preLoad(function() {
        
                window.loadMap(function() {
                    tileManager.fillTable(l);

                    TWEEN.removeAll();
                    logo.stopFade();
                    init();
                });
            });

    }, 6000);*/
}
/**
 * @class Represents the group of all header icons
 * @param {Number} columnWidth         The number of elements that contains a column
 * @param {Number} superLayerMaxHeight Max rows a superLayer can hold
 * @param {Number} groupsQtty          Number of groups (column headers)
 * @param {Number} layersQtty          Number of layers (rows)
 * @param {Array}  superLayerPosition  Array of the position of every superlayer
 */
function Headers(columnWidth, superLayerMaxHeight, groupsQtty, layersQtty, superLayerPosition) {
        
    // Private members
    var objects = [],
        dependencies = {
            root : []
        },
        positions = {
            table : [],
            stack : [],
            workFlow: []
        },
        arrowsPositions = {
            origin: [],
            stack: []
        },
        self = this,
        graph = {},
        arrows = [];
    
    this.dep = dependencies;
    this.arrows = arrows;
    this.arrowPositions = arrowsPositions;

    var onClick = function(target) { 
        if(window.actualView === 'workflows')
            onElementClickHeader(target.userData.id, objects);
    };

    function onElementClickHeader(id, objects)
    {
        var duration = 1000;

        if(camera.getFocus() == null){
            var camTarget = objects[id].clone();
            camTarget.position.y -= 2500;

            window.camera.setFocus(camTarget, new THREE.Vector4(0, -2500, 9000, 1), duration);

        for (var i = 0; i < objects.length ; i++) {
                if(id !== i)
                    letAloneHeader(objects[i]);
            }

            helper.showBackButton();
        }

        flowManager.createColumHeaderFlow(objects[id]);
    }

    /**
     * @author Emmanuel Colina
     * let alone the header
     * @param {Object} objHeader Header target
     */

    function letAloneHeader(objHeader){
        var i, _duration = 2000,
            distance = camera.getMaxDistance() * 2,
            out = window.viewManager.translateToSection('workflows', new THREE.Vector3(0, 0, distance));

        var target;

        var animate = function (object, target, dur) {

            new TWEEN.Tween(object.position)
                .to({
                    x: target.x,
                    y: target.y,
                    z: target.z
                }, dur)
                .easing(TWEEN.Easing.Exponential.InOut)
                .onComplete(function () {
                    object.userData.flying = false;
                })
                .start();
        };

        target = out;
        objHeader.userData.flying = true;
        animate(objHeader, target, Math.random() * _duration + _duration);
    }

    // Public method

    this.getPositionHeaderViewInFlow = function(){
        return positions.workFlow;
    };
    /**
     * @author Emmanuel Colina
     * @lastmodifiedBy Miguel Celedon
     * Create the Arrows (dependences)
     */

    this.createArrows = function(startX,startY,endX,endY) { 
        
        var POSITION_X = 1700;
        var POSITION_Y = 200;
        var POSITION_Z = 44700;

        //camera.resetPosition();

        endY = endY - 300;

        var from = new THREE.Vector3( startX, startY, 0);

        var to = new THREE.Vector3( endX, endY, 0);

        var direction = to.clone().sub(from);

        var length = direction.length();

        var arrowHelper = new THREE.ArrowHelper(direction.normalize(), from, length, 0XF26662, 550, 300);

        var objectStack = new THREE.Object3D();
        var objectOrigin = new THREE.Object3D();

        arrowHelper.position.x = arrowHelper.position.x - POSITION_X;
        arrowHelper.position.y = arrowHelper.position.y - POSITION_Y;
        arrowHelper.position.z = POSITION_Z;

        objectStack.position.copy(arrowHelper.position);
        objectStack.rotation.copy(arrowHelper.rotation);
        arrowsPositions.stack.push(objectStack);

        arrowHelper.line.material.opacity = 0;
        arrowHelper.line.material.transparent = true;

        arrowHelper.cone.material.opacity = 0;
        arrowHelper.cone.material.transparent = true;


        var startingPosition = window.helper.getOutOfScreenPoint(0);
        arrowHelper.position.copy(viewManager.translateToSection('stack', startingPosition));
        arrowHelper.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

        objectOrigin.position.copy(arrowHelper.position);
        objectOrigin.rotation.copy(arrowHelper.rotation);
        arrowsPositions.origin.push(objectOrigin);

        scene.add(arrowHelper);
        arrows.push(arrowHelper);
    };

    /**
     * @author Miguel Celedon
     * @lastmodifiedBy Miguel Celedon
     * Arranges the headers by dependency
     * @param {Number} [duration=2000] Duration in milliseconds for the animation
     */
    this.transformStack = function(duration) {
        var _duration = duration || 2000;

        
        createEdges();
        self.moveToPosition(duration, duration / 2);
        
        var i, l;

        for (i = 0, l = objects.length; i < l; i++) {
            new TWEEN.Tween(objects[i].position)
            .to({
                x : positions.stack[i].position.x,
                y : positions.stack[i].position.y,
                z : positions.stack[i].position.z
            }, _duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        }
        
        new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
    };

    /**
     * @author Emmanuel Colina
     * Arranges the headers by dependency
     * @param {Number} [duration=2000] Duration in milliseconds for the animation
     */
    this.transformWorkFlow = function(duration) {
        var _duration = duration || 2000;

        var i, l;

        for (i = 0, l = objects.length; i < l; i++) {
            new TWEEN.Tween(objects[i].position)
            .to({
                x : positions.workFlow[i].position.x,
                y : positions.workFlow[i].position.y,
                z : positions.workFlow[i].position.z
            }, _duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        }
        
        new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
    };

    /**
     * @author Emmanuel Colina
     * Hide the headers
     */
    this.hidetransformWorkFlow = function (duration) {
        var i, j,
            position;
        
        for (i = 0; i < objects.length; i++ ) {
            
            position = window.helper.getOutOfScreenPoint(0);
            
            new TWEEN.Tween(objects[i].position)
            .to({x : position.x, y : position.y, z : position.z}, duration)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();
        }
    };

    /**
     * @author Emmanuel Colina
     * Calculates the stack target position
     */
    var calculateStackPositions = function() {
        
        var i, j, k, p, q, m, l, n, obj, actualpositionY, rootpositionY, rootlengthX, midpositionX, actuallengthX, positionstart;
        var POSITION_Z = 45000;

        // Dummy, send all to center
        for(i = 0; i < objects.length; i++) {
            obj = new THREE.Object3D();
            obj.name = positions.table[i].name;
            positions.stack.push(obj);
        }

        for (j = 0; j< objects.length; j++) {
            
            //calculando Y
            if(graph.nodes[j].level === 0){

               for(i = 0; i < objects.length; i++){

                    if(graph.nodes[j].id == objects[i].name){ //Coordenadas de inicio level = 0
                        positions.stack[i].position.x = 0;
                        positions.stack[i].position.y = -15000;
                        positions.stack[i].position.z = POSITION_Z;
                        break;
                    }        
               }
               rootpositionY = positions.stack[i].position.y;
               rootlengthX = dependencies[graph.nodes[j].id].length;
                //obj.position.set(0, -14000, 45000); //coordenadas de entradas del root(OSA)
            }
            else if(graph.nodes[j].level !== 0){ //coordenadas level distinto de 0

                for(i = 0; i < objects.length; i++){
                    if(graph.nodes[j].id == objects[i].name){
                        positions.stack[i].position.z = POSITION_Z;

                        //calculando Y
                        actualpositionY = rootpositionY;
                        for(k = 0; k < graph.nodes[j].level; k++){

                            positions.stack[i].position.y = actualpositionY + 5000;
                            actualpositionY = positions.stack[i].position.y;
                        }

                        //Calculando X
                        if(positions.stack[i].position.x === 0){// Verifica si hay alguna X con valores     if1
                            actuallengthX = rootlengthX;
                            positionstart = 0;
                            if(actuallengthX % 2 !== 0){ //Cantidad de Hijos impar
                                midpositionX = (rootlengthX / 2)+0.5;
                                if(graph.nodes[j].level == 6){
                                    for(p = 0; p < objects.length; p++){
                                        if(graph.nodes[j].id == objects[p].name){
                                            for(q = 0; q < objects.length; q++){
                                               if(graph.nodes[j-1].id == objects[q].name){
                                                    positions.stack[p].position.x = positions.stack[q].position.x;//Heredamos la X del padre para construir de ahi una nueva rama y evitar el cruces de ramas
                                               }
                                            }
                                        }
                                    }
                                }
                                if(actuallengthX == 1 && graph.nodes[j].level != 6){// un hijo
                                    for(m = 0; m < objects.length; m++){
                                        if(graph.nodes[j].id == objects[m].name){
                                            positions.stack[m].position.x = 0;
                                            rootlengthX = dependencies[graph.nodes[j].id].length;
                                        }
                                    }
                                }
                                else{// Varios hijos
                                    for(p = midpositionX; p > 1; p--){
                                        positionstart = positionstart - 5000;
                                    }
                                    for(l = 0; l < dependencies[graph.nodes[j-1].id].length; l++){//l es el indice de arreglos de hijos
                                        for(n = 0; n < objects.length; n++){
                                            if(dependencies[graph.nodes[j-1].id][l] == objects[n].name){
                                                positions.stack[n].position.x = positions.stack[n].position.x + positionstart;
                                                positionstart = positionstart + 5000;
                                                rootlengthX = dependencies[graph.nodes[j].id].length;
                                            }
                                        }
                                    }
                                }
                            }
                            else if(actuallengthX % 2 === 0){ //Cantidad de hijos par
                                midpositionX = actuallengthX/2;
                                for(p = midpositionX; p >= 1; p--){
                                    positionstart = positionstart - 5000;
                                }
                                for(l = 0; l < dependencies[graph.nodes[j-1].id].length; l++){
                                    for(n = 0; n < objects.length; n++){
                                        if(dependencies[graph.nodes[j-1].id][l] == objects[n].name){
                                            if(positionstart === 0)
                                                positionstart = positionstart + 5000;
                                            if(positionstart !== 0){
                                                positions.stack[n].position.x = positions.stack[n].position.x + positionstart;
                                                for(q = 0; q < objects.length; q++){
                                                   if(graph.nodes[j-1].id == objects[q].name){
                                                        positions.stack[n].position.x = positions.stack[n].position.x + positions.stack[q].position.x;//Heredamos la X del padre para construir de ahi una nueva rama y evitar el cruces de ramas
                                                   }
                                                } 
                                                positionstart = positionstart + 5000;
                                                rootlengthX = dependencies[graph.nodes[j].id].length;
                                            }
                                        }
                                    }      
                                }
                            }
                        }//if 1
                    }
                }
            }
        }
        
        //Transport all headers to the stack section
        for(i = 0; i < positions.stack.length; i++) {
            positions.stack[i].position.copy(window.viewManager.translateToSection('stack', positions.stack[i].position));
        }
    };

    /**
     * @author Emmanuel Colina
     * @lastmodifiedBy Miguel Celedon
     * Paint the dependences
     */
    var createEdges = function() { 

        var startX, startY, endX, endY;
        
        var i, j;
        
        
        for (i = 0; i < graph.edges.length; i++)
        {   
            startX = 0;
            startY = 0;
            endX = 0;
            endY = 0;
            
            for (j = 0; j < objects.length; j++){
                
                 if(graph.edges[i].from === objects[j].name){
                    startX = positions.stack[j].position.x;
                    startY = positions.stack[j].position.y;
                }
                
                if(graph.edges[i].to === objects[j].name){
                    endX = positions.stack[j].position.x;
                    endY = positions.stack[j].position.y;
                }
            }
           
            self.createArrows(startX, startY, endX, endY);             
        }
    };

    /**
     * @author Emmanuel Colina
     * @lastmodifiedBy Miguel Celedon
     * Arranges the headers in the table
     * @param {Number} [duration=2000] Duration of the animation
     */
    this.flyOut = function(duration){

        var _duration = duration || 2000,
            i, l;

        for(i = 0, l = arrows.length; i < l; i++) {
            
            new TWEEN.Tween(arrows[i].position)
            .to({
                x : arrowsPositions.origin[i].position.x,
                y : arrowsPositions.origin[i].position.y,
                z : arrowsPositions.origin[i].position.z
            }, Math.random() * _duration + _duration)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();

             new TWEEN.Tween(arrows[i].rotation)
            .to({
                x : arrowsPositions.origin[i].rotation.x,
                y : arrowsPositions.origin[i].rotation.y,
                z : arrowsPositions.origin[i].rotation.z
            }, Math.random() * _duration + _duration)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();
            
            helper.hideObject(arrows[i].line, false, _duration);
            helper.hideObject(arrows[i].cone, false, _duration);
        }

        new TWEEN.Tween(this)
        .to({}, _duration * 2)
        .onUpdate(render)
        .start();
        
        arrows = [];
    };

    /**
     * @author Emmanuel Colina
     * @lastmodifiedBy Miguel Celedon
     *  Arranges the headers in the table
     * @param {Number} [duration=2000] Duration of the animation
     * @param {Number} [delay=0]       Delay of the animation
     */
    this.moveToPosition = function(duration, delay){

        var _duration = duration || 2000,
            i, l;
        
        delay = (delay !== undefined) ? delay : 0;

        for(i = 0, l = arrows.length; i < l; i++) {
            
            helper.showMaterial(arrows[i].line.material, Math.random() * _duration + _duration, TWEEN.Easing.Exponential.InOut, delay);
            helper.showMaterial(arrows[i].cone.material, Math.random() * _duration + _duration, TWEEN.Easing.Exponential.InOut, delay);
            
            new TWEEN.Tween(arrows[i].position)
            .to({
                x : arrowsPositions.stack[i].position.x,
                y : arrowsPositions.stack[i].position.y,
                z : arrowsPositions.stack[i].position.z
            }, Math.random() * _duration + _duration)
            .easing(TWEEN.Easing.Cubic.InOut)
            .delay(delay)
            .start();

            new TWEEN.Tween(arrows[i].rotation)
            .to({
                x : arrowsPositions.stack[i].rotation.x,
                y : arrowsPositions.stack[i].rotation.y,
                z : arrowsPositions.stack[i].rotation.z
            }, Math.random() * _duration + _duration)
            .easing(TWEEN.Easing.Cubic.InOut)
            .delay(delay)
            .start();
        }
    };

    /**
     * @author Miguel Celedon
     * @lastmodifiedBy Miguel Celedon        
     * Arranges the headers in the table
     * @param {Number} [duration=2000] Duration of the animation
     */

    this.transformTable = function(duration) {
        var _duration = duration || 2000,
            i, l;

        self.flyOut();        

        self.showHeaders(_duration);
        
        new TWEEN.Tween(this)
            .to({}, _duration * 2)
            .onUpdate(render)
            .start();
    };
    
    /**
     * Shows the headers as a fade
     * @param {Number} duration Milliseconds of fading
     */
    this.showHeaders = function (duration) {
        var i, j;
           
        for (i = 0; i < objects.length; i++ ) {

            new TWEEN.Tween(objects[i].position)
            .to({
                x : positions.table[i].position.x,
                y : positions.table[i].position.y,
                z : positions.table[i].position.z
            }, duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();


            for(j = 0; j < objects[i].levels.length; j++) {
                new TWEEN.Tween(objects[i].levels[j].object.material)
                .to({opacity : 1, needsUpdate : true}, duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();
            }
        }
    };
    
    /**
     * Hides the headers (but donesn't delete them)
     * @param {Number} duration Milliseconds to fade
     */
    this.hideHeaders = function (duration) {
        var i, j,
            position;
        
        for (i = 0; i < objects.length; i++ ) {
            
            position = window.helper.getOutOfScreenPoint(0);
            
            new TWEEN.Tween(objects[i].position)
            .to({x : position.x, y : position.y, z : position.z}, duration)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();
            
            for(j = 0; j < objects[i].levels.length; j++) {
                
                new TWEEN.Tween(objects[i].levels[j].object.material)
                .to({opacity : 0, needsUpdate : true}, duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();
            }
        }
    };
    
    // Initialization code
    //=========================================================
    
    /**
     * @author Miguel Celedon
     * @lastmodifiedBy Miguel Celedon
     * Creates the dependency graph
     * @returns {Object} Object containing the data and options
     */
    var buildGraph = function() {
        
        var data, edges = [], nodes = [], options, level = 0, pending = {};
            
        var trace = function(root, parent, _level, _nodes, _edges) {
            
            if(parent) pending[parent] = true;
            
            var i, l, child,
                lookup = function(x) { return x.id == child; };

            for(i = 0, l = root.length; i < l; i++) {

                child = root[i];

                if(_level !== 0) _edges.push({from : parent, to : child});

                if($.grep(_nodes, lookup).length === 0)
                {
                    _nodes.push({
                        id : child,
                        image : 'images/headers/svg/' + child + '_logo.svg',
                        level : _level
                    });
                }

                if(pending[child] === undefined)
                    trace(dependencies[child], child, _level + 1, _nodes, _edges);
            }
        };
        
        trace(dependencies.root, null, level, nodes, edges);
        
        data = {
            edges : edges,
            nodes : nodes
        };
        
        graph = data;
    };

    /**
     * @author Emmanuel Colina
     * Calculate the position header
     */
     
    var headersPositionsViewWorkFlow = function() {

        var width, height, group, headerData, objectHeaderInWFlowGroup, slayer, column;
        
        for(group in groups){
            if (window.groups.hasOwnProperty(group) && group !== 'size'){
                headerData = window.groups[group];
                column = headerData.index;

                width = columnWidth * window.TILE_DIMENSION.width;
                height = width * 443 / 1379;
   
                objectHeaderInWFlowGroup = new THREE.Object3D();
            
                objectHeaderInWFlowGroup.position.x = ((columnWidth * window.TILE_DIMENSION.width) * (column - (groupsQtty - 1) / 2) + ((column - 1) * window.TILE_DIMENSION.width)) + 10000;
                objectHeaderInWFlowGroup.position.y = ((layersQtty + 10) * window.TILE_DIMENSION.height) / 2;
                objectHeaderInWFlowGroup.name = group;

                objectHeaderInWFlowGroup.position.copy(window.viewManager.translateToSection('workflows', objectHeaderInWFlowGroup.position));
                positions.workFlow.push(objectHeaderInWFlowGroup);
            }  
        }
        for(slayer in superLayers){
            if (window.superLayers.hasOwnProperty(slayer) && slayer !== 'size'){
                headerData = window.superLayers[slayer];

                column = headerData.index + 1;

                width = columnWidth * window.TILE_DIMENSION.width;
                height = width * 443 / 1379;
   
                objectHeaderInWFlowGroup = new THREE.Object3D();
            
                objectHeaderInWFlowGroup.position.x = ((columnWidth * window.TILE_DIMENSION.width) * (column - (groupsQtty - 1) / 2) + ((column - 1) * window.TILE_DIMENSION.width)) - 15000;
                objectHeaderInWFlowGroup.position.y = ((layersQtty + 10) * window.TILE_DIMENSION.height) / 2;
                objectHeaderInWFlowGroup.name = slayer;

                objectHeaderInWFlowGroup.position.copy(window.viewManager.translateToSection('workflows', objectHeaderInWFlowGroup.position));
                positions.workFlow.push(objectHeaderInWFlowGroup);
            }  
        }
    };

    var initialize = function() {
        
        var headerData,
            group,
            column,
            image,
            object,
            slayer,
            row;
            
        function createChildren(child, parents) {
                
                var i, l, actual;
                
                if(parents != null && parents.length !== 0) {

                    for(i = 0, l = parents.length; i < l; i++) {

                        dependencies[parents[i]] = dependencies[parents[i]] || [];
                        
                        actual = dependencies[parents[i]];

                        actual.push(child);
                    }
                }
                else {
                    dependencies.root.push(child);
                }
                
                dependencies[child] = dependencies[child] || [];
            }
        
        function createHeader(group, width, height, index) {
            
            var source,
                levels = [
                    ['high', 0],
                    ['medium', 8000],
                    ['small', 16000]],
                i, l,
                header = new THREE.LOD();

            for(i = 0, l = levels.length; i < l; i++) {
            
                source = 'images/headers/' + levels[i][0] + '/' + group + '_logo.png';
                
                var object = new THREE.Mesh(
                    new THREE.PlaneBufferGeometry(width, height),
                    new THREE.MeshBasicMaterial({transparent : true, opacity : 0})
                    );

                object.name = group;
                object.userData = {
                    id: index,
                    onClick : onClick
                };
                
                helper.applyTexture(source, object);

                header.addLevel(object, levels[i][1]);
            }
            
            return header;
        }
        
        var src, width, height;
            
        for (group in groups) {
            if (window.groups.hasOwnProperty(group) && group !== 'size') {

                headerData = window.groups[group];
                column = headerData.index;

                width = columnWidth * window.TILE_DIMENSION.width;
                height = width * 443 / 1379;

                object = createHeader(group, width, height, column);
                
                object.position.copy(window.viewManager.translateToSection('table', window.helper.getOutOfScreenPoint(0)));
                object.name = group;

                scene.add(object);
                objects.push(object);

                object = new THREE.Object3D();
                
                object.position.x = (columnWidth * window.TILE_DIMENSION.width) * (column - (groupsQtty - 1) / 2) + ((column - 1) * window.TILE_DIMENSION.width);
                object.position.y = ((layersQtty + 10) * window.TILE_DIMENSION.height) / 2;
                object.name = group;         

                object.position.copy(window.viewManager.translateToSection('table', object.position));
                positions.table.push(object);

                createChildren(group, headerData.dependsOn);
            }
        }

        for (slayer in superLayers) {
            if (window.superLayers.hasOwnProperty(slayer) && slayer !== 'size') {
                
                headerData = window.superLayers[slayer];

                row = superLayerPosition[headerData.index];
 
                width = columnWidth * window.TILE_DIMENSION.width;
                height = width * 443 / 1379;

                object = createHeader(slayer, width, height, row);
                
                object.position.copy(window.viewManager.translateToSection('table', window.helper.getOutOfScreenPoint(0)));
                
                object.name = slayer;
                

                scene.add(object);
                objects.push(object);
                
                object = new THREE.Object3D();

                object.position.x = -(((groupsQtty + 1) * columnWidth * window.TILE_DIMENSION.width / 2) + window.TILE_DIMENSION.width);
                object.position.y = -(row * window.TILE_DIMENSION.height) - (superLayerMaxHeight * window.TILE_DIMENSION.height / 2) + (layersQtty * window.TILE_DIMENSION.height / 2);
                object.name = slayer;

                object.position.copy(window.viewManager.translateToSection('table', object.position));
                positions.table.push(object);

                createChildren(slayer, headerData.dependsOn);
            }
        }
        
        buildGraph();
        calculateStackPositions();
        headersPositionsViewWorkFlow();
    };
    
    initialize();
    //=========================================================
}

/**
 * Static object with help functions commonly used
 */
function Helper() {

    /**
     * Hides an element vanishing it and then eliminating it from the DOM
     * @param {DOMElement} element         The element to eliminate
     * @param {Number}     [duration=1000] Duration of the fade animation
     * @param {Boolean}    [keep=false]     If set true, don't remove the element, just dissapear
     */
    this.hide = function(element, duration, keep, callback) {

        var dur = duration || 1000,
            el = element;

        if (typeof(el) === "string") {
            el = document.getElementById(element);
        }

        if(el) {
            $(el).fadeTo(duration, 0, function() {
                if(keep)
                    el.style.display = 'none';
                else
                    $(el).remove();

                if(callback != null && typeof(callback) === 'function')
                    callback(); 
            });
        }

    };

    this.hideButtons = function(){

        if( $('#developerButton') != null ) window.helper.hide($('#developerButton'), 1000);
        if( $('#showFlows') != null ) window.helper.hide($('#showFlows'), 1000);
        if( $('#showScreenshots') != null ) window.helper.hide($('#showScreenshots'), 1000);        
    }
    
    /**
     * @author Miguel Celedon
     *
     * Shows an HTML element as a fade in
     * @param {Object} element         DOMElement to show
     * @param {Number} [duration=1000] Duration of animation
     */
    this.show = function(element, duration) {
        
        duration = duration || 1000;

        if (typeof(element) === "string") {
            element = document.getElementById(element);
        }

        $(element).fadeTo(duration, 1, function() {
                $(element).show();
            });
    };
    
    /**
     * Shows a material with transparency on
     * @param {Object} material                                Material to change its opacity
     * @param {Number} [duration=2000]                         Duration of animation
     * @param {Object} [easing=TWEEN.Easing.Exponential.InOut] Easing of the animation
     * @param {delay}  [delay=0]
     */
    this.showMaterial = function(material, duration, easing, delay) {
        
        if(material && typeof material.opacity !== 'undefined') {
            
            duration = duration || 2000;
            easing = (typeof easing !== 'undefined') ? easing : TWEEN.Easing.Exponential.InOut;
            delay = (typeof delay !== 'undefined') ? delay : 0;

            new TWEEN.Tween(material)
                .to({opacity : 1}, duration)
                .easing(easing)
                .onUpdate(function() { this.needsUpdate = true; })
                .delay(delay)
                .start();
        }
    };
    
    /**
     * Deletes or hides the object
     * @param {Object}  object          The mesh to hide
     * @param {Boolean} [keep=true]     If false, delete the object from scene
     * @param {Number}  [duration=2000] Duration of animation
     */
    this.hideObject = function(object, keep, duration) {
        
        duration = duration || 2000;
        keep = (typeof keep === 'boolean') ? keep : true;
        
        new TWEEN.Tween(object.material)
            .to({opacity : 0}, duration)
            .onUpdate(function() { this.needsUpdate = true; })
            .onComplete(function() { if(!keep) window.scene.remove(object); })
            .start();
    };

    /**
     * Clones a tile and *without* it's developer picture
     * @param   {String} id    The id of the source
     * @param   {String} newID The id of the created clone
     * @returns {DOMElement} The cloned tile without it's picture
     */
    this.cloneTile = function(id, newID) {

        var clone = document.getElementById(id).cloneNode(true);

        clone.id = newID;
        clone.style.transform = '';
        $(clone).find('.picture').remove();

        return clone;
    };

    /**
     * Parses ISODate to a javascript Date
     * @param   {String} date Input
     * @returns {Date}   js Date object (yyyy-mm-dd)
     */
    this.parseDate = function(date) {

        if (date == null) return null;

        var parts = date.split('-');

        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    /**
     * Capitalizes the first letter of a word
     * @param   {String} string Input
     * @returns {String} input capitalized
     */
    this.capFirstLetter = function(string) {

        var words = string.split(" ");
        var result = "";

        for (var i = 0; i < words.length; i++)
            result += words[i].charAt(0).toUpperCase() + words[i].slice(1) + " ";

        return result.trim();
    };

    /**
     * Extract the code of a plugin
     * @param   {String} pluginName The name of the plugin
     * @returns {String} Code of the plugin
     */
    this.getCode = function(pluginName) {

        var words = pluginName.split(" ");
        var code = "";

        if (words.length == 1) { //if N = 1, use whole word or 3 first letters

            if (words[0].length <= 4)
                code = this.capFirstLetter(words[0]);
            else
                code = this.capFirstLetter(words[0].slice(0, 3));
        } else if (words.length == 2) { //if N = 2 use first cap letter, and second letter

            code += words[0].charAt(0).toUpperCase() + words[0].charAt(1);
            code += words[1].charAt(0).toUpperCase() + words[1].charAt(1);
        } else { //if N => 3 use the N (up to 4) letters caps

            var max = (words.length < 4) ? words.length : 4;

            for (var i = 0; i < max; i++)
                code += words[i].charAt(0).toUpperCase();
        }

        return code;
    };

    /**
     * parse dir route from an element data
     * @method getRepoDir
     * @param  {Element}   item table element
     * @return {String}   directory route
     */
    this.getRepoDir = function(item) {
        //console.dir(item);
        var _root = "fermat",
            _group = item.group ? item.group.toUpperCase().split(' ').join('_') : null,
            _type = item.type ? item.type.toLowerCase().split(' ').join('_') : null,
            _layer = item.layer ? item.layer.toLowerCase().split(' ').join('_') : null,
            _name = item.name ? item.name.toLowerCase().split(' ').join('-') : null;

        if (_group && _type && _layer && _name) {
            return _group + "/" + _type + "/" + _layer + "/" +
                _root + "-" + _group.split('_').join('-').toLowerCase() + "-" + _type.split('_').join('-') + "-" + _layer.split('_').join('-') + "-" + _name + "-bitdubai";
        } else {
            return null;
        }
    };
    
    /**
     * Returns the route of the API server
     * @author Miguel Celedon
     * @param   {string} route The name of the route to get
     * @returns {string} The URL related to the requested route
     */
    this.getAPIUrl = function(route) {
        
        var SERVER = "http://52.35.117.6:3000";
        var tail = "";
        
        switch(route) {
                
            case "comps":
                tail = "/v1/repo/comps";
                break;
            case "procs":
                tail = "/v1/repo/procs";
                break;
            case "servers":
                tail = "/v1/network/servers";
                break;
            case "nodes":
                tail = "/v1/network/node";
                break;
        }
        
        return SERVER + tail;
    };
    
    /**
     * Loads a texture and applies it to the given mesh
     * @param {String}   source     Address of the image to load
     * @param {Mesh}     object     Mesh to apply the texture
     * @param {Function} [callback] Function to call when texture gets loaded, with mesh as parameter
     */
    this.applyTexture = function(source, object, callback) {
        
        if(source != null && object != null) {
        
            var loader = new THREE.TextureLoader();

            loader.load(
                source,
                function(tex) {
                    tex.minFilter = THREE.NearestFilter;
                    tex.needsUpdate = true;
                    object.material.map = tex;
                    object.needsUpdate = true;

                    //console.log(tex.image.currentSrc);

                    if(callback != null && typeof(callback) === 'function')
                        callback(object);
                }
            );
        }
    };
    
    /**
     * Draws a text supporting word wrap
     * @param   {String} text       Text to draw
     * @param   {Number} x          X position
     * @param   {Number} y          Y position
     * @param   {Object} context    Canvas context
     * @param   {Number} maxWidth   Max width of text
     * @param   {Number} lineHeight Actual line height
     * @returns {Number} The Y coordinate of the next line
     */
    this.drawText = function(text, x, y, context, maxWidth, lineHeight) {
    
        if(text) {
            var words = text.split(' ');
            var line = '';

            for(var n = 0; n < words.length; n++) {
              var testLine = line + words[n] + ' ';
              var metrics = context.measureText(testLine);
              var testWidth = metrics.width;
              if (testWidth > maxWidth && n > 0) {
                context.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
              }
              else {
                line = testLine;
              }
            }
            context.fillText(line, x, y);

            return y + lineHeight;
        }
        
        return 0;
    };
    
    /**
     * Searchs an element given its full name
     * @param   {String} elementFullName Name of element in format [group]/[layer]/[name]
     * @returns {Number} The ID of the element in the table
     */
    this.searchElement = function(elementFullName) {
        
        if(typeof elementFullName !== 'string') return -1;
        
        var group,
            components = elementFullName.split('/');
        
        if(components.length === 3) {
        
            for(var i = 0, l = table.length; i < l; i++) {

                group = table[i].group || window.layers[table[i].layer].super_layer;

                if(group.toLowerCase() === components[0].toLowerCase() &&
                   table[i].layer.toLowerCase() === components[1].toLowerCase() &&
                   table[i].name.toLowerCase() === components[2].toLowerCase())
                    return i;
            }
        }

        return -1;
    };
    
    this.getOutOfScreenPoint = function(z) {
        
        z = (z !== undefined) ? z : 0;
        
        var away = window.camera.getMaxDistance() * 4;
        var point = new THREE.Vector3(0, 0, z);
        
        point.x = Math.random() * away + away * ((Math.floor(Math.random() * 10) % 2) * -1);
        point.y = Math.random() * away + away * ((Math.floor(Math.random() * 10) % 2) * -1);
        
        return point;
    };
    
    /**
     * Checks whether the given vector's components are numbers
     * @author Miguel Celedon
     * @param   {object}  vector The instance to check
     * @returns {boolean} True if the vector is valid, false otherwise
     */
    this.isValidVector = function(vector) {
        
        var valid = true;
        
        if(!vector) {
            valid = false;
        }
        else if(isNaN(vector.x) || isNaN(vector.y) || isNaN(vector.z)) {
            valid = false;
        }
        
        return valid;
    };
    
    this.showBackButton = function() {
        window.helper.show('backButton');
    };
    
    this.hideBackButton = function() {
        window.helper.hide('backButton', 1000, true);
    };
}

function Loader() {

    /**
     * [getStamp description]
     * @method getStamp
     * @return {[type]} [description]
     */
    function getStamp() {
        var img = document.createElement("img");
        img.className = 'stamp';
        img.src = 'images/alt_not_found.png';
        img.alt = 'Not Found';
        img.style.width = '90%';
        //img.style.margin = '35% 0 0 0';
        //img.style["margin-right"] = '80%';
        img.style.left = '5%';
        img.style.top = '40%';
        img.style.position = 'absolute';
        return img;
    }

    /**
     * check all elements in table
     * @method findThemAll
     */
    this.findThemAll = function() {
        for (var i = 0, l = table.length; i < l; i++) {
            if (!table[i].found && table[i].code_level == "concept") {
                var strIndex = "#" + i;
                $(strIndex).append(getStamp());
            }
        }
    };
}
/**
 * @author Emmanuel Colina
 * @lastmodifiedBy Miguel Celedon
 * function create a logo (wallet) and charge your textures
 */
function Logo(){
    
    var self = this;

    var POSITION_Z = 35000,
        SCALE = 24;
    
    var logo = createLogo(1000, 1000, "images/fermat_logo.png", new THREE.Vector3(0, 0, POSITION_Z));
    this.logo = logo;
    
    function createLogo(width, height, texture, position) {
        
        var mesh = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(width, height),
            new THREE.MeshBasicMaterial({ side: THREE.FrontSide, transparent : true, opacity : 0, color : 0xFFFFFF}));
        helper.applyTexture(texture, mesh);
        
        mesh.scale.set(SCALE, SCALE, SCALE);
        mesh.position.copy(position);
        scene.add(mesh);
        
        return mesh;
    }
    
    /**
     * Starts the logo fade animation
     * @param {Number} [duration=1000] The duration of the fade
     * @author Miguel Celedon
     */
    this.startFade = function(duration) {
        
        var _duration = duration || 1500;

        var tween1 = new TWEEN.Tween(logo.material)
        .to({ opacity : 1, needsUpdate : true}, _duration)
        .onUpdate(render);
        
        var tween2 = new TWEEN.Tween(logo.material)
        .to({ opacity : 0.05, needsUpdate : true}, _duration)
        .onUpdate(render);

        tween1.chain(tween2);
        tween2.chain(tween1);

        tween1.start();
    };
    
    /**
     * Stops the fade animation
     * @param {Number} [duration=1000] The duration of the fade
     * @author Miguel Celedon
     */
    this.stopFade = function(duration) {
        
        var _duration = duration || 1000;

        var tweenstop = new TWEEN.Tween(logo.material)
        .to({ opacity : 1, needsUpdate : true}, _duration)
        .onUpdate(render)
        .start();
    };
}

/**
 * @author Ricardo Delgado
 * Create, modify and read all the necessary elements to create magazines.
 */
function Magazine() {
		
    window.PDFJS.disableWorker = true;

    var MAGAZINE = null,
        SCALE = null,
        WIDTH = window.innerWidth * 0.64,
        HEIGHT = (WIDTH * 0.5) * 1.21,
        DOC = null,
        LOAD = null,
        CONTENT = null;

    var viewMagazine = {

            book : { 
				file : "books/fermat-book-big.pdf",
				coverFront : "images/magazine/book/cover-front.jpg",
				coverFrontInside : "images/magazine/book/cover-front-inside.jpg",
				coverBack : "images/magazine/book/cover-back.jpg",
				coverBackInside : "images/magazine/book/cover-back-inside.jpg",
				scale : ((WIDTH * 0.482) * 0.00154)
				},
            readme : { 
				file : "books/fermat-readme-big.pdf",
				coverFront : "images/magazine/readme/cover-front.png",
				coverFrontInside : "images/magazine/readme/cover-front-inside.png",
				coverBack : "images/magazine/readme/cover-back.png",
				coverBackInside : "images/magazine/readme/cover-back-inside.png",
				scale : ((WIDTH * 0.482) * 0.00155)
				},
            whitepaper : { 
				file : "books/fermat-whitepaper-big.pdf",
				coverFront : "images/magazine/whitepaper/cover-front.jpg",
				coverFrontInside : "images/magazine/whitepaper/cover-front-inside.jpg",
				coverBack : "images/magazine/whitepaper/cover-back.jpg",
				coverBackInside : "images/magazine/whitepaper/cover-back-inside.jpg",
				scale : ((WIDTH * 0.482) * 0.00155)
				}
			};
		
    /**
     * @author Ricardo Delgado
     * Creates and starts all the functions for creating magazine.
     * @param {String} load Name of the magazine to create.
     */
    this.init = function (load){
				
        LOAD = load;

        if (load === 'book'){

            $.ajax({url: 'books/tableContent.html'}).done(function(pageHtml) {
							
                $('#container').append(pageHtml);

                $('#table').hide();

                CONTENT = parseInt($("#table li").size());
            });
        }

        window.PDFJS.getDocument(viewMagazine[load].file).then(function (doc) {

            DOC = doc;

            SCALE = viewMagazine[load].scale;

            addItems();

            addCss();

            configMagazine();

            coverPage(load);
						
            if (load === 'book')
				addTableContent();
						 
            for (var i = 1; i <= DOC.numPages; i++)
				addPage(i); 
						
            pageCompensate();

            backCoverPage(load);

            actionMagazine();

            addCss();

            positionMagazine();

        });

    };
		
    /**
     * @author Ricardo Delgado
     * Encourages and removes the magazine.
     */
    this.remove = function (){

        var flipbook = document.getElementById('flipbook-viewport'),
            positionHide = {x: (Math.random() + 1) * 5000, y: (Math.random() + 1) * 5000};

        animateMagazine(flipbook, positionHide);

        window.helper.hide(flipbook, 1500, false);

        window.Hash.go("").update();

        DOC = null;
		
    };
    
    /**
     * @author Ricardo Delgado
     * Add the special features of the magazine.
     */ 	
    this.actionSpecial = function(){
        
        if (!MAGAZINE.data().zoomIn){

            if (2 < MAGAZINE.turn('page')){ 

                MAGAZINE.turn("page", 2);
                MAGAZINE.turn("previous");
                navigationUrl("");
            }
        }

        zoomHandle(-1);

    };
    
    /**
     * @author Ricardo Delgado
     * Start adding all the settings for the magazine.
     */
    function configMagazine(){

        MAGAZINE.turn({
					
            width : WIDTH,

            height : HEIGHT,

            elevation: 80,

            gradients: true,

            autoCenter: false,

            acceleration: true

        });

    }

    /**
     * @author Ricardo Delgado
     * Creates all the elements (div) needed to magazine.
     */
    function addItems(){

        var page = $('<div />'),
            flipbook = $('<div />', {"class": "flipbook"}).append(page),
            viewport = $('<div />', {"class": "flipbook-viewport", "id": "flipbook-viewport"}).append(flipbook);

        $('#container').append(viewport);

        MAGAZINE = $('.flipbook');

    }

    /**
     * @author Ricardo Delgado
     * It sets the dimensions of the elements.
     */
    function addCss(){

        $('.flipbook').css({
				"width": WIDTH,
				"height": HEIGHT,
				"left": (WIDTH * 0.49) * -1,
				"top": (HEIGHT * 0.40) * -1
				});

        $('.flipbook .hard').css({
				"width": WIDTH * 0.5,
				"height": HEIGHT
				});

        $('.flipbook .own-size').css({
				"width": WIDTH * 0.482,
				"height": HEIGHT - 18
				});

        $('.table-contents li').css({
				"font-size": WIDTH * 0.013,
				"line-height": 1.5,
				"list-style":"none"
				});

        $('.table-contents a').css({
				"padding-right": WIDTH * 0.018
				});

        $('#contents1, #contents2').css({
				"font-size": WIDTH * 0.028
				});
				
		}
		
    /**
     * @author Ricardo Delgado
     * Creates and adds the cover and inside cover of the magazine.
     * @param {String} load Name of the magazine to create.
     */    
    function coverPage(load){
				
        var _class,
            cover,
            backCover;

        _class = "hard";

        cover = $('<div />', { 
					"class": _class,
					"id" : 'p'+ 1,
					"style" : "background-image:url("+viewMagazine[load].coverFront+")"
					});

        MAGAZINE.turn("addPage", cover, 1);

        backCover = $('<div />', { 
						"class": _class,
						"id" : 'p'+ 2,
						"style" : "background-image:url("+viewMagazine[load].coverFrontInside+")"
						});

        MAGAZINE.turn("addPage", backCover, 2);
				
    }
	 
    /**
     * @author Ricardo Delgado
     * Creates and adds the counter-cover and internal cover of the magazine.
     * @param {String} load Name of the magazine to create.
     */  
    function backCoverPage(load){

		var page = MAGAZINE.turn('pages') + 1,
			_class = "hard fixed",
			cover,
			backCover;

		backCover = $('<div />', { 
						"class": _class,
						"id" : 'pn',
						"style" : "background-image:url("+viewMagazine[load].coverBackInside+")"
						});

		MAGAZINE.turn("addPage", backCover, page); 

		page = MAGAZINE.turn('pages') + 1;

		_class = "hard";

		cover = $('<div />', { 
					"class": _class,
					"id" : 'pf',
					"style" : "background-image:url("+viewMagazine[load].coverBack+")"
					});

		MAGAZINE.turn("addPage", cover, page);
	
	}

    /**
     * @author Ricardo Delgado
     * Creates and adds all pages of pdf.
     * @param {Numer} page Number of the page to add.
     */  
    function addPage(page){

        var canvas,
            ctx,
            element,
			_class = "own-size",
            newPage = MAGAZINE.turn('pages') + 1;

        canvas = document.createElement('canvas');
        canvas.width  = WIDTH * 0.482;
        canvas.height = HEIGHT - 18;

        ctx = canvas.getContext("2d");

        renderPage(page, ctx);

        element = $('<div />', { 
                    "class": _class,
                    'id' : 'p'+ newPage
                    }).append(canvas);

        MAGAZINE.turn("addPage", element, newPage);

    }
		
    /**
     * @author Ricardo Delgado
     * Creates and adds an Compensate page magazine.
     */  
    function addPageCompensate(){

        var canvas,
            element,
            _class = "own-size",
            newPage = MAGAZINE.turn('pages') + 1;

        canvas = document.createElement('canvas');
        canvas.width  = WIDTH * 0.482;
        canvas.height = HEIGHT - 18;

        element = $('<div />', { 
				"class": _class,
                'id' : 'p'+ newPage
                }).append(canvas);

        MAGAZINE.turn("addPage", element, newPage);

    }
    
    /**
     * @author Ricardo Delgado
     * Table of contents of the book is added.
     */ 
    function addTableContent(){

        addTable(1);

        if (CONTENT > 24)
            addTable(2);

        $('#table').remove();
		
    }
    
    /**
     * @author Ricardo Delgado
     * The table of contents is added to the book.
     * @param {Numer}  apge Page number reading.
     */ 
    function addTable(page){

        var canvas,
            element,
            div,
            _class = "own-size",
            newPage = MAGAZINE.turn('pages') + 1;

        canvas = document.createElement('canvas');
        canvas.width  = WIDTH * 0.482;
        canvas.height = HEIGHT - 18;
        canvas.style.position = "relative";
        div = document.createElement('div');
        div.width  = WIDTH * 0.482;
        div.height = HEIGHT - 18;
        div.id = "content"+page;
        div.style.position = "absolute";
        div.style.zIndex = 0;
        div.style.top = 0;
        div.style.left = 0;

        element = $('<div />', { 
                        "class": _class,
                        'id' : 'p'+ newPage
                        }).append(canvas);

        element.append(div);

        MAGAZINE.turn("addPage", element, newPage);

        $('#content'+page).append(addContent(page));

    }
    
    /**
     * @author Ricardo Delgado
     * Content is added to the table.
     * @param {Numer}  apge Page number reading.
     */ 
    function addContent(page){

        var i = 1,
            end = 24,
            div = $('<div />', {"class": "table-contents"}),
            title = $('<h1 />', {"id": "contents"+page}).html($('#title').text()),
            ul = $('<ul />');

        if(page === 2){
            i = 25;
            end = 49;
        }

        for (i; i <= end; i++){
            ul.append($('#l-'+i));
        }

        div.append(title);
        div.append(ul);

        return div;

    }
    
    /**
     * @author Ricardo Delgado
     * Page offset is added to the journal.
     */ 
    function pageCompensate(){

        if (LOAD === 'book'){

            if (CONTENT <= 24){

                if (DOC.numPages % 2 === 0)
                    addPageCompensate(); 
            }
            else{

                if (DOC.numPages % 2 !== 0)
                    addPageCompensate();
            }
        }
        else{

            if (DOC.numPages % 2 !== 0)
                addPageCompensate(); 
        }

    }
		
    /**
     * @author Ricardo Delgado
     * Read and add PDF page to canvas.
     * @param {Numer}  num Page number reading.
     * @param {Object} ctx CTX of canvas.
     */  
    function renderPage(num, ctx){

        var viewport,
            renderContext;

        DOC.getPage(num).then(function (page){

            viewport = page.getViewport(SCALE);

            renderContext = {       
                    canvasContext: ctx,
                     viewport: viewport
            };

            page.render(renderContext);

        });

    }
		
    /**
     * @author Ricardo Delgado
     * Add the special features of the magazine.
     */ 
    function actionMagazine(){

        window.Hash.on('^'+LOAD+'/page\/([0-9]*)$', {

            yep: function(path, parts) {

                var factor = 2;

                if (LOAD === 'book'){

                    if (CONTENT > 24){
                        factor = 4;
                    }
                    else{
                        factor = 3;
                    }
                }

                var page = parseInt(parts[1]) + factor;

                if (parts[1]!==undefined) {

                    if (MAGAZINE.turn('is')){

                        if (MAGAZINE.turn("hasPage", page)){ 

                            MAGAZINE.turn('page', page);
                            navigationUrl(parts[1]);
                        }
                    }
                }       
            }
        });
        
        MAGAZINE.bind("turning", function(event, page, view) {

            var magazine = $(this);

            if (page >= 2){
                $('#p2').addClass('fixed');
            }
            else{
                $('#p2').removeClass('fixed');
            }

            if (page < magazine.turn('pages')){
                $('#pn').addClass('fixed');
            }
            else{
                $('#pn').removeClass('fixed');
            }

            if (page >= 4){
                navigationUrl(page - 4);
            }
            else {
                navigationUrl("");
            }
        }); 

        navigationUrl("");

        ConfigZoom();

    }
    
    /**
     * @author Ricardo Delgado
     * The product is controlled by the url.
     * @param {Numer}  num Page number.
     */  		
    function navigationUrl(page){

        if (page === 0)
            page = 1;

        window.Hash.go(LOAD+'/page/'+page).update();

    }
		
    /**
     * @author Ricardo Delgado
     * Believes zoom settings magazine.
     */ 
    function ConfigZoom(){

        var flipbook = document.getElementById("flipbook-viewport");

        if (flipbook.addEventListener) {

            flipbook.addEventListener("mousewheel", MouseWheelHandler, false);

            flipbook.addEventListener("DOMMouseScroll", MouseWheelHandler, false);
        }

        function MouseWheelHandler(e) {

            var _e = window.event || e; 
            var delta = Math.max(-1, Math.min(1, (_e.wheelDelta || -_e.detail)));

            zoomHandle(delta);

            return false;
        }

    }
		
    /**
     * @author Ricardo Delgado
     * Zoom determines the value received.
     */ 
    function zoomHandle(delta) {

        if (MAGAZINE.data().zoomIn){ 
            
            if (delta < 0)
                zoomOut();
        }
        else{
            
            if (delta > 0)
                zoomThis();
        }

    }
		
    /**
     * @author Ricardo Delgado
     * Zooming magazine.
     */ 
    function zoomThis() {

        var element = document.getElementById('flipbook-viewport');
        var positionShow = {x : window.innerWidth * 0.5, y : (window.innerHeight * 0.5) - 60};
        animateMagazine(element, positionShow, 2500);

        MAGAZINE.transform('scale('+1.25+', '+1.25+')');
        MAGAZINE.data().zoomIn = true;
        MAGAZINE.turn('resize');
        MAGAZINE.turn('disable', true);

    }
				
    /**
     * @author Ricardo Delgado
     * Remove the magazine zoom.
     */ 
    function zoomOut() {

        var element = document.getElementById('flipbook-viewport');
        var positionShow = {x : window.innerWidth * 0.5, y : (window.innerHeight * 0.5)};
        animateMagazine(element, positionShow, 2500);

        MAGAZINE.transform('scale('+1+', '+1+')');
        MAGAZINE.data().zoomIn = false;
        MAGAZINE.turn('resize');
        MAGAZINE.turn('disable', false);

    }
		
    /**
     * @author Ricardo Delgado
     * Calculates the position of the magazine for animation.
     */ 
	function positionMagazine(){

        var element = document.getElementById('flipbook-viewport');

        var positionShow = {x : window.innerWidth * 0.5, y : window.innerHeight * 0.5};

        element.style.left = (Math.random() + 1) * 3000 + 'px';
        element.style.top = (Math.random() + 1) * 3000 + 'px';

        setTimeout(function() {
            animateMagazine(element, positionShow);
        }, 1500);
		
    }
		
    /**
     * @author Ricardo Delgado
     * Makes the entry or exit animation magazine.
     * @param {Object} element         elemento.
     * @param {Array}  target          The objetive position.
     * @param {Number} [duration=3000] Duration of the animation.
     */ 
    function animateMagazine (element, target, duration) {

        var _duration = duration || 3000,
            position = {x : element.getBoundingClientRect().left, y : element.getBoundingClientRect().top};

        new TWEEN.Tween(position)
                .to({x : target.x, y : target.y}, _duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .onUpdate(update)
                .start();

        function update() {
                element.style.left = position.x + 'px';
                element.style.top = position.y + 'px';
        }

    }

}
var map = {};

/**
 * @author Miguel Celedon
 * Loads the map (json version)
 * @param {Function} callback Function to call when finished
 */
function loadMap(callback){
    
    $.get("json/config_map.json", {}, function(json) {
        window.map = json;
        callback();
    });
}
function NetworkViewer() {
    
    BaseNetworkViewer.call(this);
    
    this.childNetwork = null;
}

NetworkViewer.prototype = Object.create(BaseNetworkViewer.prototype);
NetworkViewer.prototype.constructor = NetworkViewer;

/**
 * @override
 * Loads the data and configures camera
 * @author Miguel Celedon
 */
NetworkViewer.prototype.load = function() {
    
    BaseNetworkViewer.prototype.load.call(this);
    
    this.configureCamera();
};

/**
 * @override
 * Unloads and undraws everything and closes its children
 * @author Miguel Celedon
 */
NetworkViewer.prototype.unload = function() {
    
    if(this.childNetwork) {
        
        this.close();
    }
    
    BaseNetworkViewer.prototype.unload.call(this);
    
};

/**
 * @override
 * To be executed when a nodes is clicked
 * @author Miguel Celedon
 * @param {object} clickedNode The clicked node
 */
NetworkViewer.prototype.onNodeClick = function(clickedNode) {
    
    if(this.childNetwork === null) {
        
        BaseNetworkViewer.prototype.onNodeClick.call(this, clickedNode);

        this.hideEdges();
        this.hideNodes([clickedNode.userData.id]);
        this.childNetwork = new ClientsViewer(clickedNode);
        
        this.open();
    }
};

/**
 * @override
 * Called when the function needs to show its details
 * @author Miguel Celedon
 */
NetworkViewer.prototype.open = function() {
    
    this.childNetwork.load();
    
};

/**
 * @override
 * Called when needed to hide the details
 * @author Miguel Celedon
 */
NetworkViewer.prototype.close = function() {
    
    if(this.childNetwork !== null) {
        
        this.childNetwork.close();
        this.childNetwork.unload();
        this.childNetwork = null;
    }
};

/**
 * @override
 * Draws the nodes in the network
 * @author Miguel Celedon
 * @param {Array} networkNodes Array of nodes to draw
 */
NetworkViewer.prototype.drawNodes = function(networkNodes) {

    for(var i = 0; i < networkNodes.length; i++) {

        var position = new THREE.Vector3(
            (Math.random() * 2 - 1) * this.NET_RADIOUS,
            (Math.random() * 2 - 1) * this.NET_RADIOUS,
            ((Math.random() * 2 - 1) * this.NET_RADIOUS) - this.NET_RADIOUS);
        
        position = window.viewManager.translateToSection('network', position);

        var sprite = this.createNode(networkNodes[i], position);

        sprite.scale.set(1000, 1000, 1.0);

        window.scene.add(sprite);
    }

    this.createEdges();
};

/**
 * @override
 * Set the camera transition to get closer to the graph
 * @author Miguel Celedon
 */
NetworkViewer.prototype.configureCamera = function() {
    
    var self = this;
    var position = window.viewManager.translateToSection('network', new THREE.Vector3(0,0,0));
    setTimeout(function() {
        window.camera.move(position.x, position.y, self.NET_RADIOUS, 2000);
    }, 5000);

    setTimeout(function() {
        self.setCameraTarget();
    }, 7500);
};

/**
 * @override
 * Resets the network and unload its children
 * @author Miguel Celedon
 */
NetworkViewer.prototype.reset = function() {
    
    BaseNetworkViewer.prototype.reset.call(this);
    
    this.close();
};

/**
 * Closes and unloads the child, if the child is open, closes it
 * @author Miguel Celedon
 * @returns {object} The reference to itself, if there was no children I'll return null
 */
NetworkViewer.prototype.closeChild = function() {
    
    var self = null;
    
    if(this.childNetwork !== null) {
        
        //If the child is closed we need the parent to reset focus
        var parent = this.childNetwork.parentNode;
        
        this.childNetwork = this.childNetwork.closeChild();
        self = this;
        
        //If closed, reset focus
        if(this.childNetwork !== null)
            BaseNetworkViewer.prototype.onNodeClick.call(this, parent);
    }
    
    //Finally
    if(this.childNetwork === null)
    {
        this.reset();
        self = null;
    }
    
    return self;
};
// add all image paths to this array
function preLoad(onLoadAll) {
    
    var finished = false;
    
    var progressBar = {
        max : 0,
        loaded : 0
    };
    
    var updateBar = function() {
        
        var percnt = ((progressBar.loaded * 100) / progressBar.max) >> 0;
        $("#progress-bar").width(percnt + '%');
    };
    
    var loadImage = function (img) {
        
        var e = document.createElement('img');

        e.onload = function () {

            progressBar.loaded++;
            updateBar();

            if (progressBar.loaded >= progressBar.max) {
                // once we get here, we are pretty much done, so redirect to the actual page
                if(!finished) {
                    finished = true;
                    helper.hide('progress-bar', 1000, false);
                    onLoadAll();
                }
            }
        };
        
        e.onerror = e.onload;
        
        // this will trigger your browser loading the image (and caching it)
        e.src = img;
        };
    
    //Preload images
    $.ajax({
        url: "./json/images.json",
        success: function (images) {
            'use strict';

            progressBar.max = images.length;

            var i = 0;

            while (i < images.length) {
                loadImage(images[i]);
                i++;
            }
        }
    });
    
    //Preload fonts
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = '12px Canaro';
    ctx.fillText('.', 0, 0);
}
/**
 * @author Ricardo Delgado
 * Create screenshots of android with your images and functions.
 */
function ScreenshotsAndroid() {

	// Public Variables
    this.objects = {
			mesh : [],
			target : [],
			texture : [],
			title : { mesh : {},
					  texture : {}
					}			
		};
		
    // Private Variables
	var self = this,
		POSITION_X = 231,
		CONTROL = {},
		SCREENSHOTS = {},
		GROUP = {};

    var action = { state : false, mesh : null };

	var onClick = function(target) {
		change(target.userData.id);
	};

    // Public method
    this.setGroup = function(_group, _layer) {

    	if(typeof GROUP[_group] === 'undefined')
        	GROUP[_group] = [];
            
        GROUP[_group].push(_layer);
    };

    this.showButtonScreenshot = function(id){

    	if(typeof SCREENSHOTS[id] !== 'undefined'){

    		buttonsManager.createButtons('showScreenshots', 'View Screenshots', function(){
    			
    			showScreenshotsButton(id);
    		});
    	}	
    };

	/**
	* @author Ricardo Delgado
	* Initialization screenshots.
	*/
	this.init = function () {

        $.get("json/screenshots.json", {}, function(json) {

	        for(var _group in json){

	        	for(var _layer in json[_group]){

	        		for(var _wallet in json[_group][_layer]){

	        			for (var i = 0; i < window.table.length; i++){
	        				
	        				if(window.table[i].type === "Android" && window.table[i].group === _group && window.table[i].layer === _layer && window.table[i].name === _wallet){
	        					
	        					var id = i,
	        						name = json[_group][_layer][_wallet].name,
	        						position = window.tileManager.targets.table[i].position,
	        						show = false,
	        						screenshots = {};
	        						
	        					if(_layer === "Sub App" && GROUP[_group][0] === "Sub App")
	        						show = true;

        						for(var _screen in json[_group][_layer][_wallet].screenshots)
									screenshots[_screen] = json[_group][_layer][_wallet].screenshots[_screen];

								fillScreenshots(id, position, name, show, screenshots);
	        				}
	        			}
	        		}
	        	}
	        }

	        setScreenshot();
    	});
		
	};
    
    	/**
	* @author Ricardo Delgado
	* Wallet hidden from view.
	*/ 
	this.hide = function () {

		var ignore;

		if (action.state) ignore = action.mesh;

		for(var i = 0; i < self.objects.mesh.length; i++) { 

			if (i != ignore)  
				animate(self.objects.mesh[i], self.objects.target[i], false, 800);
		}
	}; 

	/**
	* @author Ricardo Delgado
	* Show wallet sight.
	*/ 
	this.show = function () {

        if (action.state) {

			resetTexture(action.mesh);
		}
		else {
			
			for (var i = 0; i < self.objects.mesh.length; i++) {

				animate(self.objects.mesh[i], self.objects.target[i], true, 1500);
			}
		}
	};
    
    // Private method
    /**
	* @author Ricardo Delgado
	* Screenshots settings show.
	*/ 
    function setScreenshot(){
        
        var cant = 0,
			lost = "";

		for (var id in SCREENSHOTS){

			var name = SCREENSHOTS[id].name,
				position = SCREENSHOTS[id].position,
				show = SCREENSHOTS[id].show;

			CONTROL[name] = {};

			addWallet(id, name);

			addMesh(position, name, show);
            
            addTextureTitle(name);

			lost = name;

			cant++;	
		}

		if (cant < 4){

			var random = Math.random() * 80000,
				_position = {x : random, y : random};
			for (cant; cant <= 4; cant++)
				addMesh(_position , lost, false);
		}

		addTitle();

	}

    /**
	* @author Ricardo Delgado
	* Variable filled SCREENSHOTS.
    * @param {String}  id   Wallet id
    * @param {number}  position   End position of the plane in the x axis.
    * @param {String}   wallet     Wallet group to which it belongs.
    * @param {Array}  screenshots  All routes screenshot.
	*/ 
	function fillScreenshots(id, position, name, show, screenshots){

		SCREENSHOTS[id] = {};
		SCREENSHOTS[id].name = name;
		SCREENSHOTS[id].position = position;
		SCREENSHOTS[id].show = show;		
		SCREENSHOTS[id].screenshots = screenshots;
	}

	/**
	* @author Ricardo Delgado
	* Each drawing screenshots of wallet.
	* @param {String}  wallet   Wallet draw. 
	*/
	function addWallet(id, wallet) {

		var cant = 0,
			total = 4;

		for (var c in SCREENSHOTS[id].screenshots)
			cant++;

		if (cant <= 4)
			total = cant;

		for (var i = 1; i <= total; i++) {

			addTextureWallet(id, wallet, i);
		}
	}

	/**
	* @author Ricardo Delgado
	* Search for a wallet in specific in the variable self.objects.texture.
	* @param {String}  wallet   Group wallet to find.
	* @param {Number}    id     Wallet identifier. 
	*/
	function searchWallet(wallet, id) {

		var i = 0;

		while(self.objects.texture[i].wallet != wallet || self.objects.texture[i].id != id) {

			i = i + 1 ;
		}  

		return self.objects.texture[i].image;
	}

	/**
	* @author Ricardo Delgado
	* The plans necessary for the wallet are added, each level is for a group of wallet.
	* @param {number}  _position    End position of the plane in the x axis.
	* @param {String}    wallet     Wallet group to which it belongs.
	*/   
	function addMesh(_position, wallet, state) {

		var id = self.objects.mesh.length,
			px = Math.random() * 80000 - 40000,
			py = Math.random() * 80000 - 40000,
			pz = 80000 * 2,
			rx = Math.random() * 180,
			ry = Math.random() * 180,
			rz = Math.random() * 180,
			x = _position.x,
			y = 0,
			z = 0,
			_texture = null;

        if (state){ 
            _texture = searchWallet (wallet, 1);
            y = window.tileManager.dimensions.layerPositions[3] + 240;
        }
        else{ 
        	y = _position.y;
            z = pz;
        }
			
		var mesh = new THREE.Mesh(
					new THREE.PlaneBufferGeometry(50, 80),
					new THREE.MeshBasicMaterial( { map:_texture, side: THREE.FrontSide, transparent: true } )
					);

		mesh.material.needsUpdate = true;

		mesh.userData = {
			id : id,
			wallet : wallet,
			onClick : onClick
		};

		mesh.material.opacity = 1;

		mesh.scale.set(4, 4, 4);

		var target = { x : x, y : y, z : z,
					   px : px, py : py, pz : pz,
					   rx : rx, ry : ry, rz : rz };

		mesh.position.set(px, py, pz);
		mesh.rotation.set(rx, ry, rz);

		window.scene.add(mesh);

		self.objects.target.push(target);

		self.objects.mesh.push(mesh);
	}

	/**
	* @author Ricardo Delgado
	* Add the title of the group focused wallet.
	* @param {String}    text    Behalf of the wallet.
	*/ 
	function addTitle() {

		var px = Math.random() * 80000 - 40000,
			py = Math.random() * 80000 - 40000,
			pz = 80000 * 2,
			rx = Math.random() * 180,
			ry = Math.random() * 180,
			rz = Math.random() * 180,
			texture = null;
			
		var mesh = new THREE.Mesh(
					new THREE.PlaneGeometry(70, 15),
					new THREE.MeshBasicMaterial( { map: texture, side: THREE.FrontSide, transparent: true } )
					);

		mesh.material.needsUpdate = true;

		mesh.material.opacity = 1;

		mesh.scale.set(4, 4, 4);

		var target = { px : px, py : py, pz : pz,
					   rx : rx, ry : ry, rz : rz };

		mesh.position.set(px, py, pz);
		mesh.rotation.set(rx, ry, rz);

		window.scene.add(mesh);

		self.objects.title.mesh = {
						mesh : mesh,
						target : target
						};
	}

	/**
	* @author Ricardo Delgado
	* Add the title of the group focused wallet.
	* @param {String}    Wallet    Behalf of the wallet.
	*/ 
	function addTextureTitle(wallet){

		var canvas,
			ctx,
			texture,
			text = wallet;

		canvas = document.createElement('canvas');
		canvas.width  = 600;
		canvas.height = 200;
		var middle = canvas.width / 2;
		ctx = canvas.getContext("2d");
		ctx.textAlign = 'center';
		ctx.font="bold 40px Arial";
		ctx.fillText(text, middle, 100);

		texture = new THREE.Texture(canvas);
		texture.needsUpdate = true;  
		texture.minFilter = THREE.NearestFilter;

		self.objects.title.texture[wallet] = texture;
	}

	/**
	* @author Ricardo Delgado
	* Wallet drawn and added required.
	* @param {String}    wallet    Wallet draw.
	* @param {String}      i       Group identifier wallet.
	*/ 
	function addTextureWallet(_id, wallet, i) {

		var _texture,
			image,
			cant = 0,
			place;

		for (var f in SCREENSHOTS[_id].screenshots)
			cant++;

		place = Math.floor(Math.random()* cant + 1);

		if (CONTROL[wallet]["picture"+place] === undefined){

			CONTROL[wallet]["picture"+place] = place;

			image = new THREE.ImageUtils.loadTexture(SCREENSHOTS[_id].screenshots['Screenshots_'+place]);
			image.needsUpdate = true;  
			image.minFilter = THREE.NearestFilter;

			_texture = { id : i, wallet : wallet, image : image };

			self.objects.texture.push(_texture);

		}
		else{
			
			addTextureWallet(_id, wallet, i);
		}	

	}

	/**
	* @author Ricardo Delgado
	* Load the title of the selected wallet.
	* @param {String}    Wallet    Behalf of the wallet.
	* @param {object}     mesh     Wallet.	
	*/ 
	function showTitle(wallet, mesh) {

		var _mesh = self.objects.title.mesh.mesh,
			target = {};

		target = { x: mesh.position.x, y : mesh.position.y + 240, z : mesh.position.z };

		_mesh.material.map = self.objects.title.texture[wallet]; 
		_mesh.material.needsUpdate = true;

		animate(_mesh, target, true, 2000);
	}

	/**
	* @author Ricardo Delgado
	* Wallet focus and draw the other planes in the same group wallet.
	* @param {Number}    id    Wallet identifier focus.
	*/ 
	
	function change(id) {

		var duration = 2000;
		var focus = parseInt(id);

		if (window.camera.getFocus() === null) {

			action.state = true; action.mesh = id;

			window.tileManager.letAlone();

			window.camera.setFocus(self.objects.mesh[focus], new THREE.Vector4(0, 0, window.TILE_DIMENSION.width - window.TILE_SPACING, 1), duration);
			
			window.headers.hideHeaders(duration);
			
			window.helper.showBackButton();

			positionFocus(id);
		}
	}

	function showScreenshotsButton(_id){

		var wallet = SCREENSHOTS[_id].name,
			position = SCREENSHOTS[_id].position,
			id = 0,
			mesh;

		for(var i = 0; i < self.objects.mesh.length; i++){
			if(self.objects.mesh[i].userData.wallet === wallet){
				id = i;
				mesh = self.objects.mesh[i];
			}
		}

		action.state = true; action.mesh = id;

		tileManager.letAlone();

		target = { x: position.x, y : position.y, z : 0 };

		animate(mesh, target, true, 1000, function(){
	   			window.camera.enable();
	   			window.camera.setFocus(mesh, new THREE.Vector4(0, 0, window.TILE_DIMENSION.width - window.TILE_SPACING, 1), 1000);
	   			positionFocus(id);
			});

	}

	/**
	* @author Ricardo Delgado
	* Screenshots account total has a wallet.
	* @param {String}    Wallet    Wallet counting.
	*/ 
	function countControl(wallet){

		var sum = 0;
		
		for (var i in CONTROL[wallet])
			sum++;

		return sum;
	}

	/**
	* @author Ricardo Delgado
	* Accommodate the wallet.
	* @param {Number}    id    Identifier reference wallet.
	*/ 
	function positionFocus(id) {

		var ignore = id,
			mesh = self.objects.mesh[id],
			wallet = mesh.userData.wallet,
			target = {},
			count = 1,
			_countControl = countControl(wallet),
			x = POSITION_X;

		showTitle(wallet, mesh);
			
		target = { x: mesh.position.x - (x / 2), y : mesh.position.y, z : mesh.position.z };
        
		if (_countControl > 3)
			animate(mesh, target, true, 1000);

		setTimeout( function() { loadTexture(wallet, ignore); }, 500 );

		setTimeout( function() { 

			for(var i = 0; i < 4; i++) { 

				if (count < 4){ 

					if (count < _countControl){

						if ( i != ignore ) { 

							var _mesh = self.objects.mesh[i];

							if(_countControl > 3){ 

								if (x === POSITION_X) {

									x = x * 2;
								}
								else if (x > POSITION_X) { 

									x = (x / 2) * -1;
								}
								else { 

									x = POSITION_X;
								}

							}
							else{

								if (count === 1) {

									x = x;
								}
								else{ 

									x = x * -1;
								}
							}

							count++;

							target = { x: mesh.position.x + x, y : mesh.position.y, z : mesh.position.z };

							animate(_mesh, target, true, 2000);

						}
					} 
				}            
			}
		}, 1500);
	}

	/**
	* @author Ricardo Delgado
	* Texture change of plans regarding the group focused wallet.
	* @param {String}    wallet    Behalf of the wallet.
	* @param {Number}    ignore    Id focused wallet.
	*/ 
	function loadTexture(wallet, ignore) {

		var id = 1,
			_mesh,
			count = 1,
			_countControl = countControl(wallet);

		for(var i = 0; i < 4; i++) { 

			if (count < 4){ 

				if (count < _countControl){

					if (i != ignore) { 

						id = id + 1 ;

						_mesh = self.objects.mesh[i];
						_mesh.material.map = searchWallet ( wallet, id ); 
						_mesh.material.needsUpdate = true;

						count++;
					}
				}
			}
		} 
	}

	/**
	* @author Ricardo Delgado
	* Change texture of the planes to the original state.
	* @param {Number}    ignore    Id focused wallet.
	*/   
	function resetTexture(ignore) {

		var title = self.objects.title.mesh.mesh, 
			_mesh;

		self.hide(); 

		animate(title, self.objects.title.mesh.target, false, 1000, function() {   

			for(var i = 0; i < self.objects.mesh.length; i++) { 

				if (i != ignore) { 

					_mesh = self.objects.mesh[i];
					_mesh.material.map = searchWallet(_mesh.userData.wallet, 1); 
					_mesh.material.needsUpdate = true;
				}
			} 

			action.state = false;

			self.show();  

		});
	}

	/**
	* @author Ricardo Delgado
	* Animation and out of the wallet.
	* @param {object}     mesh     Wallet.
	* @param {Number}    target    Coordinates wallet.
	* @param {Boolean}   state     Status wallet.
	* @param {Number}   duration   Animation length.
	*/ 
	function animate(mesh, target, state, duration, callback){

		var _duration = duration || 2000,
			x,
			y,
			z,
			rx,
			ry,
			rz;

		if (state) {

		   x = target.x;
		   y = target.y;
		   z = target.z;

		   rx = 0;
		   ry = 0;
		   rz = 0;
		} 
		else {

		   x = target.px;
		   y = target.py;
		   z = target.pz;
		   
		   rx = target.rx;
		   ry = target.ry;
		   rz = target.rz; 
		}  

		_duration = Math.random() * _duration + _duration;

		new TWEEN.Tween(mesh.position)
			.to({x : x, y : y, z : z}, _duration)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();

		new TWEEN.Tween(mesh.rotation)
			.to({x: rx, y: ry, z: rz}, _duration + 500)
			.easing(TWEEN.Easing.Exponential.InOut)
			.onComplete(function () {
                    if(callback != null && typeof(callback) === 'function')
                        callback();   
                })
			.start();
   }

}

function SignLayer(){

	var objects = [],
		positions = {
            lastTarget : [],
            target : []
        },
        self = this;

    /**
     * Creates a flow box and when texture is loaded, calls fillBox
     * @param   {String}     src     The texture to load
     * @param   {Function}   fillBox Function to call after load, receives context and image
     * @returns {THREE.Mesh} The created plane with the drawed texture
     * @author Emmanuel Colina
     */

    function createBoxSignLayer(src, fillBox, width, height) {
        
        var canvas = document.createElement('canvas');
        canvas.height = height;
        canvas.width = width;
        var ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000000'; 
        
        var image = document.createElement('img');
        var texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.LinearFilter;
        
        image.onload = function() {
            fillBox(ctx, image);
            texture.needsUpdate = true;
        };
        
        image.src = src;
        
        var mesh = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(width, height),
            new THREE.MeshBasicMaterial({color : 0xFFFFFF, map : texture, transparent : true})
        );
        
        return mesh;
    }

    /**
 	* @author Emmanuel Colina
 	* @param   {x}                  position X    
    * @param   {y}                  position Y
    * @param   {titleSign} [string] sign layer     
 	* function create a Sign Layer
 	*/
	this.createSignLayer = function(x, y, titleSign, _group){

		var mesh;
		var source = "images/sign/sign.png";

        window.screenshotsAndroid.setGroup(_group, titleSign);

		var fillBox = function(ctx, image) {
            
            ctx.drawImage(image, 0, 0);
            
            //sign
            var size = 40;

                ctx.font = 'bold ' + size + 'px Arial';

            window.helper.drawText(titleSign, 50, 80, ctx, 700, size);
        };

        mesh = createBoxSignLayer(source, fillBox, 720, 140);
		mesh = self.setPositionSignLayer(mesh, x , y);
		window.scene.add(mesh);
	};

	/**
 	* @author Emmanuel Colina
 	* @param   {mesh} Mesh object
 	* @param   {x}   position X    
    * @param   {y}   position Y
 	* function set position Layer
 	*/

	this.setPositionSignLayer = function(mesh, x, y){

		var object, object2;

		mesh.position.x = Math.random() * 990000;
        mesh.position.y = Math.random() * 990000;
        mesh.position.z = 80000 * 2;
            
        mesh.position.copy(window.viewManager.translateToSection('table', mesh.position));
		objects.push(mesh);

		object2 = new THREE.Vector3();
		object2.x = mesh.position.x ;
		object2.y = mesh.position.y ;

		positions.lastTarget.push(object2);

		object = new THREE.Vector3();
		object.x = x - 500;
		object.y = y;

		positions.target.push(object);

		return mesh;
	};

	this.transformSignLayer = function(){
		
		var duration = 3000;

		for (var i = 0, l = objects.length; i < l; i++) {
            new TWEEN.Tween(objects[i].position)
            .to({
                x : positions.target[i].x,
                y : positions.target[i].y,
                z : positions.target[i].z
            }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        }
	};

	this.letAloneSignLayer = function(){

		var duration = 3000;
            
        for (var i = 0, l = objects.length; i < l; i++) {
        	new TWEEN.Tween(objects[i].position)
            .to({
                x : positions.lastTarget[i].x,
                y : positions.lastTarget[i].y,
                z : positions.lastTarget[i].z
            }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        }
	};
}

/**
 * Controls how tiles behaves
 */
function TileManager() {

    this.lastTargets = null;
    this.targets = {
        table: [],
        sphere: [],
        helix: [],
        grid: []
    };
    this.dimensions = {};
    this.elementsByGroup = [];

    var jsonTile = {};
    var self = this;
    var groupsQtty;
    var layersQtty;
    var section = [];
    var columnWidth = 0;
    var layerPosition = [];
    var superLayerMaxHeight = 0;
    var superLayerPosition = [];
    
    var onClick = function(target) {
        if(window.actualView === 'table')
            window.onElementClick(target.userData.id);
    };
    
    this.JsonTile = function(callback){

        $.get("json/config_tile.json", {}, function(json) {
            jsonTile = json;
            callback();
        });
    }
    /**
     * Pre-computes the space layout for next draw
     */
    this.preComputeLayout = function () {
        
        var SUPER_LAYER_SEPARATION = 3;

        var section_size = [],
            superLayerHeight = 0,
            isSuperLayer = [],
            i, actualSuperLayerName = '';

        //Initialize
        for (var key in layers) {
            if (key == "size") continue;
            
            var id = layers[key].index;
            
            if(layers[key].super_layer !== actualSuperLayerName) {
                superLayerHeight = 0;
                actualSuperLayerName = layers[key].super_layer;
            }

            if (layers[key].super_layer) {

                section[id] = 0;
                section_size[id] = 0;
                superLayerHeight++;

                if (superLayerMaxHeight < superLayerHeight) superLayerMaxHeight = superLayerHeight;
            }
            else {

                var newLayer = [];

                for (i = 0; i < groupsQtty; i++)
                    newLayer.push(0);

                section_size[id] = newLayer;
                section[id] = newLayer.slice(0); //Use a copy
            }

            isSuperLayer.push(false);
        }

        for (var j = 0; j <= groupsQtty; j++) {

            self.elementsByGroup.push([]);
        }

        //Set sections sizes

        for (i = 0; i < table.length; i++) {

            var r = table[i].layerID;
            var c = table[i].groupID;

            self.elementsByGroup[c].push(i);

            if (layers[table[i].layer].super_layer) {

                section_size[r]++;
                isSuperLayer[r] = layers[table[i].layer].super_layer;
            } else {
                
                section_size[r][c]++;
                if (section_size[r][c] > columnWidth) columnWidth = section_size[r][c];
            }
        }

        //Set row height

        var actualHeight = 0;
        var remainingSpace = superLayerMaxHeight;
        var inSuperLayer = false;
        var actualSuperLayer = -1;
        
        actualSuperLayerName = false;

        for (i = 0; i < layersQtty; i++) {
            
            if(isSuperLayer[i] !== actualSuperLayerName) {
                
                actualHeight += remainingSpace + 1;
                remainingSpace = superLayerMaxHeight;
                
                if(isSuperLayer[i]) {
                    actualSuperLayer++;
                    inSuperLayer = false;
                }
                
                actualSuperLayerName = isSuperLayer[i];
            }
            
            if (isSuperLayer[i]) {

                if (!inSuperLayer) {
                    actualHeight += SUPER_LAYER_SEPARATION;

                    if (superLayerPosition[actualSuperLayer] === undefined) {
                        superLayerPosition[actualSuperLayer] = actualHeight;
                    }
                }

                inSuperLayer = true;
                actualHeight++;
                remainingSpace--;
            } else {

                if (inSuperLayer) {

                    actualHeight += remainingSpace + 1;
                    remainingSpace = superLayerMaxHeight;
                }

                inSuperLayer = false;
                actualHeight++;
            }

            layerPosition[i] = actualHeight;
        }
    };

    // Disabled
    this.otherViews = function () {

        var i, j, l, vector, phi, object;

        // sphere

        vector = new THREE.Vector3();

        var indexes = [];

        for (i = 0; i <= groupsQtty; i++) indexes.push(0);

        for (i = 0; i < window.objects.length; i++) {

            var g = (table[i].groupID !== undefined) ? table[i].groupID : groupsQtty;

            var radious = 300 * (g + 1);

            phi = Math.acos((2 * indexes[g]) / self.elementsByGroup[g].length - 1);
            var theta = Math.sqrt(self.elementsByGroup[g].length * Math.PI) * phi;

            object = new THREE.Object3D();

            object.position.x = radious * Math.cos(theta) * Math.sin(phi);
            object.position.y = radious * Math.sin(theta) * Math.sin(phi);
            object.position.z = radious * Math.cos(phi);

            vector.copy(object.position).multiplyScalar(2);

            object.lookAt(vector);

            this.targets.sphere.push(object);

            indexes[g]++;

        }

        // helix

        vector = new THREE.Vector3();

        var helixSection = [];
        var current = [];
        var last = 0,
            helixPosition = 0;

        for (i = 0; i < layersQtty; i++) {

            var totalInRow = 0;

            for (j = 0; j < groupsQtty; j++) {

                if (typeof (section[i]) == "object")
                    totalInRow += section[i][j];
                else if (j === 0)
                    totalInRow += section[i];
            }

            helixPosition += last;
            helixSection.push(helixPosition);
            last = totalInRow;

            current.push(0);
        }

        for (i = 0, l = window.objects.length; i < l; i++) {

            var row = table[i].layerID;

            var x = helixSection[row] + current[row];
            current[row]++;


            phi = x * 0.175 + Math.PI;

            object = new THREE.Object3D();

            object.position.x = 900 * Math.sin(phi);
            object.position.y = -(x * 8) + 450;
            object.position.z = 900 * Math.cos(phi);

            vector.x = object.position.x * 2;
            vector.y = object.position.y;
            vector.z = object.position.z * 2;

            object.lookAt(vector);

            this.targets.helix.push(object);

        }

        // grid

        var gridLine = [];
        var gridLayers = [];
        var lastLayer = 0;


        for (i = 0; i < layersQtty + 1; i++) {

            //gridLine.push(0);
            var gridLineSub = [];
            var empty = true;

            for (j = 0; j < section.length; j++) {

                if (section[j][i] !== 0) empty = false;

                gridLineSub.push(0);
            }

            if (!empty) lastLayer++;

            gridLayers.push(lastLayer);
            gridLine.push(gridLineSub);
        }

        for (i = 0; i < window.objects.length; i++) {

            var group = table[i].groupID;
            var layer = table[i].layerID;

            object = new THREE.Object3D();

            //By layer
            object.position.x = ((gridLine[layer][0] % 5) * 200) - 450;
            object.position.y = (-(Math.floor(gridLine[layer][0] / 5) % 5) * 200) + 0;
            object.position.z = (-gridLayers[layer]) * 200 + (layersQtty * 50);
            gridLine[layer][0]++;

            this.targets.grid.push(object);

        }

        //
    };

    /**
     * Uses the list to fill all global data
     * @param {Object} list List returned by the server
     */
    /*this.fillTable = function(list) {
        var pluginList = list.plugins,
            i, l, dependency;
        for (i = 0, l = list.superLayers.length; i < l; i++) {
            superLayers[list.superLayers[i].code] = {};
            superLayers[list.superLayers[i].code].name = list.superLayers[i].name;
            superLayers[list.superLayers[i].code].index = list.superLayers[i].index;
            if (list.superLayers[i].dependsOn && list.superLayers[i].dependsOn.length !== 0) {
                dependency = list.superLayers[i].dependsOn.split(' ').join('').split(',');
                superLayers[list.superLayers[i].code].dependsOn = dependency;
            }
        }
        console.dir(superLayers);
        for (i = 0, l = list.layers.length; i < l; i++) {
            layers[list.layers[i].name] = {};
            layers[list.layers[i].name].index = list.layers[i].index;
            layers[list.layers[i].name].super_layer = list.layers[i].super_layer;
        }
        console.dir(layers);
        for (i = 0, l = list.groups.length; i < l; i++) {
            groups[list.groups[i].code] = {};
            groups[list.groups[i].code].index = list.groups[i].index;
            if (list.groups[i].dependsOn && list.groups[i].dependsOn.length !== 0) {
                dependency = list.groups[i].dependsOn.split(' ').join('').split(',');
                groups[list.groups[i].code].dependsOn = dependency;
            }
        }
        console.dir(groups);
        for (i = 0, l = pluginList.length; i < l; i++) {
            var data = pluginList[i];
            var _group = data.group;
            var _layer = data.layer;
            var _name = data.name;
            var layerID = layers[_layer].index;
            layerID = (layerID === undefined) ? layers.size() : layerID;
            var groupID = (_group !== undefined) ? groups[_group].index : undefined;
            groupID = (groupID === undefined) ? groups.size() : groupID;
            var element = {
                group: _group,
                groupID: groupID,
                code: helper.getCode(_name),
                name: _name,
                layer: _layer,
                layerID: layerID,
                type: data.type,
                picture: data.authorPicture,
                author: data.authorName ? data.authorName.trim().toLowerCase() : undefined,
                authorRealName: data.authorRealName ? data.authorRealName.trim() : undefined,
                authorEmail: data.authorEmail ? data.authorEmail.trim() : undefined,
                difficulty: data.difficulty,
                code_level: data.code_level ? data.code_level.trim().toLowerCase() : undefined,
                life_cycle: data.life_cycle
            };
            table.push(element);
        }
        console.dir(table);
        groupsQtty = groups.size();
        layersQtty = layers.size();
    };*/

    this.fillTable = function (list) {
        var _suprlays = list.suprlays,
            _platfrms = list.platfrms,
            _layers = list.layers,
            _comps = list.comps,
            i, l, code, name;

        for (i = 0, l = _suprlays.length; i < l; i++) {
            code = _suprlays[i].code;
            superLayers[code] = {};
            superLayers[code].name = _suprlays[i].name;
            superLayers[code].index = _suprlays[i].order;
            superLayers[code]._id = _suprlays[i]._id;
            superLayers[code].dependsOn = _suprlays[i].deps;
        }

        for (i = 0, l = _platfrms.length; i < l; i++) {
            code = _platfrms[i].code;
            groups[code] = {};
            groups[code].index = _platfrms[i].order;
            groups[code].dependsOn = _platfrms[i].deps;
            groups[code]._id = _platfrms[i]._id;
        }

        for (i = 0, l = _layers.length; i < l; i++) {
            name = helper.capFirstLetter(_layers[i].name);
            layers[name] = {};
            layers[name].super_layer = _layers[i].suprlay;
            layers[name].index = _layers[i].order;
            layers[name]._id = _layers[i]._id;
        }

        var buildElement = function (e) {
            var _comp = _comps[e];

            var _platfrm = getSPL(_comp._platfrm_id, _platfrms);
            var _layer = getSPL(_comp._layer_id, _layers);
            //console.dir(_layer);
            var layerID = _layer.order;
            layerID = (layerID === undefined) ? layers.size() : layerID;

            var groupID = _platfrm ? _platfrm.order : undefined;
            groupID = (groupID === undefined) ? groups.size() : groupID;

            var _author = getBestDev(_comp.devs, "author");
            var _maintainer = getBestDev(_comp.devs, "maintainer");
            
            _layer = helper.capFirstLetter(_layer.name);

            var element = {
                group: _platfrm ? _platfrm.code : undefined,
                groupID: groupID,
                superLayer : layers[_layer].super_layer,
                code: helper.getCode(_comp.name),
                name: helper.capFirstLetter(_comp.name),
                layer: _layer,
                layerID: layerID,
                type: helper.capFirstLetter(_comp.type),
                picture: _author.avatar_url ? _author.avatar_url : undefined,
                author: _author.usrnm ? _author.usrnm : undefined,
                authorRealName: _author.name ? _author.name : undefined,
                authorEmail: _author.email ? _author.email : undefined,
                maintainer : _maintainer.usrnm ? _author.usrnm : undefined,
                maintainerPicture : _maintainer.avatar_url ? _maintainer.avatar_url : undefined,
                maintainerRealName : _maintainer.name ? _maintainer.name : undefined,
                difficulty: _comp.difficulty,
                code_level: _comp.code_level ? _comp.code_level : undefined,
                life_cycle: _comp.life_cycle,
                found: _comp.found
            };
            return element;
        };
        
        for (i = 0, l = _comps.length; i < l; i++) {
            table.push(buildElement(i));
        }

        groupsQtty = groups.size();
        layersQtty = layers.size();
    };

    /**
     * Creates the tile texture
     * @param   {Number} id         ID in the table
     * @param   {String} quality    The quality of the picture as folder in the images dir
     * @param   {Number} tileWidth  Width of the tile
     * @param   {Number} tileHeight Height of the tile
     * @param   {Number} scale      Scale of the pictures, the bigger, the better but heavier
     * @returns {Object} The drawn texture
     */
    this.createTexture = function (id, quality, tileWidth, tileHeight, scale) {

        var state = table[id].code_level,
            difficulty = Math.ceil(table[id].difficulty / 2),
            group = table[id].group || window.layers[table[id].layer].super_layer,
            type = table[id].type,
            picture = table[id].picture,
            base = 'images/tiles/';

        var canvas = document.createElement('canvas');
        canvas.width = tileWidth * scale;
        canvas.height = tileHeight * scale;

        var middle = canvas.width / 2;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = 'center';

        var texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.LinearFilter;

        var pic = {
                src: picture || base + 'buster.png'
            },
            portrait = {
                src: base + 'portrait/' + quality + '/' + state + '.png',
                x: jsonTile.global.portrait.x,
                y: jsonTile.global.portrait.y,
                w: jsonTile.global.portrait.w * tileWidth * scale,
                h: jsonTile.global.portrait.h * tileHeight * scale
            },
            groupIcon = {
                src: base + 'icons/group/' + quality + '/icon_' + group + '.png',
                w: jsonTile.global.groupIcon.w * scale,
                h: jsonTile.global.groupIcon.h * scale
            },
            typeIcon = {
                src: base + 'icons/type/' + quality + '/' + type.toLowerCase() + '_logo.png',
                w: jsonTile.global.typeIcon.w * scale,
                h: jsonTile.global.typeIcon.h * scale
            },
            ring = {
                src: base + 'rings/' + quality + '/' + state + '_diff_' + difficulty + '.png'
            },
            codeText = {
                text: table[id].code,
                font: (jsonTile.global.codeText.font * scale) + "px Arial"
            },
            nameText = {
                text: table[id].name,
                font: (jsonTile.global.nameText.font * scale) + 'px Arial'
            },
            layerText = {
                text: table[id].layer,
                font: (jsonTile.global.layerText.font * scale) + 'px Arial'
            },
            authorText = {
                text: table[id].authorRealName || table[id].author || '',
                font: (jsonTile.global.authorText.font * scale) + 'px Arial'
            },
            picMaintainer = {
                src: table[id].maintainerPicture || base + 'buster.png'
            },
            maintainer = {
                text: 'Maintainer',
                font: (jsonTile.global.maintainer.font * scale) + 'px Arial',
                color: "#FFFFFF"
            },
            nameMaintainer = {
                text: table[id].maintainerRealName || table[id].maintainer || '',
                font: (jsonTile.global.nameMaintainer.font * scale) + 'px Arial',
                color: "#FFFFFF"
            },
            userMaintainer = {
                text: table[id].maintainer || 'No Maintainer yet',
                font: (jsonTile.global.userMaintainer.font * scale) + 'px Arial',
                color: "#E2E2E2"
            };

            pic.x = jsonTile[state].pic.x * scale;
            pic.y = jsonTile[state].pic.y * scale;
            pic.w = jsonTile[state].pic.w * scale;
            pic.h = jsonTile[state].pic.h * scale;

            groupIcon.x = jsonTile[state].groupIcon.x * scale;
            groupIcon.y = jsonTile[state].groupIcon.y * scale;

            typeIcon.x = jsonTile[state].typeIcon.x * scale;
            typeIcon.y = jsonTile[state].typeIcon.y * scale;

            ring.x = jsonTile[state].ring.x * scale;
            ring.y = jsonTile[state].ring.y * scale;
            ring.w = jsonTile[state].ring.w * scale;
            ring.h = jsonTile[state].ring.h * scale;

            codeText.x = middle;
            codeText.y = jsonTile[state].codeText.y * scale;

            nameText.x = middle;
            nameText.y = jsonTile[state].nameText.y * scale;
            nameText.font = (jsonTile[state].nameText.font * scale) + 'px Arial';

            layerText.x = middle;
            layerText.y = jsonTile[state].layerText.y * scale;

            authorText.x = middle;
            authorText.y = jsonTile[state].authorText.y * scale;

            picMaintainer.x = jsonTile[state].picMaintainer.x * scale;
            picMaintainer.y = jsonTile[state].picMaintainer.y * scale;
            picMaintainer.w = jsonTile[state].picMaintainer.w * scale;
            picMaintainer.h = jsonTile[state].picMaintainer.h * scale;

            maintainer.x = jsonTile[state].maintainer.x * scale;
            maintainer.y = jsonTile[state].maintainer.y * scale;

            nameMaintainer.x = jsonTile[state].nameMaintainer.x * scale;
            nameMaintainer.y = jsonTile[state].nameMaintainer.y * scale;

            userMaintainer.x = jsonTile[state].userMaintainer.x * scale;
            userMaintainer.y = jsonTile[state].userMaintainer.y * scale; 

            if(typeof jsonTile[state].layerText.color  !== 'undefined')
                layerText.color = jsonTile[state].layerText.color;

            if(typeof jsonTile[state].nameText.color  !== 'undefined')
                nameText.color = jsonTile[state].nameText.color;

            if(state === "production"){ 
                codeText.x = jsonTile[state].codeText.x * scale;
                layerText.x = jsonTile[state].layerText.x * scale;
                authorText.x = jsonTile[state].authorText.x * scale;

                nameText.x = jsonTile[state].nameText.x * scale;                
                nameText.constraint = jsonTile[state].nameText.constraint * scale;
                nameText.lineHeight = jsonTile[state].nameText.lineHeight * scale;
                nameText.wrap = true;
            }

        if (state == "concept" || state == "production")
            ring.src = base + 'rings/' + quality + '/linear_diff_' + difficulty + '.png';

        if (difficulty === 0)
            ring = {};

        var data = [
            pic,
            picMaintainer,
            portrait,
            groupIcon,
            typeIcon,
            ring,
            codeText,
            nameText,
            layerText,
            authorText,
            maintainer,
            nameMaintainer,
            userMaintainer
        ];

        if ( table[id].found !== true ) {

            var stamp = {
                src: 'images/alt_not_found.png',
                x: 0,
                y: 0,
                w: tileWidth * scale,
                h: tileHeight * scale
            };

            data.push(stamp);

        }

        drawPicture(data, ctx, texture);

        return texture;
    };

    /**
     * Creates a Tile
     * @param   {Number}     i ID of the tile (index in table)
     * @returns {DOMElement} The drawable element that represents the tile
     */
     
    this.createElement = function (id) {

        var mesh,
            element = new THREE.LOD(),
            levels = [
                ['high', 0],
                ['medium', 1000],
                ['small', 1800],
                ['mini', 2300]
            ],
            texture,
            tileWidth = window.TILE_DIMENSION.width - window.TILE_SPACING,
            tileHeight = window.TILE_DIMENSION.height - window.TILE_SPACING,
            scale = 2;

        for (var j = 0, l = levels.length; j < l; j++) {

            if (levels[j][0] === 'high') scale = 2;
            else scale = 1;

            texture = self.createTexture(id, levels[j][0], tileWidth, tileHeight, scale);

            mesh = new THREE.Mesh(
                new THREE.PlaneBufferGeometry(tileWidth, tileHeight),
                new THREE.MeshBasicMaterial({
                    side: THREE.DoubleSide,
                    transparent : true,
                    map : texture
                })
            );
            mesh.userData = {
                id: id,
                onClick : onClick
            };
            mesh.renderOrder = 1;
            element.addLevel(mesh, levels[j][1]);
            element.userData = {
                flying: false
            };
        }

        return element;
    };

    /**
     * Converts the table in another form
     * @param {Array}  goal     Member of ViewManager.targets
     * @param {Number} duration Milliseconds of animation
     */
    this.transform = function (goal, ordered, duration) {

        var i, l, j,
            DELAY = 500;

        duration = duration || 2000;
        ordered = ordered || false;

        //TWEEN.removeAll();

        if (goal) {

            this.lastTargets = goal;

            var animate = function(object, target, delay) { 

                delay = delay || 0;

                 var move = new TWEEN.Tween(object.position)
                            .to({
                                x: target.position.x,
                                y: target.position.y,
                                z: target.position.z
                            }, Math.random() * duration + duration)
                            .easing(TWEEN.Easing.Exponential.InOut)
                            .delay(delay)
                            .onComplete(function() { object.userData.flying = false; });

                var rotation = new TWEEN.Tween(object.rotation)
                                .to({
                                    x: target.rotation.x,
                                    y: target.rotation.y,
                                    z: target.rotation.z
                                }, Math.random() * duration + duration)
                                .delay(delay)
                                .easing(TWEEN.Easing.Exponential.InOut);

                move.onStart(function() { rotation.start(); });

                return move;
            };
            
            if(ordered === true) {

                for(i = 0; i < self.elementsByGroup.length; i++) {

                    var k = (i + self.elementsByGroup.length - 1) % (self.elementsByGroup.length);
                    var delay = i * DELAY;

                    for(j = 0; j < self.elementsByGroup[k].length; j++) {

                        var index = self.elementsByGroup[k][j];

                        var animation = animate(window.objects[index], goal[index], delay);

                        animation.start();
                    }
                }
            }
            else {
                
                for(i = 0; i < window.objects.length; i++) {
                    
                    animate(window.objects[i], goal[i], 0).start();
                    
                }
                
            }

            if(window.actualView === 'table') {
                
                if (goal == this.targets.table) {
                    headers.showHeaders(duration);
                } else {
                    headers.hideHeaders(duration);
                }
            }
        }

        new TWEEN.Tween(this)
            .to({}, duration * 2 + self.elementsByGroup * DELAY)
            .onUpdate(render)
            .start();
        
        setTimeout(window.screenshotsAndroid.show, duration);
    };

    /**
     * Goes back to last target set in last transform
     */
    this.rollBack = function () {
        
        window.changeView(self.lastTargets);
    };

    /**
     * Inits and draws the table, also creates the Dimensions object
     */
    this.drawTable = function () {

        this.preComputeLayout();
        
        var layerCoordinates = [];
        
        var signRow = null,
            signColumn = null;

        for (var i = 0; i < table.length; i++) {

            var object = this.createElement(i);

            object.position.x = Math.random() * 80000 - 40000;
            object.position.y = Math.random() * 80000 - 40000;
            object.position.z = 80000 * 2;
            object.rotation.x = Math.random() * 180;
            object.rotation.y = Math.random() * 180;
            object.rotation.z = Math.random() * 180;
            
            object.position.copy(window.viewManager.translateToSection('table', object.position));
            
            scene.add(object);

            window.objects.push(object);

            //

            object = new THREE.Object3D();

            //Row (Y)
            var row = table[i].layerID;

            if (layers[table[i].layer].super_layer) {

                object.position.x = ((section[row]) * window.TILE_DIMENSION.width) - (columnWidth * groupsQtty * window.TILE_DIMENSION.width / 2);

                section[row]++;

            } else {

                //Column (X)
                var column = table[i].groupID;

                object.position.x = (((column * (columnWidth) + section[row][column]) + column) * window.TILE_DIMENSION.width) - (columnWidth * groupsQtty * window.TILE_DIMENSION.width / 2);

                section[row][column]++;
            }


            object.position.y = -((layerPosition[row]) * window.TILE_DIMENSION.height) + (layersQtty * window.TILE_DIMENSION.height / 2);
            
            if(typeof layerCoordinates[row] === 'undefined')
                layerCoordinates[row] = object.position.y;

            object.position.copy(window.viewManager.translateToSection('table', object.position));
            this.targets.table.push(object);

            if(i === 0 ){ //entra a la primera
                window.signLayer.createSignLayer(object.position.x, object.position.y, table[i].layer, table[i].group);
                signRow = table[i].layerID;
                signColumn = table[i].groupID;
            }

            if(table[i].layerID !== signRow && table[i].groupID === signColumn && layers[table[i].layer].super_layer === false){ // solo cambio de filas
                window.signLayer.createSignLayer(object.position.x, object.position.y, table[i].layer, table[i].group);
                signRow = table[i].layerID;
                signColumn = table[i].groupID;
            }

            else if(signColumn !== table[i].groupID && layers[table[i].layer].super_layer === false){ //cambio de columna
                window.signLayer.createSignLayer(object.position.x, object.position.y, table[i].layer, table[i].group);
                signRow = table[i].layerID;
                signColumn = table[i].groupID;
            }
        }

        this.dimensions = {
            columnWidth: columnWidth,
            superLayerMaxHeight: superLayerMaxHeight,
            groupsQtty: groupsQtty,
            layersQtty: layersQtty,
            superLayerPosition: superLayerPosition,
            layerPositions : layerCoordinates
        };
    };

    /**
     * Takes away all the tiles except the one with the id
     * @param {Array}  [ids]           The IDs to let alone
     * @param {Number} [duration=2000] Duration of the animation
     */
    this.letAlone = function (ids, duration) {

        if (typeof ids === 'undefined') ids = [];
        if (typeof ids === 'number') ids = [ids];

        var i, _duration = duration || 2000,
            distance = camera.getMaxDistance() * 2,
            out = window.viewManager.translateToSection('table', new THREE.Vector3(0, 0, distance));

        //TWEEN.removeAll();

        var target;

        var animate = function (object, target, dur) {

            new TWEEN.Tween(object.position)
                .to({
                    x: target.x,
                    y: target.y,
                    z: target.z
                }, dur)
                .easing(TWEEN.Easing.Exponential.InOut)
                .onComplete(function () {
                    object.userData.flying = false;
                })
                .start();

        };

        for (i = 0; i < window.objects.length; i++) {

            if (ids.indexOf(i) !== -1) {
                target = this.lastTargets[i].position;
            } else {
                target = out;
                window.objects[i].userData.flying = true;
            }

            animate(window.objects[i], target, Math.random() * _duration + _duration);
        }

        new TWEEN.Tween(this)
            .to({}, _duration * 2)
            .onUpdate(render)
            .start();
        
        window.screenshotsAndroid.hide();
        window.signLayer.letAloneSignLayer();
    };

    //Private methods
    /**
     * Draws a picture in canvas
     * @param {Array}  data    The options of the picture
     * @param {Object} ctx     Canvas context
     * @param {Object} texture The texture object to update
     */
    function drawPicture(data, ctx, texture) {

        var image = new Image();
        var actual = data.shift();

        if (actual && actual.src && actual.src != 'undefined') {

            image.onload = function () {

                ctx.drawImage(image, actual.x, actual.y, actual.w, actual.h);
                if (texture)
                    texture.needsUpdate = true;

                if (data.length !== 0) {

                    if (data[0].text)
                        drawText(data, ctx, texture);
                    else
                        drawPicture(data, ctx, texture);
                }
            };

            image.onerror = function () {
                if (data.length !== 0) {
                    if (data[0].text)
                        drawText(data, ctx, texture);
                    else
                        drawPicture(data, ctx, texture);
                }
            };

            image.crossOrigin = "anonymous";
            image.src = actual.src;
        } else {
            if (data.length !== 0) {
                if (data[0].text)
                    drawText(data, ctx, texture);
                else
                    drawPicture(data, ctx, texture);
            }
        }
    }

    /**
     * Draws a texture in canvas
     * @param {Array}  data    Options of the texture
     * @param {Object} ctx     Canvas Context
     * @param {Object} texture Texture to update
     */
    function drawText(data, ctx, texture) {

        var actual = data.shift();

        //TODO: Set Roboto typo

        if (actual.color)
            ctx.fillStyle = actual.color;

        ctx.font = actual.font;

        if (actual.constraint)
            if (actual.wrap)
                helper.drawText(actual.text, actual.x, actual.y, ctx, actual.constraint, actual.lineHeight);
            else
                ctx.fillText(actual.text, actual.x, actual.y, actual.constraint);
        else
            ctx.fillText(actual.text, actual.x, actual.y);

        if (texture)
            texture.needsUpdate = true;

        ctx.fillStyle = "#FFFFFF";

        if (data.length !== 0){ 

          if(data[0].text)
            drawText(data, ctx, texture); 
          else 
            drawPicture(data, ctx, texture);
        }
    }
    
    function getSPL(_id, _SPLArray) {
        if (_id) {
            for (var i = 0, l = _SPLArray.length; i < l; i++) {
                if (_SPLArray[i]._id + '' == _id + '') {
                    return _SPLArray[i];
                }
            }
        } else {
            return null;
        }
    }

    /**
     * Gets the best developer in the given role
     * @param   {Array}  _devs The array of developers
     * @param   {string} role  The role to look for
     * @returns {object} The best developer by the given criteria
     */
    function getBestDev(_devs, role) {
        var dev = {};
        if (_devs) {
            var _dev = {};
            dev.percnt = 0;
            for (var i = 0, l = _devs.length; i < l; i++) {
                _dev = _devs[i];
                
                if((role === 'author' && _dev.role === 'author' && _dev.scope === 'implementation') ||
                   (role === 'maintainer' && _dev.role === 'maintainer')) {
                
                    if (_dev.percnt >= dev.percnt) {
                        
                        dev.percnt = _dev.percnt;
                        dev.usrnm = _dev.dev.usrnm;
                        dev.name = _dev.dev.name;
                        dev.email = _dev.dev.email;
                        dev.avatar_url = _dev.dev.avatar_url;
                    }
                }
            }
        }
        return dev;
    }
}

/**
 * @class Timeline
 *
 * @param {Array}  tasks     An array of numbers containing all task ids
 * @param {Object} [container] Container of the created timeline
 */
function Timeline ( tasks, container ) {
    
    // Constants
    var CONCEPT_COLOR = 'rgba(170,170,170,1)',
        DEVEL_COLOR = 'rgba(234,123,97,1)',
        QA_COLOR = 'rgba(194,194,57,1)';
    
    // Public properties
    this.groups = [];
    this.items = [];
    this.container = container;
    
    var id = 0;
    
    for( var i = 0, tl = tasks.length; i < tl; i++ ) {
        
        var task = table[ tasks[i] ];
        
        if ( task != null && task.life_cycle != null ) {
            
            var schedule = task.life_cycle,
                tile, wrap,
                lastTarget = helper.parseDate( schedule[0].reached ),
                lastReached = lastTarget;
            
            var canvas = document.createElement('canvas');
            var oldCanvas = objects[tasks[i]].children[0].material.map.image;
            canvas.width = oldCanvas.width;
            canvas.height = oldCanvas.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(oldCanvas, 0, 0);
            
            tile = canvas;
            tile.style.position = 'relative';
            tile.style.display = 'inline-block';
            
            this.groups.push ( {
                id : i,
                content : tile
            });
            
            // First status marks the start point, not needed here
            for( var j = 1, sl = schedule.length; j < sl; j++ ) {
                
                var itemColor,
                    end,
                    item;
                    
                switch(schedule[j-1].name) {
                    case "Concept":
                        itemColor = CONCEPT_COLOR; break;
                    case "Development":
                        itemColor = DEVEL_COLOR; break;
                    case "QA":
                        itemColor = QA_COLOR; break;
                }
                
                
                // Planned
                if(schedule[j].target !== '') {
                    
                    end = helper.parseDate( schedule[j].target );
                    
                    item = {
                        id : id++,
                        content : schedule[j-1].name + ' (plan)',
                        start : lastTarget,
                        end : end,
                        group: i,
                        subgroup: 'plan',
                        style: 'background-color:' + itemColor
                    };
                    
                    this.items.push( item );
                    
                    lastTarget = end;
                }
                
                // Real
                if(schedule[j].reached !== '') {
                    
                    end = helper.parseDate( schedule[j].reached );
                    
                    item = {
                        id : id++,
                        content : schedule[j-1].name + ' (real)',
                        start : lastReached,
                        end : end,
                        group: i,
                        subgroup: 'real',
                        style: 'background-color:' + itemColor
                    };
                    
                    this.items.push( item );
                    
                    lastReached = end;
                }
            }
        }
    }
}


/**
 * Hides and destroys the timeline
 * @param {Number} [duration=1000] Duration of fading in milliseconds
 */
Timeline.prototype.hide = function ( duration ) {
    
    var _duration = duration || 1000;
    
    $('#timelineContainer').fadeTo(_duration, 0, function() { $('#timelineContainer').remove(); });
};


/**
 * Shows the timeline in it's given container, if it was null, creates one at the bottom
 * @param {Number} [duration=2000] Duration of fading in milliseconds
 */
Timeline.prototype.show = function ( duration ) {
    
    var _duration = duration || 2000;
    
    if ( this.groups.length !== 0 ) {
        
        if ( this.container == null ) {
            this.container = document.createElement( 'div' );
            this.container.id = 'timelineContainer';
            this.container.style.position = 'absolute';
            this.container.style.left = '0px';
            this.container.style.right = '0px';
            this.container.style.bottom = '0px';
            this.container.style.height = '25%';
            this.container.style.overflowY = 'auto';
            this.container.style.borderStyle = 'ridge';
            this.container.style.opacity = 0;
            $('#container').append(this.container);
        }
        
        var timeline = new vis.Timeline( this.container );
        timeline.setOptions( { 
            editable : false,
            minHeight : '100%',
            stack : false,
            align : 'center'
        } );
        timeline.setGroups( this.groups );
        timeline.setItems( this.items );
        
        $(this.container).fadeTo( _duration, 1 );
    }
};
//global variables
var table = [],
    camera,
    scene = new THREE.Scene(),
    renderer,
    objects = [],
    actualView,
    stats = null,
//Class
    tileManager = new TileManager(),
    helper = new Helper(),
    logo = new Logo(),
    signLayer = new SignLayer(),
    developer = new Developer(),
    browserManager = null,
    screenshotsAndroid = null,
    headers = null,
    flowManager = null,
    viewManager = null,
    magazine = null,
    networkViewer = null,
    buttonsManager = null;
//Global constants
var TILE_DIMENSION = {
    width : 231,
    height : 140
},
    TILE_SPACING = 20;

createScene();

getData();

/**
 * Creates the rendering environment
 */
function createScene(){

    var light = new THREE.AmbientLight(0xFFFFFF);
    scene.add( light );
    
    if(webglAvailable())
        renderer = new THREE.WebGLRenderer({antialias : true, alpha : true}); //Logarithmic depth buffer disabled due to sprite - zbuffer issue
    else
        renderer = new THREE.CanvasRenderer({antialias : true, alpha : true});
        
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.setClearColor(0xFFFFFF);
    document.getElementById('container').appendChild(renderer.domElement);

    camera = new Camera(new THREE.Vector3(0, 0, 90000),
        renderer,
        render);

    logo.startFade();
}

function webglAvailable() {
    try {
        var canvas = document.createElement('canvas');
        
        //Force boolean cast
        return !!( window.WebGLRenderingContext && 
                  (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

/**
 * Starts everything after receiving the json from the server
 */
function init() {

    browserManager = new BrowserManager();
    screenshotsAndroid = new ScreenshotsAndroid();
    magazine = new Magazine();
    flowManager = new FlowManager();
    buttonsManager = new ButtonsManager();

    //View Manager
    viewManager = new ViewManager();

    // table
    tileManager.drawTable();

    // ScreenshotsAndroid
    screenshotsAndroid.init();

    // BrowserManager
    browserManager.init();

    var dimensions = tileManager.dimensions;

    // groups icons
    headers = new Headers(dimensions.columnWidth, dimensions.superLayerMaxHeight, dimensions.groupsQtty,
                          dimensions.layersQtty, dimensions.superLayerPosition);

    // uncomment for testing
    //create_stats();

    $('#backButton').click(function() {
        
        if(viewManager.views[window.actualView])
            viewManager.views[window.actualView].backButton();
 
    });

    $('#legendButton').click(function() {

        var legend = document.getElementById('legend');

        if (legend.style.opacity == 1) $('#legend').fadeTo(1000, 0, function() {
            legend.style.display = 'none';
        });
        else {
            legend.style.display = 'block';
            $(legend).fadeTo(1000, 1);
        }
    });

            
    $('#container').click(onClick);

    //Disabled Menu
    //initMenu();

    setTimeout(function() { initPage(); }, 500);
    
    /*setTimeout(function() {
        var loader = new Loader();
        loader.findThemAll();
    }, 2000);*/

    //TWEEN.removeAll();
}

/**
 * @author Miguel Celedon
 * @lastmodifiedBy Emmanuel Colina
 * @lastmodifiedBy Ricardo Delgado
 * Changes the actual state of the viewer
 * @param {String} name The name of the target state
 */
function goToView ( targetView ) {

    var newCenter = new THREE.Vector3(0, 0, 0);
    var transition = 5000;
    
    newCenter = viewManager.translateToSection(targetView, newCenter);
    camera.moving = true;
    camera.move(newCenter.x, newCenter.y, camera.getMaxDistance(), transition, true);
    camera.lockPan();
    
    setTimeout(function() { camera.moving = false; }, transition);
    
    if(window.map.views[targetView] != null) {
        viewManager.views[targetView].enter();
        
        if(actualView)
            viewManager.views[actualView].exit();
        
        actualView = targetView;
    }
    else {
        goToView(window.map.start);
    }
}

/**
 * @author Ricardo Delgado
 * Load the page url.
 */
function initPage() {
    
	window.Hash.on('^[a-zA-Z]*$', {

		yep: function(path, parts) {

			var view = parts[0];

            if(window.actualView !== undefined && window.actualView !== ""){ 

    			if(view !== undefined && view !== ""){

    				if(window.map.views[view].enabled !== undefined && window.map.views[view].enabled)
    					goToView(view);
    			}

            }
            else{
                goToView(window.location.hash.slice(1));
            }
		}

    });

}

function initMenu() {

    var button = document.getElementById('table');
    button.addEventListener('click', function(event) {

        changeView(tileManager.targets.table);

    }, false);

    button = document.getElementById('sphere');
    button.addEventListener('click', function(event) {

        changeView(tileManager.targets.sphere);

    }, false);

    button = document.getElementById('helix');
    button.addEventListener('click', function(event) {

        changeView(tileManager.targets.helix);

    }, false);

    button = document.getElementById('grid');
    button.addEventListener('click', function(event) {

        changeView(tileManager.targets.grid);

    }, false);
}


function changeView(targets) {

    camera.enable();
    camera.loseFocus();
    
    helper.show('container', 2000);
    
    flowManager.getActualFlow();

    if (targets != null) {
        tileManager.transform(targets, 2000);
    }
}

/**
 * Triggered when the user clicks a tile
 * @param {Number} id The ID (position on table) of the element
 */
function onElementClick(id) {
    
    var focus = parseInt(id);

    if (window.camera.getFocus() == null) {

        window.tileManager.letAlone(focus, 2000);

        window.objects[focus].getObjectForDistance(0).visible = true;

        window.headers.hideHeaders(2000);

        window.camera.setFocus(objects[ focus ], new THREE.Vector4(0, 0, window.TILE_DIMENSION.width - window.TILE_SPACING, 1), 2000);
        
        setTimeout(function() {
            
            window.tileManager.letAlone(focus, 1000);

            window.objects[focus].getObjectForDistance(0).visible = true;

            window.headers.hideHeaders(1000);

            window.camera.setFocus(objects[ focus ], new THREE.Vector4(0, 0, window.TILE_DIMENSION.width - window.TILE_SPACING, 1), 1000);

            window.helper.showBackButton();

            window.buttonsManager.actionButtons(id, function(){
                showDeveloper(id);
            });
            
        }, 3000);
        
        window.camera.disable();   
    }

    function showDeveloper(id) {

        var relatedTasks = [];
        
        var image = table[id].picture;

        var section = 0;
        var center = objects[id].position;
        
        for (var i = 0; i < table.length; i++) {
            
            if (table[i].author == table[id].author) {
                relatedTasks.push(i);
                
                new TWEEN.Tween(objects[i].position)
                .to({x : center.x + (section % 5) * window.TILE_DIMENSION.width, y : center.y - Math.floor(section / 5) * window.TILE_DIMENSION.height, z : 0}, 2000)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();
                
                section += 1;
            }
        }
        
        createSidePanel(id, image, relatedTasks);
        camera.enable();
        camera.move(center.x, center.y, center.z + window.TILE_DIMENSION.width * 5);
    }

    function createSidePanel(id, image, relatedTasks) {

        var sidePanel = document.createElement('div');
        sidePanel.id = 'sidePanel';
        sidePanel.style.position = 'absolute';
        sidePanel.style.top = '0px';
        sidePanel.style.bottom = '25%';
        sidePanel.style.left = '0px';
        sidePanel.style.marginTop = '50px';
        sidePanel.style.width = '35%';
        sidePanel.style.textAlign = 'center';

        var panelImage = document.createElement('img');
        panelImage.id = 'focusImg';
        panelImage.src = image;
        panelImage.style.position = 'relative';
        panelImage.style.width = '50%';
        panelImage.style.opacity = 0;
        sidePanel.appendChild(panelImage);

        var userName = document.createElement('p');
        userName.style.opacity = 0;
        userName.style.position = 'relative';
        userName.style.fontWeight = 'bold';
        userName.textContent = table[id].author;
        sidePanel.appendChild(userName);

        var realName = document.createElement('p');
        realName.style.opacity = 0;
        realName.style.position = 'relative';
        realName.textContent = table[id].authorRealName;
        sidePanel.appendChild(realName);

        var email = document.createElement('p');
        email.style.opacity = 0;
        email.style.position = 'relative';
        email.textContent = table[id].authorEmail;
        sidePanel.appendChild(email);

        if (relatedTasks != null && relatedTasks.length > 0) {
            
            var anyTimeline = false;
            
            var i, l;
            
            for(i = 0, l = relatedTasks.length; i < l; i++) {
                if(table[relatedTasks[i]].life_cycle !== undefined && table[relatedTasks[i]].life_cycle.length > 0) {
                    anyTimeline = true;
                }
            }
            
            if(anyTimeline) {

                var tlButton = document.createElement('button');
                tlButton.className = 'actionButton';
                tlButton.id = 'timelineButton';
                tlButton.style.opacity = 0;
                tlButton.style.position = 'relative';
                tlButton.textContent = 'See Timeline';

                $(tlButton).click(function() {
                    showTimeline(relatedTasks);
                });

                sidePanel.appendChild(tlButton);
            }
        }

        $('#container').append(sidePanel);

        //$(renderer.domElement).fadeTo(1000, 0);

        $(panelImage).fadeTo(1000, 1, function() {
            $(userName).fadeTo(1000, 1, function() {
                $(realName).fadeTo(1000, 1, function() {
                    $(email).fadeTo(1000, 1, function() {

                        if (tlButton != null) $(tlButton).fadeTo(1000, 1);

                    });
                });
            });
        });
    }

    function showTimeline(tasks) {

        helper.hide('sidePanel');
        helper.hide('elementPanel');

        var tlContainer = document.createElement('div');
        tlContainer.id = 'tlContainer';
        tlContainer.style.position = 'absolute';
        tlContainer.style.top = '50px';
        tlContainer.style.bottom = '50px';
        tlContainer.style.left = '50px';
        tlContainer.style.right = '50px';
        tlContainer.style.overflowY = 'auto';
        tlContainer.style.opacity = 0;
        document.body.appendChild(tlContainer);
        
        helper.hide('container', 1000, true);

        $(tlContainer).fadeTo(1000, 1);

        new Timeline(tasks, tlContainer).show();
    }
}

/**
 * Generic event when user clicks in 3D space
 * @param {Object} e Event data
 */
 
function onClick(e) {
    
    var mouse = new THREE.Vector2(0, 0),
        clicked = [];
    
    if ( !camera.dragging ) {
    
        //Obtain normalized click location (-1...1)
        mouse.x = ((e.clientX - renderer.domElement.offsetLeft) / renderer.domElement.width) * 2 - 1;
        mouse.y = - ((e.clientY - renderer.domElement.offsetTop) / renderer.domElement.height) * 2 + 1;
        
        //window.alert("Clicked on (" + mouse.x + ", " + mouse.y + ")");

        clicked = camera.rayCast(mouse, scene.children);

        //If at least one element got clicked, process the first which is NOT a line
        if (clicked && clicked.length > 0) {
            
            for(var i = 0; i < clicked.length; i++) {
                
                if(clicked[i].object.userData.onClick && !(clicked[i].object instanceof THREE.Line)) {
                    
                    clicked[i].object.userData.onClick(clicked[i].object);
                    break;
                }
            }
        }
    }
}

function animate() {

    requestAnimationFrame(animate);

    TWEEN.update();

    camera.update();

    if ( stats ) stats.update();
}

function create_stats(){ 

    stats = new Stats();
    stats.setMode(0);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left    = '0px';
    stats.domElement.style.top   = '0px';
    stats.domElement.style.display  = 'block';
    var contai = document.getElementById("container");
    contai.appendChild(stats.domElement);

    }

function render() {

    //renderer.render( scene, camera );
    camera.render(renderer, scene);
}
/**
 * Responsible for drawing the p2p network
 * @author Miguel Celedon
 */
function ViewManager() {
    
    var SECTION_SIZE = window.MAX_DISTANCE * 1.5;
    
    this.views = {};
    
    var self = this;
    
    /**
     * Convert a vector to the relative coordiantes of a section
     * @author Miguel Celedon
     * @param   {String}        sectionName The name of the section
     * @param   {Object}        vector      The original vector
     * @returns {THREE.Vector3} A new vector with the positions relative to the section center
     */
    this.translateToSection = function(sectionName, vector) {
        
        sectionName = window.map.views[sectionName] || window.map.start;
        var section = sectionName.section || [0, 0];
        var newVector = vector.clone();
        
        if(typeof section !== 'undefined') {
        
            newVector.x = vector.x + section[0] * SECTION_SIZE;
            newVector.y = vector.y + section[1] * SECTION_SIZE;
        }
        
        return newVector;
    };
    
    /**
     * Creates the structure of the transition functions depending of the view
     * @author Miguel Celedon
     * @lastmodifiedBy Emmanuel Colina
     * @lastmodifiedBy Ricardo Delgado
     * @param   {String} view The name of the view to process
     * @returns {Object} An object containing all the possible functions that can be called
     */
    function setTransition(view) {
        
        var transition = 5000;
        var actions = {},
            enter = null, exit = null, reset = null, zoom = null, backButton = null;
        
        if(window.map.views[view].enabled === true) {
        
            switch(view) {

                case 'table':
                    enter = function() {

                        window.browserManager.modifyButtonLegend(1,'block');

                        window.tileManager.transform(window.tileManager.targets.table, true, 3000 + transition);
                        
                        setTimeout(function(){
                            window.signLayer.transformSignLayer();
                         }, 9500);
                        
                        //Special: If coming from home, delay the animation
                        if(window.actualView === 'home')
                            transition = transition + 3000;

                        window.headers.transformTable(transition);

                        window.developer.delete();
                    };
                    
                    backButton = function() {
                        
                        window.changeView(tileManager.targets.table);
            
                        setTimeout(function(){
                            window.signLayer.transformSignLayer();
                        }, 2500);
                    };                    
                    
                    exit = function() {
                        window.tileManager.rollBack();
                    };

                    reset = function() {
                        window.tileManager.rollBack();

                        setTimeout(function(){
                            window.signLayer.transformSignLayer();
                         }, 3000);
                    };

                    break;
                case 'stack':
                    enter = function() {

                        window.headers.transformStack(transition);

                        window.helper.hideBackButton();

                        window.browserManager.modifyButtonLegend(0,'none');
                    };

                    break;
                case 'home':
                    enter = function() {
                        window.logo.stopFade(2000);
                    };

                    break;
                case 'book':
                case 'readme':
                case 'whitepaper':
                    enter = function() {
                        setTimeout(function(){
                            window.magazine.init(view);
                        }, 2000);    
                    };
                    
                    reset = function() {
                        window.magazine.actionSpecial();
                    };

                    exit = function() {
                        window.magazine.remove();
                    };

                    break;
                case 'workflows':
                    enter = function() {
                        window.flowManager.getHeaderFLow();
                        window.headers.transformWorkFlow(transition);
                    };
                    
                    backButton = reset = function() {
                        window.flowManager.showWorkFlow();
                    };

                    exit = function() {
                        window.flowManager.deleteAllWorkFlows();
                    };
                    
                    break;
                case 'network':
                    enter = function() {
                        window.networkViewer = new NetworkViewer();
                        window.networkViewer.load();
                        
                    };
                    
                    exit = function() {
                        window.networkViewer.unload();
                        window.networkViewer = null;
                        
                        window.camera.disableFreeMode();
                        window.camera.freeView = false;
                    };
                    
                    zoom = function() {
                        
                        window.camera.enableFreeMode();
                        window.helper.showBackButton();
                        
                        if(window.networkViewer)
                            window.networkViewer.setCameraTarget();
                    };
                    
                    reset = function() {
                        if(window.networkViewer)
                            window.networkViewer.reset();
                        
                        window.helper.hideBackButton();
                        window.camera.resetPosition();
                    };
                    
                    backButton = function() {
                        
                        if(window.networkViewer && window.networkViewer.closeChild() === null) {
                            reset();
                        }
                    };
                    
                    break;
                case 'developers':
                    enter = function(){
                        window.developer.getDeveloper();

                        setTimeout(function(){
                            window.developer.animateDeveloper();
                        }, 2000);        
                    };
                    
                    backButton = reset = function() {
                        setTimeout(function(){
                            window.developer.animateDeveloper();
                        }, 4000);
                        
                        window.changeView(tileManager.targets.table);
                    };

                    break;
                default:
                    break;
            }
        }
        
        actions = {
            enter : enter || function(){},
            exit : exit || function(){},
            reset : reset || function(){},
            zoom : zoom || function(){},
            backButton : backButton || function(){}
        };
        
        return actions;
    }
    
    /**
     * Create a basic skeleton of the views, with exit, enter and reset functions as empty
     * @author Miguel Celedon
     */
    function initViews() {
        
        for(var view in window.map.views) {
            self.views[view] = setTransition(view);
        }
    }
    
    initViews();
}