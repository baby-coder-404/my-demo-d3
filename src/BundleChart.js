import React, {Component} from "react";

import * as d3 from 'd3';

class BundleChart extends Component {

    constructor(props) {
        super(props);
        this.state = {
            chartStyle : {
                colorin : "#00f"
                , colorout : "#f00"
                , colornone : "#ccc"
                , width : 954
                , radius : 954 / 2
            }
        };

    }

    componentDidMount() {
        this.setState({
            svg : this.chart()
        });
    }

    render() {
        return <div id={"#" + this.props.id}></div>
    }

    async chart() {

        const {chartStyle} = this.state;


        const data = require('./data/data');

        const tree = d3.cluster().size([2 * Math.PI, chartStyle.radius - 100]);

        const line = d3.lineRadial().curve(d3.curveBundle.beta(0.85)).radius(d => d.y).angle(d => d.x);

        const root = tree(this.bilink(d3.hierarchy(data).sort((a, b) => d3.ascending(a.data.name, b.data.name))));

        const svg = d3.select("body")
            .append("div").attr("style", "width: 50%; margin: 0 auto;")
            .append("svg")
            .attr("viewBox", [-chartStyle.width / 2, -chartStyle.width / 2, chartStyle.width, chartStyle.width]);

        const node = svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .selectAll("g")
            .data(root.leaves())
            .join("g")
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
            .append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.x < Math.PI ? 6 : -6)
            .attr("text-anchor", d => d.x < Math.PI ? "start" : "end")
            .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
            .text(d => d.data.name)
            .each(function(d) { d.text = this; })
            .on("mouseover", overed)
            .on("mouseout", outed)
            .call(text => text.append("title").text(d => `${this.id(d)}\n引用${d.outgoing.length} 个项目\n被${d.incoming.length} 个项目引用`));

        const link = svg.append("g")
            .attr("stroke", chartStyle.colornone)
            .attr("fill", "none")
            .selectAll("path")
            .data(root.leaves().flatMap(leaf => leaf.outgoing))
            .join("path")
            .style("mix-blend-mode", "multiply")
            .attr("d", ([i, o]) => line(i.path(o)))
            .each(function(d) { d.path = this; });

        function overed(d) {

            link.style("mix-blend-mode", null);
            d3.select(this).attr("font-weight", "bold");
            d3.selectAll(d.incoming.map(d => d.path)).attr("stroke", chartStyle.colorin).raise();
            d3.selectAll(d.incoming.map(([d]) => d.text)).attr("fill", chartStyle.colorin).attr("font-weight", "bold");
            d3.selectAll(d.outgoing.map(d => d.path)).attr("stroke", chartStyle.colorout).raise();
            d3.selectAll(d.outgoing.map(([, d]) => d.text)).attr("fill", chartStyle.colorout).attr("font-weight", "bold");
        }

        function outed(d) {
            link.style("mix-blend-mode", "multiply");
            d3.select(this).attr("font-weight", null);
            d3.selectAll(d.incoming.map(d => d.path)).attr("stroke", null);
            d3.selectAll(d.incoming.map(([d]) => d.text)).attr("fill", null).attr("font-weight", null);
            d3.selectAll(d.outgoing.map(d => d.path)).attr("stroke", null);
            d3.selectAll(d.outgoing.map(([, d]) => d.text)).attr("fill", null).attr("font-weight", null);
        }

        return svg.node();
    }


    hierarchy(data, delimiter = ".") {
        let root;
        const map = new Map;
        data.forEach(function find(data) {
            const {name} = data;
            if (map.has(name)) {
                return map.get(name);
            }
            const i = name.lastIndexOf(delimiter);
            map.set(name, data);
            if (i >= 0) {
                find({name: name.substring(0, i), children: []}).children.push(data);
                data.name = name.substring(i + 1);
            } else {
                root = data;
            }
            return data;
        });
        return root;
    }

    bilink(root) {

        const map = new Map(root.leaves().map(d => [this.id(d), d]));

        for (const d of root.leaves()) {
            d.incoming = [];
            d.outgoing = d.data.imports.map(i => [d, map.get(i)]);
        }
        for (const d of root.leaves()) {
            for (const o of d.outgoing) {
                o[1].incoming.push(o);
            }
        }
        return root;
    }

    id(node) {
        return `${node.parent ? this.id(node.parent) + "." : ""}${node.data.name}`;
    }


}

export default BundleChart;