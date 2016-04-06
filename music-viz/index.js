let fftSize = 256;

navigator.mediaDevices.getUserMedia( {audio: true} )
  .then((stream) => { 

    /* init web audio stuff */

    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let source = audioCtx.createMediaStreamSource(stream);

    console.log(source);
    console.log(audioCtx);

    let analyser = audioCtx.createAnalyser();
    source.connect(analyser);

    analyser.fftSize = fftSize;
    let bufferLength = analyser.frequencyBinCount;
    console.log(bufferLength);

    let dataArray = new Uint8Array(bufferLength);

    /* init d3 stuff */

    var width = 1400,
        height = 1000;

    var nodes = d3.range(fftSize).map(function() { return {radius: 5}; }),
        root = nodes[0],
        color = d3.scale.category10();

    root.radius = 0;
    root.fixed = true;

    var force = d3.layout.force()
        .gravity(0.03)
        .charge(function(d, i) { return i ? 0 : -500; })
        .nodes(nodes)
        .alpha(1)
        .size([width, height]);

    force.start()

    /* init graph drawing utils */

    function graph(initialNodes, initialRoot, initialColor) {
      // TODO: pass data object
      var _nodes = initialNodes,
          _root = initialRoot,
          _color = initialColor;

      var svg = d3.select("body").append("svg")
          .attr("width", width)
          .attr("height", height);

      this.resizeNodes = function (dataArray) {
        console.log(dataArray);
        // update _nodes.radius
        for (var i = 0; i < dataArray.length; i++) {
          _nodes[i].radius = dataArray[i] / 10 + 5;
        }
        svg.selectAll("circle").attr("r", function(d) { return d.radius });
        return this;
      }

      var collide = function collide(node) {
        console.log("collide");
        var r = node.radius + 16,
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
              l = (l - r) / l * .5;
              node.x -= x *= l;
              node.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
      };

      function draw() {

        svg.selectAll("circle")
          .data(_nodes.slice(1))
          .enter().append("circle")
          .attr("r", function(d) { return d.radius; })
          .style("fill", function(d, i) { return color(i % 3); });

        force.alpha(1);

        force.on("tick", function(e) {
          var q = d3.geom.quadtree(_nodes),
              i = 0,
              n = _nodes.length;

          while (++i < n) q.visit(collide(_nodes[i]));

          svg.selectAll("circle")
              .attr("cx", function(d) { return d.x; })
              .attr("cy", function(d) { return d.y; });
        });

        svg.on("mousemove", function() {
          var p1 = d3.mouse(this);
          root.px = p1[0];
          root.py = p1[1];
          force.resume();
        });
      }
      
      draw();
    }

    var collisionGraph = new graph(nodes,root,color);

    const render = () => {

      drawVisual = requestAnimationFrame(render); // recursive!
      analyser.getByteFrequencyData(dataArray);
      
      collisionGraph.resizeNodes(dataArray);
    }
    render();
  })
  .catch((err) => {console.log(err);});


