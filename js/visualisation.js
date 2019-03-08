var width = 1280;
var height = 750;

var current_key = "Total";

var renewables = ["Biomass", "Geothermal", "Hydro", "Nuclear", "Solar", "Wave and Tidal", "Wind"]

//Create the map
var map = d3.select("div#map").append("svg")
.attr("width", width)
.attr("height", height);
var scale = 7*(width-1)/2/Math.PI;
var scale = 200
var projection = d3.geoMercator().translate([600,500]).scale(scale);
var path = d3.geoPath().projection(projection);

//Ready the dataset into a Jsonic format
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
        .await(main);

//Get Additional data for a country        
function getCountryData(country_code){
    var url = "https://restcountries.eu/rest/v2/alpha/"+country_code
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, false ); // false for synchronous request
    xmlHttp.send( null );
    return JSON.parse(xmlHttp.responseText);
}

//Main function
function main(error, dataset, world_map) {
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

    updateMap();
    d3.select("#radio_button form").on("change", updateMap);
    d3.select("#drop_down_select").on("change", updateMap);

    //Not used in final
    function normalise_value(val, max, min) { return (val - min) / (max - min); }


    function updateMap() {
        all_countries = [];

        var column_name = "country_code";

        var total_type = d3.select('input[name="radiob"]:checked').node().value;
        if(total_type=="0"){
           current_key = "Total Plants";
        }
        if(total_type=="1"){
            current_key = "Capacity (MW)"
        }
        if (total_type=="2"){
            current_key = "Generation (GWH)"
        }

        var fuel_filter =  d3.select('select[name="drop_down"]').node().value;

        //Calculates totals for each country
        //All Fuel Types
        if(fuel_filter =="0"){
            dataset.forEach(function(element) {
                var bin_name = element[column_name];
                if(all_countries[bin_name]){
                    if(total_type=="0"){
                        all_countries[bin_name] = all_countries[bin_name]+1;
                    }
                    if(total_type=="1"){
                        all_countries[bin_name] = all_countries[bin_name]+parseInt(element["capacity"]);
                    }
                    if (total_type=="2"){
                        all_countries[bin_name] = all_countries[bin_name]+parseInt(element["generation"]);
                    }
                }else{
                    all_countries[bin_name] = 1;
                };   
            });
        }
        //Renewables only
        if(fuel_filter=="1"){
            dataset.forEach(function(element) {
                var bin_name = element[column_name];
                if(renewables.includes(element["fuel_type"])){
                    if(all_countries[bin_name]){
                        if(total_type=="0"){
                            all_countries[bin_name] = all_countries[bin_name]+1;
                        }
                        if(total_type=="1"){
                            all_countries[bin_name] = all_countries[bin_name]+parseInt(element["capacity"]);
                        }
                        if (total_type=="2"){
                            all_countries[bin_name] = all_countries[bin_name]+parseInt(element["generation"]);
                        }
                    }else{
                        all_countries[bin_name] = 1;
                    }; 
                }  
            });
        }
        //Non-Renewables only
        if(fuel_filter=="2"){
            dataset.forEach(function(element) {
                var bin_name = element[column_name];
                if(!renewables.includes(element["fuel_type"])){
                    if(all_countries[bin_name]){
                        if(total_type=="0"){
                            all_countries[bin_name] = all_countries[bin_name]+1;
                        }
                        if(total_type=="1"){
                            all_countries[bin_name] = all_countries[bin_name]+parseInt(element["capacity"]);
                        }
                        if (total_type=="2"){
                            all_countries[bin_name] = all_countries[bin_name]+parseInt(element["generation"]);
                        }
                    }else{
                        all_countries[bin_name] = 1;
                    }; 
                }  
            });
        }

        //Convert to per capita here if needed
        // if (isPerCapita == 'true'){
        //     for(var k in all_countries){
        //         all_countries[k] = all_countries[k] / getCountryData(k);
        //     }
        // }

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
        var legend = map.append("g")
            .attr("class", "key")
            .attr("transform", "translate(300,700)");

        legend.selectAll("rect")
            .data(color.range().map(function(d) {
                d = color.invertExtent(d);
                if (d[0] == null) d[0] = x.domain()[0];
                if (d[1] == null) d[1] = x.domain()[1];
                return d;
            }))
            .enter().append("rect")
            .attr("height", 15)
            .attr("x", function(d) { return x(d[0]); })
            .attr("width", function(d) { return x(d[1]) - x(d[0]); })
            .attr("fill", function(d) { return color(d[0]); });

        legend.append("text")
            .attr("class", "caption")
            .attr("x", x.range()[0])
            .attr("y", -6)
            .attr("fill", "#fff")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(current_key);

        legend.call(d3.axisBottom(x)
            .tickSize(20)
            .tickFormat(function(x, i) { return x; })
            .tickValues(color.domain()))
            .select(".domain")
            .remove();
    }
}   

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updateSelected(el, data){
    if(d3.select(el).classed("active")){
        d3.select(el).classed("active", false);
        d3.select("#map_tooltip").classed("active",false);
        return;
    }

    map.selectAll("path.active").classed("active", false);
    d3.select(el).classed("active", true);

    //Pop-up Tooltip text
    var msg = "<h4>" + data.properties.name + "</h4>";
    if (data.visVal) { 
        var population = numberWithCommas(getCountryData(data.properties.iso_a3)['population']);
        var flag = "<img src=\""+getCountryData(data.properties.iso_a3)['flag']+"\" width=\"100%\"></img>";
        msg += "<br/>"+ current_key + ": "+ numberWithCommas(data.visVal) + "<br/>" + "Population: "+ population + flag; 
    }
    else{
        var population = numberWithCommas(getCountryData(data.properties.iso_a3)['population']);
        var flag = "<img src=\""+getCountryData(data.properties.iso_a3)['flag']+"\" width=\"100%\"></img>";
        msg += "<br/>"+"<i>No Data</i>" + "<br/>" + "Population: "+ population + flag; 
    }

    d3.select("#map_tooltip").html(msg)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY) + "px"); 

    d3.select("#map_tooltip").classed("active",true);
}