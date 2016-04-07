navigator.mediaDevices.getUserMedia( {audio: true})
    .then((stream) => {
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        var osc = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();
        osc.connect(gainNode);

        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = 0;

        var width = 1024,
            height = 700,
            numNodes = 50;

        // node -> nodeWithOsc
        function toNodeWithOsc(node) {
          var osc = audioCtx.createOscillator();
          var gainNode = audioCtx.createGain();
          osc.connect(gainNode);

          gainNode.connect(audioCtx.destination);
          gainNode.gain.value = 0;
          osc.type = 'sine';
          osc.start(0);

          var freq = Math.floor(Math.random(0) * 1000);
          var synth = new Tone.MonoSynth({
            "portamento" : 0.01,
            "oscillator" : {
              "type" : "square"
            },
            "envelope" : {
              "attack" : 0.005,
              "decay" : 0.2,
              "sustain" : 0.4,
              "release" : 1.4,
            },
            "filterEnvelope" : {
              "attack" : 0.005,
              "decay" : 0.1,
              "sustain" : 0.05,
              "release" : 0.8,
              "baseFrequency" : 300,
              "octaves" : 4
            }
          }).toMaster();


          return { node: node,
                   gainNode: gainNode,
                   osc: osc,
                   freq: freq,
                   synth: synth,
                   isPlaying: false };
        }
         
        // nodesWithOsc -> nodes
        function extractNodes(nodesWithOsc) {
          var nodes = nodesWithOsc.map(function(n) { return n.node });
          return nodes;
        }
          

        var nodes = d3.range(numNodes)
            .map(function(j) { return {radius: 8} });

        var nodesWithOsc = nodes.map(function(n) { return toNodeWithOsc(n) });

        var root = nodesWithOsc[0].node,
            color = d3.scale.linear()
                .domain([1, numNodes])
                .range([d3.rgb("#007AFF"), d3.rgb("#FFF500")]);

        root.radius = 0;
        root.fixed = true;

        var force = d3.layout.force()
                .gravity(0.0)   // seems like 'else' in charge is the radius of your mouse -> the radiuse by which the other nodes are repelled by
                .charge(function(d, i) { return i ? 0 : -200; })   // return i ? means if i exists (aka True) return 0, else -2000
                //.charge(0)
                .nodes(nodes)
                .size([width, height]);

        force.start();

        var svg = d3.select("#d3canvas").append("svg")     // select body element and create svg element inside
                .attr("width", width)
                .attr("height", height);

        svg.selectAll("circle")
            .data(nodes.slice(1))
            .enter().append("circle")
            .attr("r", function(d) { return d.radius; })
            .style("fill", function(d, i) { return color(i); });


        var synth = new Tone.DrumSynth().toMaster();

        function draw() {
            var drawvisual = requestAnimationFrame(draw);
            for (var j = 0; j < numNodes; j++) {
              var t = new Date();
              nodes[j].radius = Math.abs(Math.sin(t/200)) * 20 + 6;
            }

            var q = d3.geom.quadtree(extractNodes(nodesWithOsc)),         // constructs quadtree from nodes array -> this speeds up the operations to de carried out on each node
                // quadtree returns the root node of a new quadtree
                i = 0,
                n = nodesWithOsc.length;

            while (++i < n) q.visit(collide(nodesWithOsc[i]));      // visit each node and take 5 arguments: quad, x1,y1,x2,y2

            svg.selectAll("circle")
                .attr("cx", function(d) { return d.x = Math.max(d.radius, Math.min(width - d.radius, d.x)); }) // cx, cy is the position of each node -> set their coordinates to the newly defined coordinates from collide()
                .attr("cy", function(d) { return d.y = Math.max(d.radius, Math.min(height - d.radius, d.y)); })
                .attr("r", function(d) { return d.radius; })      
                .style("fill", "#fcc8c9")
                .style("opacity", 0.9);

            // keep balls bouncing
            force.alpha(10);
        };
        draw();

        osc.start();

        svg.on("mousemove", function() {
            var p1 = d3.mouse(this);    // p1 is the mouse position -> p1[0] = x, p1[1] is y cordinate
            root.px = p1[0];            // change root position to equal your mouse position -> root is an invisible root (radius=0) with + charge
            root.py = p1[1];
            force.resume();
        });

        // collide takes a node -> returns a function
        // the returned function takes
        function collide(nodeWithOsc) {
            var node = nodeWithOsc.node,
                r = node.radius + 16,
                nx1 = node.x - r,
                nx2 = node.x + r,
                ny1 = node.y - r,
                ny2 = node.y + r;
            return function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== node)) {
                    var x = node.x - quad.point.x,
                        y = node.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = node.radius + quad.point.radius;
                    if (l < r) {
                        startSound(nodeWithOsc);
                        l = (l - r) / l * 10;
                        node.x -= x *= l;
                        node.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    } else {
                        stopSound(nodeWithOsc);
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            };
        };

        function startSound(nodeWithOsc) {
          console.log(nodeWithOsc.isPlaying);
          if (!nodeWithOsc.isPlaying) {
            console.log('start: ' + nodeWithOsc.osc.frequency.value);
            
            nodeWithOsc.isPlaying = true;
             // nodeWithOsc.gainNode.gain.value = 0.1;
            // nodeWithOsc.osc.frequency.value = 500;
           
              //synth.triggerAttackRelease("C4", "8n");
            nodeWithOsc.synth.triggerAttack(nodeWithOsc.freq);

            clearTimeout();
            
          }
        }


        function stopSound(nodeWithOsc) {
          if (nodeWithOsc.isPlaying) {
 //           setTimeout(function() {
              console.log('stop: ' + nodeWithOsc.osc.frequency.value);
 //             nodeWithOsc.gainNode.gain.value = 0;
//              nodeWithOsc.osc.frequency.value = 0;
            nodeWithOsc.synth.triggerAttack(0);
              nodeWithOsc.isPlaying = false;
//            }, 10);
          }

  //        clearTimeout();
        }


     })
    .catch((err) => {console.log(err);});

