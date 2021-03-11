// if the data you are going to import is small, then you can import it using es6 import
// (I like to use use screaming snake case for imported json)
// import MY_DATA from './app/data/example.json'

import {myExampleUtil} from './utils';
import { csv } from 'd3-fetch';
import { scaleLinear, scaleTime, scaleOrdinal } from 'd3-scale';
import { extent } from 'd3-array';
import { area, line } from 'd3-shape';
import {nest} from 'd3-collection'
import { select } from 'd3-selection';
import { axisBottom, axisLeft } from 'd3-axis';
import {schemeTableau10} from 'd3-scale-chromatic';
import "intersection-observer";
import scrollama from "scrollama";
import './main.css';
import { } from 'd3';
import {annotation, annotationCalloutCircle} from 'd3-svg-annotation'


const height = 650;
const width = 950;
const margin = { left: 200, top: 50, bottom: 50, right: 50 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;
let start = 2002
let end = 2017

let select_countries = []
function numberToDate(date){
  return new Date(date, 6,6);
}

function unique_date(data, key) {
  return Array.from(data.reduce((acc, row) => acc.add(numberToDate(row[key])), new Set()));
}

function unique_countries(data){
  return Array.from(data.reduce((acc, row) => acc.add(row['Country']), new Set()))
}

csv('./data/pay.csv')
  .then(x => x.filter(({ Year }) => Number(Year) >= start && Number(Year) <= end))
  .then(data => {
    const years = unique_date(data, 'Year')

    select('p#value-range').text('Selected Years: 2002 - 2017')
    
    var sliderTime = d3
      .sliderBottom()
      .min(d3.min(years))
      .max(d3.max(years))
      .step(1000 * 60 * 60 * 24 * 365)
      .width(600)
      .tickFormat(d3.timeFormat('%Y'))
      .tickValues(years)
      .fill('#2E5668')
      .default([d3.min(years), d3.max(years)])
      .on('onchange', val => {
        start = parseInt(d3.timeFormat('%Y')(val[0]))
        end = parseInt(d3.timeFormat('%Y')(val[1]))
        select('p#value-range').text('Selected Years: ' + val.map(d3.timeFormat('%Y')).join('-'))
        select('#visual1 .container').remove()
        renderVisualOne(data, start, end, select_countries)
      });

    var gTime = select('div#slider-range')
      .append('svg')
      .attr('width', 900)
      .attr('height', 100)
      .append('g')
      .attr('transform', 'translate(30,30)');
  
    gTime.call(sliderTime);

    const inputList = unique_countries(data);

    select('#countries')
      .selectAll('input')
      .data(inputList.filter(function(d){
        if (d != 'US'){
          return d;
        }
      }))
      .enter().append('li')
      .append("label")
      .text(function(d) { return d; })
      .append("input")
      .attr("type", "checkbox")
      .on('click', function(d,i){
        if (this.checked){
          select_countries.push(i)
          select('#visual1 .container').remove()
          renderVisualOne(data, start, end, select_countries)
        } else{
          const index = select_countries.indexOf(i)
          select_countries.splice(index,1)
          select('#visual1 .container').remove()
          renderVisualOne(data, start, end, select_countries)

        }
      });
      

    
    renderVisualOne(data, start, end, select_countries);

    function renderVisualOne(data, start, end, select_countries){
      data = data.filter(({ Year }) => Number(Year) >= start && Number(Year) <= end)
      const yDomain = extent(data, d => parseInt(d['rank year']))
      const xScale = scaleTime()
        .domain([ numberToDate(start-1), numberToDate(end)])
        .range([0, plotWidth]); 
  
      const yScale = scaleLinear()
        .domain([1, yDomain[1]+1])
        .range([0, plotHeight]);
  
      const lineScale = line()
        .x(d => xScale(new Date(d.Year)))
        .y(d => yScale(parseInt(d['rank year'])))
  
      var title = document.getElementById('title1')
      title.innerHTML =  `Ranking Countries's Gender Wage Gap Performance from ${start} to ${end}`
      var subtitle = document.getElementById('subtitle1')

      if (select_countries.length === 0){
        subtitle.innerHTML = 'Comparing the US with 18 other developed countries'
      } else{
        subtitle.innerHTML = `Comparing the US with ${select_countries.join(', ')}`
      }
     

      let colorCountry = select_countries.slice()
      colorCountry.unshift('US')
      const myColor = scaleOrdinal()
        .domain(colorCountry)
        .range(['#7DB3CD', '#751F36', '#C79C5F'].concat(schemeTableau10.slice(1,11)));
  
      var sumstat = nest() // nest function allows to group the calculation per level of a factor
        .key(function(d) { return d.Country;})
        .entries(data);
  
      var res = sumstat.map(function(d){ return d.key }) 

      const svg = select('#visual1')
        .append('svg')
        .attr('class', 'container')
        .attr('height', height)
        .attr('width', width+100)
        .append('g')
        .attr('transform', `translate(${margin.left}, 0)`);
      
      svg.append('g')
      .attr('class', 'x-axis')
      .call(axisBottom(xScale)
      .ticks((end-start)>10 ? (end-start)/2 : (end-start+1)))
      .attr('transform', `translate(0, ${plotHeight + margin.top})`);

  
      svg.append('g')
        .attr('class', 'y-axis')
        .call(
          axisLeft(yScale)
          .tickValues([]));

      svg
          .append('text')
          .attr('class', 'y-axis-label')
          .attr("transform", `translate(0, 15)`)
          .style("text-anchor", "middle")
          .style('font-size', '12px')
          .text('Country Rank (Highest to Lowest)');
  
      svg.selectAll('.line')  
        .data(sumstat)
        .join('path')
        .attr('class', 'line')
        .attr('id', function(d){
          //console.log('id', d)
          if (d.key === 'US'){
            return 'US-line'
          } else if (select_countries.includes(d.key)){
            return 'selected-line'
          } else{
            return 'not-selected-line'
          }
        })
        .attr("d", d=> lineScale(d.values))
        .attr('stroke', function(d){
          return colorCountry.includes(d.key)? myColor(d.key) : '#8c918d' 
        })
        .attr('stroke-width', 3)
        .attr("fill", 'none')
        .attr('transform', `translate(0, ${margin.top})`);
  
      svg.selectAll('start-label')
        .data(data.filter(({Year, Country}) => Number(Year) === start))
        .join('text')
        .attr('class', 'startLabel')
        .attr('id', function(d){
          if (colorCountry.includes(d.Country)){
            return 'selected'
          } else{
            return 'not-selected'
          }
        })
        .attr('x', d => xScale(new Date(d.Year)-1))
        .attr('y', d => yScale(parseInt(d['rank year'])))
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', function(d){
          return colorCountry.includes(d.Country)? myColor(d.Country) : 'black' 
        })
        .text(d => d['Country'])
        .attr('transform', `translate(-40, ${margin.top})`);
  
      svg.selectAll('end-label')
        .data(data.filter(({Year}) => Number(Year) === end))
        .join('text')
        .attr('class', 'endLabel')
        .attr('id', function(d){
          if (colorCountry.includes(d.Country)){
            return 'selected'
          } else{
            return 'not-selected'
          }
        })
        .attr('x', d => xScale(new Date(d.Year)))
        .attr('y', d => yScale(parseInt(d['rank year'])))
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', function(d){
          return colorCountry.includes(d.Country)? myColor(d.Country) : 'black' 
        })
        .text(d => d['Country'])
        .attr('transform', `translate(45, ${margin.top})`)
      

      const tooltip = select('#visual1')
        .append('div')
        .attr('id', 'tooltip')
        .text('hi im a tooltip')

      svg.selectAll('selected-dots')
        .data(data.filter(row => (select_countries + 'US').includes(row.Country)))
        .join('circle')
        .attr('class', 'selected-dots')
        .attr('cx', d=>xScale(new Date(d.Year)))
        .attr('cy', d=>yScale(parseInt(d['rank year'])))
        .attr('r', 5)
        .style('fill', function(d){
          return  myColor(d.Country)
        })
        .attr('stroke', 'white')
        .attr('transform', `translate(0, ${margin.top})`)
        .on('mouseenter', (e,d) => {
          console.log(e)
          const value = Math.round(d.Value*100)/100
          tooltip
            .style('display', 'block')
            .style('left', `${e.layerX+300}px`)
            .style('top', `${e.layerY+300}px`)
            .html(`Country: ${d.Country} (${d.Year}) <br> Difference in Wages by Gender: ${value}% <br> Ranking: ${Math.round(d['rank year'])}` )
          
        })
        .on('mouseleave', (e,d) => {
          tooltip
            .style('display', 'none')
        });

      
    }
    
    



  
  })
  


function scatter(data, filter){
  

  const height = 800;
  const width = 950 ;
  const margin = { left: 55, top: 50, bottom: 50, right: 50 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight  = height - margin.top - margin.bottom;


  var filtered = data.filter(row => row['Category'] == filter)
  var filtered = filtered.sort(function(a, b){return b['Women Employed'] - a['Women Employed']})
  console.log(filtered, "CHECK SORT")

  function convert(point){
   if (point < 150000){
     return 5
   } else if (point < 300000) {
     return 10
   } else if (point < 450000) {
     return 15
   } else if (point < 600000) {
     return 20
   } else if (point < 75000){
     return 25
   } else{
     return 30
   }
  }

  const xMenDomain = extent(filtered, d => parseInt(d['Men Median Earnings']))
  //const yWomenDomain = extent(data, d => parseInt(d['Women Median Earnings']))
  const xScale = scaleLinear()
    .domain([0, xMenDomain[1]+10000])
    .range([0, plotWidth]);; 

  const yScale = scaleLinear()
    .domain([xMenDomain[1]+10000, 0])
    .range([0, plotHeight]);

  d3.selectAll('.figure2-container').remove()

  const svg = select('#chart')
    .append('svg')
    .attr('class', 'figure2-container')
    .attr('height', plotHeight+100)
    .attr('width', plotWidth+100)
    .append('g')
    .attr('transform', `translate(0, ${margin.top})`);

  svg.append('g')
    .attr('class', 'x-axis2')
    .call(axisBottom(xScale)
    .ticks(5))
    .attr('transform', `translate(50, ${plotHeight})`);

  svg.append('g')
    .attr('class', 'y-axis2')
    .call(axisLeft(yScale)
    .ticks(5))
    .attr('transform', `translate(${margin.left}, 0)`);

  svg.append('line')
    .attr('class', 'equal-line')
    .style("stroke", "#C79C5F")
    .style("stroke-width", 4)
    .attr("x1", xScale(0))
    .attr("y1", yScale(0))
    .attr("x2", xScale(xMenDomain[1]))
    .attr("y2", yScale(xMenDomain[1]))
    .attr('transform', `translate(${margin.left}, 0)`);

  svg
    .append('text')
    .attr('class', 'y-axis2-label')
    .attr("transform", `translate(50, -30)`)
    .style("text-anchor", "middle")
    .style('font-size', '12px')
    .text('Women Median');

  svg
    .append('text')
    .attr('class', 'y-axis2-label')
    .attr("transform", `translate(50, -10)`)
    .style("text-anchor", "middle")
    .style('font-size', '12px')
    .text('Earnings ($)');

  svg
    .append('text')
    .attr('class', 'x-axis2-label')
    .attr("transform", `translate(${plotWidth}, ${plotHeight-20})`)
    .style("text-anchor", "middle")
    .style('font-size', '12px')
    .text('Men Median Earnings ($)');

    //Add annotations

  const line_label = [
    {
      note: {
        title: "Equal Pay between Men & Women",
      },
      color: ["#C79C5F"],
      x: xScale(xMenDomain[1]),
      y: yScale(parseInt(xMenDomain[1])-3500),
      dx: -100,
    }]

  const makeAnnotations = annotation()
    .annotations(line_label)
  svg
    .append("g")
    .attr('id', 'line-label')
    .call(makeAnnotations)

  if (filter === 'General'){
    const annotations = [
      {
        note: {
          label: "-Women's Earning as % of Men's: 84.1%   -Women as % of Total Employed: 26.7%" ,
          title: "Average STEM Occupation"
        },
        type: d3.annotationCalloutCircle,
        subject: {
          radius: 200,         // circle radius
          radiusPadding: 5   // white space around circle befor connector
        },
        color: ["#751F36"],
        x: xScale(96000),
        y: 180,
        dy: 50,
        dx: -70
      },
      {
        note: {
          label: "-Women's Earning as % of Men's: 73.3%   -Women as % of Total Employed: 73.8%",
          title: "Average STEM Related Occupation" 
        },
        type: d3.annotationCalloutCircle,
        subject: {
          radius: 200,         // circle radius
          radiusPadding: 5   // white space around circle befor connector
        },
        color: ["#751F36"],
        x: xScale(91000),
        y: 280,
        dy: 110,
        dx: 30
      },
      {
        note: {
          label: "-Women's Earning as % of Men's: 80.4%  -Women as % of Total Employed: 47.3%",
          title: "Average Non STEM Occupation"
        },
        type: d3.annotationCalloutCircle,
        subject: {
          radius: 200,         // circle radius
          radiusPadding: 5   // white space around circle befor connector
        },
        color: ["#751F36"],
        x: xScale(58000),
        y: 390,
        dy: 50,
        dx: 80
      },
      {
        note: {
          title: "Average Occupation",
          label: "-Women's Earning as % of Men's: 81.0%  -Women as % of Total Employed: 47.7%"
          
        },
        type: d3.annotationCalloutCircle,
        subject: {
          radius: 200,         // circle radius
          radiusPadding: 5   // white space around circle befor connector
        },
        color: ["#751F36"],
        x: xScale(55000),
        y: 420,
        dy: 70,
        dx: -30
      }
    ]

    const makeAnnotations = annotation()
      .annotations(annotations)
    svg
      .append("g")
      .attr('id', 'annotations-general')
      .call(makeAnnotations)


  } 
  
  var dots = svg.selectAll('dots')
    .data(filtered)
    .join('circle')
      .attr('class', 'selected-dots2')
      .attr('cx', d=>xScale(d['Men Median Earnings']))
      .attr('cy', d=>yScale(d['Women Median Earnings']))
      .attr('r', function(d){
        return convert(d['Women Employed'])
      })
      .style('fill', '#182A34')
      .attr('stroke', 'white')
      .attr('transform', `translate(${margin.left}, 0)`)
      .attr('opacity', 0.6)

  if (filter == 'STEM Occupations'){
    dots.on('mouseenter', (e,d) => {
      select(e.currentTarget)
        .style("fill", "#751F36")
      var annotate;

      if (["Engineers all other", "Computer occupations all other", "Software developers",  "Computer systems managers"].includes(d.Occupation)){
        var annotate = [
          {
            note: {
              label: `-Women's Earning as % of Men's: ${d[`Women's earnings as a percentage of men's earnings`]}%   
              -Women as % of Total Employed: ${d[`Percentage of women in occupational group`]}%` ,
              title: `${d.Occupation}`
            },
            type: d3.annotationCalloutCircle,
            subject: {
              radius: 200,         // circle radius
              radiusPadding: 5   // white space around circle befor connector
            },
            color: ["#751F36"],
            x: xScale(parseInt(d['Men Median Earnings']) + 8000),
            y: yScale(d['Women Median Earnings']),
            dy: 40,
            dx: 10
          }]
      } else if(["Biological scientists", "Computer systems administrators",  "Other mathematical science occupations", "Industrial engineers"].includes(d.Occupation)){
        var annotate = [
          {
            note: {
              label: `-Women's Earning as % of Men's: ${d[`Women's earnings as a percentage of men's earnings`]}%   
              -Women as % of Total Employed: ${d[`Percentage of women in occupational group`]}%` ,
              title: `${d.Occupation}`
            },
            type: d3.annotationCalloutCircle,
            subject: {
              radius: 200,         // circle radius
              radiusPadding: 5   // white space around circle befor connector
            },
            color: ["#751F36"],
            x: xScale(parseInt(d['Men Median Earnings']) + 8000),
            y: yScale(d['Women Median Earnings']),
            dy: -30,
            dx: -10
          }]
      }

      else{
        var annotate = [
          {
            note: {
              label: `-Women's Earning as % of Men's: ${d[`Women's earnings as a percentage of men's earnings`]}%   
              -Women as % of Total Employed: ${d[`Percentage of women in occupational group`]}%` ,
              title: `${d.Occupation}`
            },
            type: d3.annotationCalloutCircle,
            subject: {
              radius: 200,         // circle radius
              radiusPadding: 5   // white space around circle befor connector
            },
            color: ["#751F36"],
            x: xScale(parseInt(d['Men Median Earnings']) + 8000),
            y: yScale(d['Women Median Earnings']),
            dy: 80,
            dx: -10
          }]
      }
      

        const makeAnnotations = annotation()
          .annotations(annotate)
          
        svg
          .append("g")
          .attr('id', 'annotations')
          .call(makeAnnotations)
      
    })
    .on('mouseleave', (e,d) => {
      select(e.currentTarget)
        .style("fill", "#182A34")
      select('g #annotations').remove()
    });
  } else if (filter == 'STEM-related Occupations'){
    dots.on('mouseenter', (e,d) => {
      select(e.currentTarget)
        .style("fill", "#751F36")

      var annotate;
      if(["Other physicians"].includes(d.Occupation)){
        var annotate = [
          {
            note: {
              label: `-Women's Earning as % of Men's: ${d[`Women's earnings as a percentage of men's earnings`]}%   
              -Women as % of Total Employed: ${d[`Percentage of women in occupational group`]}%` ,
              title: `${d.Occupation}`
            },
            type: d3.annotationCalloutCircle,
            subject: {
              radius: 200,         // circle radius
              radiusPadding: 5   // white space around circle befor connector
            },
            color: ["#751F36"],
            x: xScale(parseInt(d['Men Median Earnings']) + 14500),
            y: yScale(d['Women Median Earnings']),
            dy: 40,
            dx: -20
          }]
      }else if (['Pharmacy technicians', 'Veterinary technologists and technicians', 'Licensed vocational nurses', 'Medical records specialists'].includes(d.Occupation)){
        var annotate = [
          {
            note: {
              label: `-Women's Earning as % of Men's: ${d[`Women's earnings as a percentage of men's earnings`]}%   
              -Women as % of Total Employed: ${d[`Percentage of women in occupational group`]}%` ,
              title: `${d.Occupation}`
            },
            type: d3.annotationCalloutCircle,
            subject: {
              radius: 200,         // circle radius
              radiusPadding: 5   // white space around circle befor connector
            },
            color: ["#751F36"],
            x: xScale(parseInt(d['Men Median Earnings']) + 15000),
            y: yScale(d['Women Median Earnings']),
            dy: -5,
            dx: 220
          }]
      } else{
        var annotate = [
          {
            note: {
              label: `-Women's Earning as % of Men's: ${d[`Women's earnings as a percentage of men's earnings`]}%   
              -Women as % of Total Employed: ${d[`Percentage of women in occupational group`]}%` ,
              title: `${d.Occupation}`
            },
            type: d3.annotationCalloutCircle,
            subject: {
              radius: 200,         // circle radius
              radiusPadding: 5   // white space around circle befor connector
            },
            color: ["#751F36"],
            x: xScale(parseInt(d['Men Median Earnings']) + 16000),
            y: yScale(d['Women Median Earnings']),
            dy: -20,
            dx: -20
          }]
      }

      const makeAnnotations = annotation()
        .annotations(annotate)
      svg
        .append("g")
        .attr('id', 'annotations')
        .call(makeAnnotations)
      
    })
    .on('mouseleave', (e,d) => {
      select(e.currentTarget)
        .style("fill", "#182A34")
      select('g #annotations').remove()
    });
  }
     
  var legend = svg.append('g')
    .attr('class', 'legend')
    .attr('height', 350)
    .attr('width', 350);

  legend
    .append('g')
    .attr('class', 'legend-title')
    .append('text')
    .attr('x', 180)
    .attr('y', 10)
    .style('font-weight', 'bold')
    .text('Women Employed');

  var size = [5,10,15,20,25,30]
  var labels = ['0-150,000', '< 300,000', '< 450,000', '< 600,000', '< 750,000', '> 750,000']

  legend.selectAll('circles')
    .data(size)
    .enter()
    .append('circle')
    .attr('cx', 190)
    .attr('cy', function (d, i) {
      if (i==0){
        return ((i+0.5) *35)+20;
      } else if (i==1){
        return (i*45)+20
      } else if ([2,3].includes(i)){
        return (i *40)+20
      }else if (i==4) {
        return (i*42)+20
      } else{
        return (i * 45)+20;
      }})
    .attr('width', 20)
    .attr('height', 20)
    .attr('r', function(d){
      return d
    })
    .style('fill', '#182A34')
    .attr('opacity', 0.7)
    .attr('stroke', 'white')
    .attr('stroke-width', 3);

  legend
    .selectAll('label')
    .data(labels)
    .enter()
    .append('text')
    .attr('class', 'legend-text')
    .attr('x', 240)
    .attr('y', function (d, i) {
      if (i==0){
        return ((i+0.5) *35)+25;
      } else if (i==1){
        return (i*45)+25
      } else if ([2,3].includes(i)){
        return (i *40)+25
      }else if (i==4) {
        return (i*42)+25
      } else{
        return (i * 45)+25;
      }})
    .text(function(d){return d});
}

csv('./data/wage-gap.csv')
  .then(data => {
    //console.log('WAGE GAP' , data)

    var scrolly = select("#scrolly");
    var figure = scrolly.select("figure");
    var article = scrolly.select("article");
    var step = article.selectAll(".step");

    // initialize the scrollama
    var scroller = scrollama();

    // generic window resize listener event
    function handleResize() {
      // 1. update height of step elements
      var stepH = Math.floor(window.innerHeight * 0.85);
      step.style("height", stepH + "px");

      var figureHeight = window.innerHeight - 70;
      var figureMarginTop = (window.innerHeight - figureHeight) / 2;

      figure
        .style("height", figureHeight + "px")
        .style("top", figureMarginTop + "px");

      // 3. tell scrollama to update new element dimensions
      scroller.resize();
    }

    // scrollama event handlers
    function handleStepEnter(response) {
      console.log(response);
      // response = { element, direction, index }

      // add color to current step only
      step.classed("is-active", function(d, i) {
        return i === response.index;
      });

      // update graphic based on step
      if (response.index === 0){
        scatter(data, 'General')
      } else if (response.index===1){
        scatter(data, 'STEM Occupations')
      } else{
        scatter(data, 'STEM-related Occupations')
      };
    }

    function setupStickyfill() {
      d3.selectAll(".sticky").each(function() {
        Stickyfill.add(this);
      });
    }

    function init() {
      setupStickyfill();

      // 1. force a resize on load to ensure proper dimensions are sent to scrollama
      handleResize();

      // 2. setup the scroller passing options
      // 		this will also initialize trigger observations
      // 3. bind scrollama event handlers (this can be chained like below)
      scroller
        .setup({
          step: "#scrolly article .step",
          //offset: 0.5,
          //debug: true,
        })
        .onStepEnter(handleStepEnter);

      // setup resize event
      window.addEventListener("resize", handleResize);
    }

    // kick things off
    init();
   

    
      


    
  })