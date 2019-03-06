var width = 1280;
var height = 720;

//create a svg with the width and height variables 
var map = d3.select("div#map").append("svg")
.attr("width", width)
.attr("height", height);

//add scale for the map
var scale = 7*(width-1)/2/Math.PI;
var scale = 200

//set a projection so that 3D coordinates can be placed on a 2D map
var projection = d3.geoMercator().translate([600,500]).scale(scale);

//create a path to add the features in the map file to
var path = d3.geoPath().projection(projection);

function restructure_dataset(data, i) {
    return {
        id: i,
        country_code: data["country"],
        country_name: data["country_long"],
        name: data["name"],
        capacity: data["capacity_mw"],
        latitude: data["latitude"],
        longitude: data["longitude"],
        fuel_type: data["fuel1"],
        commission: data["commissioning_year"],
        source: data["source"],
        generation: data["estimated_generation_gwh"]
    };
}     

d3.queue().defer(d3.csv, "fixed_dataset.csv", restructure_dataset) 
        .defer(d3.json, "custom.geo.json")
        .await(analyze);

function analyze(error, dataset, world_map) {
        if (error){
            console.log(error);
            return;
        }

    map.selectAll("path")
        .data(world_map.features)
        .enter()
        .append("path")
        .attr("d", path)
        .classed("country", true)
        .on("click", function(d) {  
        updateSelected(this, d);
    });

    updateChoroplethColours();
    d3.select("#radio_button form").on("change", updateChoroplethColours);

    function normalise_value(val, max, min) { return (val - min) / (max - min); }

    function updateChoroplethColours() {
        
        all_countries = [];

        //var column_name = d3.select('input[name="radiob"]:checked').node().value;
        var column_name = "country_code";

        //Calculates totals for each country, can add actual generation/capacity instead of 1
        dataset.forEach(function(element) {
            var bin_name = element[column_name];
            if(all_countries[bin_name]){
                all_countries[bin_name] = all_countries[bin_name]+1;
                //all_countries[bin_name] = all_countries[bin_name]+parseInt(element["capacity"]);
                //all_countries[bin_name] = all_countries[bin_name]+parseInt(element["generation"]);
            }else{
                all_countries[bin_name] = 1;
            };   
        });

        //Convert to per capita here if needed
        var isPerCapita = d3.select('input[name="radiob"]:checked').node().value;
        console.log(isPerCapita);

        if (isPerCapita == 'true'){
            for(var k in all_countries){
                console.log(k + " " +all_countries[k]);
            }
        }

        countries = Object.keys(all_countries);
        var max_data = d3.max(countries, function(d){return all_countries[d];})


        var color = d3.scaleQuantize()
            .domain([0, max_data])
            .range(d3.schemeOranges[9]);

        // var color = d3.scaleSequential(d3.interpolateOranges)
        //     .domain([0, max_data]);

        map.selectAll("path")
            .style("fill", function(d) {

            var val = all_countries[d.properties.iso_a3];
            d.visVal = val;
            if(val){
                return color(val);
            }
        });
        
        //Legend 
        var x = d3.scaleLinear()
            .domain([0,max_data])
            .rangeRound([600, 860]);

        map.selectAll("g.key").remove();
        var g = map.append("g")
            .attr("class", "key")
            .attr("transform", "translate(0,40)");

        g.selectAll("rect")
            .data(color.range().map(function(d) {
                d = color.invertExtent(d);
                if (d[0] == null) d[0] = x.domain()[0];
                if (d[1] == null) d[1] = x.domain()[1];
                return d;
            }))
            .enter().append("rect")
            .attr("height", 8)
            .attr("x", function(d) { return x(d[0]); })
            .attr("width", function(d) { return x(d[1]) - x(d[0]); })
            .attr("fill", function(d) { return color(d[0]); });

        g.append("text")
            .attr("class", "caption")
            .attr("x", x.range()[0])
            .attr("y", -6)
            .attr("fill", "#000")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(column_name);

        g.call(d3.axisBottom(x)
            .tickSize(13)
            .tickFormat(function(x, i) { return x; })
            .tickValues(color.domain()))
            .select(".domain")
            .remove();
    }
}   

function updateSelected(el, data)
{
// we've clicked on the currently active country
// deactivate it and hide the tooltip
if(d3.select(el).classed("active")){
    d3.select(el).classed("active", false);
    d3.select("#map_tooltip").classed("active",false);
    return;
}

// make sure no country is active
map.selectAll("path.active").classed("active", false);

// make the country that was clicked on active
d3.select(el).classed("active", true);

// write tooltip message and move it into position
var msg = "<b>" + data.properties.name + "</b>";
if (data.visVal) { msg += "<br/>"+data.visVal; }
d3.select("#map_tooltip").html(msg)
    .style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY - 28) + "px"); 

// make sure tooltip is visible
d3.select("#map_tooltip").classed("active",true);
}