

export function populateFindings(header, results) {
    console.log('in Findings-results', results);
    let string1 = `
    <div class="container slide">
      <div class="CSSgal">
      
      `;
    for (let i = 0; i < results.length; i++) {
      string1 += `<div id="s${i + 1}" class="play-sequence"></div>
      `;
    }
    
    let string2 = `
    
    <div class="slider">
      <div style="background:#5b8;">
        <h2>${header.header1}: Visual Inspection Summary</h2>
        <br>
        <br>
        <p> based on a total of ${results.length} Examined Visual(s)<br></p>
        <p>- The Visual is Identified as ${results[0].tag} Compliant.<br></p>
        <p>- With a Confidence Level of ${results[0].probability}%<br><br><br></p>
        <p>- The perspective Dataset size is: ${header.header2}</p>      
      </div>
    
    `
    for (let i = 0; i < results.length; i++) {
      string2 += `
      <div style="background:#85b; position: relative;">
        <h2>Examined Visual #${i+1} of ${results.length}</h2>
        <p>-marker map for ${results[i].tag} (${results[i].probability} confidence)<br></p>
        <br>
        <img src= "$-{results[i].image}-"/>
      </div>
    `;
    }
    string2 += `
          <div style="background:#e59;">
              <h2>About this Inspection....</h2>
              <p>-1) need to write something here...<br></p>
              <p>-2) here too...<br></p>
            </div>
      </div>

      `
   let string3 = `<div class="prevNext"> `;
      for (let i = 0; i < results.length; i++) {
        const currentSlide = i + 1;
        const prevSlide = (i === 0) ? results.length : currentSlide - 1;
        const nextSlide = Math.min(currentSlide + 1, results.length);
        string3 += `<div><a href="#s${prevSlide}"></a><a href="#s${nextSlide}"></a></div>`;
      }
      
    let string4 = `
          </div>
          <div class="bullets">`

    for (let i = 0; i < results.length; i++) {  
      string4 += `    <a href="#s${i+1}">${i+1}</a>`
    }
    
    string4 += 
    `    </div>
        </div>
      </div>
    `
    const finalHtmlString = string1 + string2 + string3 + string4;
    console.log('html: ', finalHtmlString)
    return finalHtmlString
  }

  <style>

.slide {
  top: 0;
  left: 0;
  height: 100vh;
  width: calc(80vw * var(--factor));
  position: absolute;
  background: var(--batonBlue);
  object-fit: contain;
  margin: auto;
}

/*
PURE RESPONSIVE CSS3 SLIDESHOW GALLERY by Roko C. buljan
http://stackoverflow.com/a/34696029/383904
*/

.CSSgal {
    position: relative;
    overflow: hidden;
    height: 100%; /* Or set a fixed height */
  }
  
  /* SLIDER */
  
  .CSSgal .slider {
    height: calc(100% * var(--factor));
    white-space: nowrap;
    font-size: 0;
    transition: 0.8s;
    position: relative;
  }
  
  /* SLIDES */
  
  .CSSgal .slider > * {
    font-size: calc(1rem * var(--factor));
    display: inline-block;
    white-space: normal;
    vertical-align: top;
    height: 100%;
    width: calc(100% * var(--factor));
    background: none 50% no-repeat;
    background-size: cover;
  }
  
  /* PREV/NEXT, CONTAINERS & ANCHORS */
  
  .CSSgal .prevNext {
    position: absolute;
    z-index: 1;
    top: calc(50% * var(--factor));
    width: calc(100% * var(--factor));
    height: 0;
  }
  
  .CSSgal .prevNext > div+div {
    visibility: hidden; /* Hide all but first P/N container */
  }
  
  .CSSgal .prevNext a {
    background: #fff;
    position: absolute;
    width: calc(120px * var(--factor));
    height: calc(120px * var(--factor));
    line-height: calc(120px * var(--factor)); /* If you want to place numbers */
    text-align: center;
    opacity: 0.7;
    -webkit-transition: 0.3s;
    transition: 0.3s;
    -webkit-transform: translateY(-50%);
    transform: translateY(-50%);
    left: 0;
  }
  .CSSgal .prevNext a:hover {
    opacity: 1;
  }
  .CSSgal .prevNext a+a {
    left: auto;
    right: 0;
  }
  
  /* NAVIGATION */
  
  .CSSgal .bullets {
    position: absolute;
    z-index: 2;
    bottom: 0;
    padding: calc(10px * var(--factor)) 0;
    width: 100%;
    text-align: center;
  }
  .CSSgal .bullets > a {
    display: inline-block;
    width: calc(90px * var(--factor));
    height: calc(90px * var(--factor));
    line-height: calc(90px * var(--factor));
    text-decoration: none;
    text-align: center;
    background: rgba(255, 255, 255, 1);
    -webkit-transition: 0.3s;
    transition: 0.3s;
  }
  .CSSgal .bullets > a+a {
    background: rgba(255, 255, 255, 0.5); /* Dim all but first */
  }
  .CSSgal .bullets > a:hover {
    background: rgba(255, 255, 255, 0.7) !important;
  }
  
  /* NAVIGATION BUTTONS */
  /* ALL: */
  .CSSgal >s:target ~ .bullets >* {background: rgba(255, 255, 255, 0.5);}
  /* ACTIVE */
  #s1:target ~ .bullets >*:nth-child(1) {background: rgba(255, 255, 255, 1);}
  #s2:target ~ .bullets >*:nth-child(2) {background: rgba(255, 255, 255, 1);}
  #s3:target ~ .bullets >*:nth-child(3) {background: rgba(255, 255, 255, 1);}
  #s4:target ~ .bullets >*:nth-child(4) {background: rgba(255, 255, 255, 1);}
  #s5:target ~ .bullets >*:nth-child(5) {background: rgba(255, 255, 255, 1);}
  #s6:target ~ .bullets >*:nth-child(6) {background: rgba(255, 255, 255, 1);}
  /* More slides? Add here more rules */
  
  /* PREV/NEXT CONTAINERS VISIBILITY */
  /* ALL: */
  .CSSgal >s:target ~ .prevNext >* {visibility: hidden;}
  /* ACTIVE: */
  #s1:target ~ .prevNext >*:nth-child(1) {visibility: visible;}
  #s2:target ~ .prevNext >*:nth-child(2) {visibility: visible;}
  #s3:target ~ .prevNext >*:nth-child(3) {visibility: visible;}
  #s4:target ~ .prevNext >*:nth-child(4) {visibility: visible;}
  #s5:target ~ .prevNext >*:nth-child(5) {visibility: visible;}
  #s6:target ~ .prevNext >*:nth-child(6) {visibility: visible;}


  /* More slides? Add here more rules */
  
  /* SLIDER ANIMATION POSITIONS */
  
  #s1:target ~ .slider {transform: translateX(0%); -webkit-transform: translateX(0%);}
  #s1:target ~ .slider {transform: translateX(0%); -webkit-transform: translateX(0%);}
  #s2:target ~ .slider {transform: translateX(calc(-100% * var(--factor))); -webkit-transform: translateX(calc(-100% * var(--factor)));}
  #s3:target ~ .slider {transform: translateX(calc(-200% * var(--factor))); -webkit-transform: translateX(calc(-200% * var(--factor)));}
  #s4:target ~ .slider {transform: translateX(calc(-300% * var(--factor))); -webkit-transform: translateX(calc(-300% * var(--factor)));}
  #s5:target ~ .slider {transform: translateX(calc(-300% * var(--factor))); -webkit-transform: translateX(calc(-300% * var(--factor)));}
  #s6:target ~ .slider {transform: translateX(calc(-300% * var(--factor))); -webkit-transform: translateX(calc(-300% * var(--factor)));}


  /* More slides? Add here more rules */
  
  /* YOU'RE THE DESIGNER! 
     ____________________
     All above was mainly to get it working :)
     CSSgal CUSTOM STYLES / OVERRIDES HERE: */
  
  .CSSgal {
    color: #fff;
    text-align: center;
  }
  
  .CSSgal .slider h2 {
    margin-top: calc(10vh * var(--factor));
    font-weight: 200;
    letter-spacing: calc(-0.06em * var(--factor));
    word-spacing: calc(0.2em * var(--factor));
    font-size: calc(3em * var(--factor));
    line-height: calc(1.5 * var(--factor)); /* Adjust the value as per your preference */
    text-align: left;
    padding-left: calc(5vw * var(--factor));
  }
  
  .CSSgal .slider p {
    font-weight: 100;
    word-spacing: calc(0.1em * var(--factor));
    font-size: calc(2.2em * var(--factor));
    text-align: left;
    padding-left: calc(10vw * var(--factor));
    padding-right: calc(10vw * var(--factor));
    max-width: calc(80% * var(--factor));
    word-wrap: break-word;
  }
  
  .CSSgal a {
    border-radius: calc(50% * var(--factor));
    margin: calc(0 * var(--factor)) calc(3px * var(--factor));
    color: rgba(0, 0, 0, 0.8);
    text-decoration: none;
    font-size: calc(1.2em * var(--factor));
  }
  
  .CSSgal .slider img {
    max-height: calc(60% * var(--factor));
    width: auto;
    bottom: 0;
    left: 0;
    right: 0;
    margin: auto;
  }
  
  .inactive-btn {
    cursor: not-allowed; /* No pointer reaction */
    opacity: 0.5; /* Lower visibility */
    pointer-events: none; /* Ignore pointer events */
    position: relative; /* Required for pseudo-element positioning */
  }
  
  .inactive-btn:hover::before {
    content: "Inactive"; /* Prompt message on hover */
    position: absolute;
    top: calc(-20px * var(--factor));
    left: calc(50% * var(--factor));
    transform: translateX(calc(-50% * var(--factor)));
    background-color: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: calc(4px * var(--factor)) calc(8px * var(--factor));
    border-radius: calc(4px * var(--factor));
    font-size: calc(12px * var(--factor));
    white-space: nowrap;
  }
  

  </style>