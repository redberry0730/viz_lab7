Promise.all([d3.json("airports.json"), d3.json("world-110m.json")]).then(([data, topoData]) => {
    let visa_type = d3.select("input[name=type]:checked").node().value;
    const width = 500;
    const height = 350;
    const svg = d3.select(".force-chart")
        .append('svg')
        .attr("viewBox", [0,0,width,height]);

    let size = []
    data.nodes.forEach(a => size.push(a.passengers));
    let size_range = d3.extent(size);
    let size_scale = d3.scaleLinear()
        .domain([size_range[0], size_range[1]])
        .range([5, 10])

    const force = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links))
        .force("charge", d3.forceManyBody())
        .force("x", d3.forceX(width/2))
        .force("y", d3.forceY(height/2))
                        
    force.on("end", () => {
        node.attr("cx", d => {
            return d.x;
        });
        node.attr("cy", d => {
            return d.y;
        });
    });

    const features = topojson.feature(topoData, topoData.objects.countries).features;

    const projection = d3.geoMercator()
        .fitExtent([[0,0], [width,height]], topojson.feature(topoData, topoData.objects.countries));

    const path = d3.geoPath()
        .projection(projection);

    const map = svg.selectAll("path")
        .data(features)
        .join("path")
       
    const boundaries = svg.append("path")
        .datum(topojson.mesh(topoData, topoData.objects.countries))
        .attr("d", path)
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr("class", "subunit-boundary")
        .attr("opacity", 0);

    const link = svg.selectAll("line")
        .data(data.links)
        .join("line")
        .style("stroke", "#aaa");

    const node = svg.selectAll("circle")
        .data(data.nodes)
        .join("circle")
        .attr("r", function(d){
            return size_scale(d.passengers)
        })
        .attr("fill", "#7a00cc")
        .attr('opacity', "1")

    force.on("tick", function() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
        node   
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    })

    node.append("title")
        .text(d => d.name);

    const drag = d3
        .drag()
        .filter(event => visa_type === "force")
        .on("start", event => {
            if (!event.active) {
                force.alphaTarget(0.3).restart();
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
        })
        .on("drag", event => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        })
        .on("end", event => {
            if (!event.active) {
                force.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
        });

    node.call(drag);

    d3.selectAll("input[name=type]").on("change", event=> {
        visa_type = event.target.value;
        switchLayout();
    });

    function switchLayout() {
        if (visa_type === "map") {
            force.stop();
            map.attr("d", path);
            node
            .transition().duration(500)
            .attr("cx", function(d) {
                d.x = projection([d.longitude, d.latitude])[0];
                return d.x;
            })
            .attr("cy", function(d) {
                d.y = projection([d.longitude, d.latitude])[1];
                return d.y;});
            link
            .transition().duration(500).attr("x1", function(d) {return d.source.x;})
            .attr("y1", function(d) {return d.source.y;})
            .attr("x2", function(d) {return d.target.x;})
            .attr("y2", function(d) {return d.target.y;});
            map
            .transition().duration(500).attr("opacity", 1);
            boundaries
            .attr("opacity", 1);
        }
        else {
            force
            .alpha(1.0).restart();
            map
            .transition().duration(500).attr("opacity", 0);
            boundaries
            .attr("opacity", 0);
        }
    }
});