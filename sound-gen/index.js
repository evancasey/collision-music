function initStatefulLayout(nodes, nodesWithSynth, rect, svg) {
    var width = rect[2],
        height = rect[3];

    var root = nodesWithSynth[0].node,
        color = d3.scale.linear()
            .domain([1, nodes.length])
            .range([d3.rgb("#007AFF"), d3.rgb("#FFF500")]);

    root.radius = 0;
    root.fixed = true;

    var force = d3.layout.force()
        .gravity(0)   // seems like 'else' in charge is the radius of your mouse -> the radiuse by which the other nodes are repelled by
        .charge(function(d, i) { return i ? 0 : 0; })   // return i ? means if i exists (aka True) return 0, else -2000
        .nodes(nodes)
        .size([width, height]);

    force.start();

    var circle = svg.selectAll("circle")
        .data(nodes.slice(1))
        .enter().append("circle")
        .attr("r", function(d) { return d.radius; })
        .style("fill", function(d, i) { return color(i); });

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

    // Move nodes toward cluster focus.
    function gravity(alpha) {
        return function(d) {
            if ((d.x - d.radius - 2) < rect[0]) d.speedX = Math.abs(d.speedX);
            if ((d.x + d.radius + 2) > rect[2]) d.speedX = -1 * Math.abs(d.speedX);
            if ((d.y - d.radius - 2) < rect[1]) d.speedY = -1 * Math.abs(d.speedY);
            if ((d.y + d.radius + 2) > rect[3]) d.speedY = Math.abs(d.speedY);
             
            d.x = d.x + (d.speedX * alpha);
            d.y = d.y + (-1 * d.speedY * alpha);
        };
    }

    function draw() {
        var drawvisual = requestAnimationFrame(draw);
        for (var j = 0; j < nodes.length; j++) {
            var t = new Date();
            nodes[j].radius = Math.abs(Math.sin(t/200)) * 20 + 6;
        }

        var q = d3.geom.quadtree(extractNodes(nodesWithSynth)),         // constructs quadtree from nodes array -> this speeds up the operations to de carried out on each node
            // quadtree returns the root node of a new quadtree
            i = 0,
            n = nodesWithSynth.length;

        while (++i < n) q.visit(collide(nodesWithSynth[i]));      // visit each node and take 5 arguments: quad, x1,y1,x2,y2

        svg.selectAll("circle")
            .attr("cx", function(d) { 
                return d.x = Math.max(d.radius, Math.min(width - d.radius, d.x)); 
            }) // cx, cy is the position of each node -> set their coordinates to the newly defined coordinates from collide()
            .attr("cy", function(d) { 
                return d.y = Math.max(d.radius, Math.min(height - d.radius, d.y)); 
            })
            .attr("r", function(d) { return d.radius; })      
            .style("fill", "#fcc8c9")
            .style("opacity", 0.9);

        circle.each(gravity(.5))
        // keep balls bouncing
        force.alpha(5);
    };
    draw();
}

var maxSpeed = 5,
    rect = [0, 0, 500, 250];

/* init drum nodes */

var monoNodes = d3.range(3)
    .map(function(j) { 
        return { radius: 8,
                 speedX: (Math.random() - 0.5) * 2 * maxSpeed,
                 speedY: (Math.random() - 0.5) * 2 * maxSpeed,
                 x: rect[0] + (Math.random() * (rect[2] - rect[0])),
                 y: rect[1] + (Math.random() * (rect[3] - rect[1]))
               }
     });

var monoNodesWithSynth = monoNodes.map(function(n) { 
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

    return toNodeWithSynth(n, synth) 
});

var svg = d3.select("#d3canvas").append("svg")     // select body element and create svg element inside
        .attr("width", rect[2])
        .attr("height", rect[3]);
initStatefulLayout(monoNodes, monoNodesWithSynth, rect, svg);

/* init drum nodes */

/*
var synth = new Tone.DrumSynth().toMaster();
synth.triggerAttackRelease("C2", "8n");
*/

var svg1 = d3.select("#d3canvas").append("svg")     // select body element and create svg element inside
        .attr("width", rect[2])
        .attr("height", rect[3]);
initStatefulLayout(drumNodes, drumNodesWithSynth, rect, svg1);

/* Non-stateful convenience functions */

// node -> nodeWithOsc
function toNodeWithSynth(node, synth) {
    var freq = Math.floor(Math.random(0) * 1000);

    return { node: node,
             freq: freq,
             synth: synth,
             isPlaying: false };
}
 
// nodesWithSynth -> nodes
function extractNodes(nodesWithSynth) {
    var nodes = nodesWithSynth.map(function(n) { return n.node });
    return nodes;
}
  
function startSound(nodeWithOsc) {
    if (!nodeWithOsc.isPlaying) {
        nodeWithOsc.isPlaying = true;
        nodeWithOsc.synth.triggerAttack(nodeWithOsc.freq);
        setTimeout(function() {
          nodeWithOsc.synth.triggerRelease();
        }, 10);
    }
}

function stopSound(nodeWithOsc) {
    if (nodeWithOsc.isPlaying) {
        nodeWithOsc.isPlaying = false;
    }
}
