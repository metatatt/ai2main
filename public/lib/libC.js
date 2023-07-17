export function populateFindings(header, results) {
    console.log('in Findings-results', results);
    const auditData0 = JSON.parse(results[0].audit); // Parse the JSON string into an object
    const auditData1 = JSON.parse(results[1].audit); 
    const findingsDOM = `
      <div class="container slide">
        <div class="CSSgal">
        <div id="s1" class="play-sequence"></div>
        <div id="s2" class="play-sequence"></div>
        <div id="s3" class="play-sequence"></div>
        <div id="s4" class="play-sequence"></div>
        
          <div class="slider">
            <div style="background:#5b8;">
              <h2>${header.header1}: Visual Inspection Summary</h2>
              <br>
              <br>
              <p> based on a total of ${results.length} Examined Visual(s)<br></p>
              <p>- The Visual is Identified as ${auditData0.tag} Compliant.<br></p>
              <p>- With a Confidence Level of ${auditData0.probability}%<br><br><br></p>
              <p>- The perspective Dataset size is: ${header.header2}</p>      
            </div>
            <div style="background:#85b; position: relative;">
              <h2>Examined Visual #1 of ${results.length}</h2>
              <p>-marker map for ${auditData0.tag} (${auditData0.probability} confidence)<br></p>
              <br>
            </div>
            <div style="background:#e95; position: relative;">
              <h2>Examined Visual #2 of ${results.length}</h2>
              <p>-marker map for ${auditData1.tag} (${auditData1.probability} confidence)<br></p>
              <br>
            </div>
            <div style="background:#e59;">
              <h2>About this Inspection....</h2>
              <p>-1) need to write something here...<br></p>
              <p>-2) here too...<br></p>
            </div>
          </div>

          <div class="prevNext">
            <div><a href="#s4"></a><a href="#s2"></a></div>
            <div><a href="#s1"></a><a href="#s3"></a></div>
            <div><a href="#s2"></a><a href="#s4"></a></div>
            <div><a href="#s3"></a><a href="#s1"></a></div>
          </div>
          <div class="bullets">
            <a href="#s1">1</a>
            <a href="#s2">2</a>
            <a href="#s3">3</a>
            <a href="#s4">4</a>
          </div>

        </div>
      </div>
    `;
    return findingsDOM
  }

 
  
  