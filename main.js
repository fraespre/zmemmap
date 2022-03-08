const FS= require('fs')
// https://www.z88dk.org/forum/viewtopic.php?t=10253
// http://m8y.org/Microsoft_Office_2003_XML_Reference_Schemas/Help/html/spreadsheetml_HV01151864.htm
// http://m8y.org/Microsoft_Office_2003_XML_Reference_Schemas/Help/html/spreadsheetml_HV01151864.htm

module.exports= { checkFile, mainScan }


function error(message) {
  console.error("Error: "+message+"\n")
  process.exit(1)
}

function debug(struct, message) {
  if(struct.opVerbose)
    console.error(" > "+message)
}

function checkFile(filePath) {
  if( !FS.existsSync(filePath) ) 				error("File '"+filePath+"' not found")
  else {
    if(filePath.split('.').pop()!="map") 		error("The file hasn't .map extension")
  }
}


function mainScan(filePath, options) {
  var struct, outFile
  
  //console.log("[filePath:"+filePath+"][options:"+options+"]")
  try {
    struct= initStruct(filePath, options)
    readMapFile(struct)
    calculateSize(struct)
    groupingAddr(struct)
    resultsSize(struct)
    
    outFile= FS.createWriteStream(struct.path+struct.name+".xml", {encoding:'utf8'})
    fillHead(struct, outFile)
    fillResume(struct, outFile)
    fillSections(struct, outFile)
    fillFoot(struct, outFile)
    outFile.close()
  }catch(exception) {
    console.log( exception.stack );
  }
}

function initStruct(filePath, options) {
  var pName= filePath.substr(0, filePath.lastIndexOf('.'))
      pName= pName.substr(pName.lastIndexOf('/')+1)
  var pPath= filePath.substr(0, filePath.lastIndexOf('/')+1) 
  var struct=	{ 	file: filePath,
  					name: pName,
  					path: pPath,
  					opVerbose: options.verbose==true,
  					opOnlyUser: options.user==true,
  					src_cons: null,		// constants rows read from Map file
  					src_addr: null,		// addresses rows read from Map file
  					sections: null,		// grouping generated
  					res_size: null
  				}
  //console.log(struct)
  return(struct)
}

function readMapFile(struct) {
  var lines, line, row, word, idx
  
  lines= FS.readFileSync(struct.file).toString().split("\n")
  debug(struct, "reading '"+struct.file+"' file")
  
  struct.src_addr= new Array()
  struct.src_cons= new Array()
      
  for(i in lines) {
    line= lines[i].trim()
    
    if(line.length>0) {
      //console.log( line )
      row= new Array()
      
      // parse item
      word= line.slice( 0, idx= line.indexOf("=") ); line= line.substr(idx+1)
      row.item= word.trim()
      // parse address
      word= line.slice( 0, idx= line.indexOf(";") ); line= line.substr(idx+1)
      row.address= parseInt( word.trim().substr(1) , 16)
      row["size"]= null
      // parse varType
      word= line.slice( 0, idx= line.indexOf(",") ); line= line.substr(idx+1)
      row.varType= word.trim()     
      // parse scope
      word= line.slice( 0, idx= line.indexOf(",") ); line= line.substr(idx+1)
      row.scope= word.trim() 
      // parse def
      word= line.slice( 0, idx= line.indexOf(",") ); line= line.substr(idx+1)
      row.def= word.trim()=="def"       
      // parse component
      word= line.slice( 0, idx= line.indexOf(",") ); line= line.substr(idx+1)
      row.component= word.trim()  
      // parse section
      word= line.slice( 0, idx= line.indexOf(",") ); line= line.substr(idx+1)
      row.section= word.trim()        
      
      // load new Row             
      if( row.varType=="const" ) 			struct.src_cons.push( row )
      else if( isIncluded(struct, row) )	struct.src_addr.push( row )
          
    }
  }
  
  debug(struct, "parsed "+lines.length+" lines => extracted "+struct.src_addr.length+" addresses and "+struct.src_cons.length+" constants")
}

function isIncluded(struct, row) {
  var ret= false
  if(struct.opOnlyUser) {
   	if( row.component.endsWith("_c") || row.component.endsWith("_asm") || row.item=="free" )	ret= true 
  }else 																 						ret= true 
  
  return ret
}

function calculateSize(struct) {
  var row, lastRow
  
  // sort by address
  struct.src_addr.sort( (a, b) => a.address-b.address ) //struct.matrix.sort( (a, b) => a.address.localeCompare(b.address )
  // calculate size
  for(var idx=1; idx<struct.src_addr.length; idx++) {
    row= struct.src_addr[idx]
    lastRow= struct.src_addr[idx-1]
  	if(row.address==lastRow.address)  lastRow.size= 0
  	else							  lastRow.size= row.address-lastRow.address
  }
  
  debug(struct, "item size calculated")
  //console.log( struct.details )
}

function groupingAddr(struct) {
  var detailTmp1, detailTmp2, detailTmp3, sectionTmp, componentTmp, sumItem, sumComp
  
  //debug(struct, "grouping addresses:")
  struct.sections= new Array()
  detailTmp1= struct.src_addr.filter(row => (row.size>0)&&(row.def==false)&&(row.section.length>0));
  sectionTmp= [ ... new Set( detailTmp1.map(row => row.section) ) ]
  
  for(var idx=0; idx<sectionTmp.length; idx++) {
    //debug(struct, "  L> Section: "+sectionTmp[idx])
  
    struct.sections[idx]= { name: sectionTmp[idx], components: new Array(), size: 0 }  
    detailTmp2= detailTmp1.filter(row => row.section==sectionTmp[idx]);
    componentTmp= [ ... new Set( detailTmp2.map(row => row.component) ) ]  
    
    for(var idy=0, sumComp=0; idy<componentTmp.length; idy++) {
      //debug(struct, "    L> Component: "+componentTmp[idy])
    
      struct.sections[idx].components[idy]= { name: componentTmp[idy], items: new Array(), size: 0 }
      detailTmp3= detailTmp2.filter(row => row.component==componentTmp[idy]);
      detailTmp3.sort( (a, b) => b.size-a.size ) // Sort by Size desc
 
      for(var idz=0, sumItem=0; idz<detailTmp3.length; idz++) {
        //debug(struct, "      -> Item ["+detailTmp3[idz].size+"]: "+detailTmp3[idz].item)
        
        struct.sections[idx].components[idy].items[idz]= { name: detailTmp3[idz].item, size: detailTmp3[idz].size }
        sumItem+= detailTmp3[idz].size
      }
      struct.sections[idx].components[idy].size= sumItem
      sumComp+= sumItem
    }
    struct.sections[idx].size= sumComp
  }
  
  debug(struct, "grouping calculated")
  //console.log( struct.sections )
}

function resultsSize(struct) {
  var detailTmp1
  
  struct.res_size= new Array()
  
  detailTmp1= struct.src_addr.filter(row => (row.item=="free"))
  struct.res_size[0]= { name: detailTmp1[0].item, size: detailTmp1[0].address }  
  
  detailTmp1= struct.src_cons.filter(row => (row.address>5)&&(row.item.startsWith("__"))&&(row.item.endsWith("_size")) )
  detailTmp1.sort( (a, b) => b.address-a.address )
  for(var idx=0; idx<detailTmp1.length; idx++) {
    struct.res_size[idx+1]= { name: detailTmp1[idx].item.substr(2), size: detailTmp1[idx].address } 
  }
  
  debug(struct, "results calculated")
  //console.log( struct.res_size )
}

function fillHead(struct, out) {
  out.write('<?xml version="1.0" encoding="UTF-8"?> \n')
  out.write('<?mso-application progid="Excel.Sheet"?> \n')
  out.write('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="https://www.w3.org/TR/html401/"> \n')
  out.write('<Styles> <Style ss:ID="s23"> <Font x:Family="Swiss" ss:Bold="1"/> </Style> </Styles> \n')
}

function fillResume(struct, out) {
  var row
  
  out.write('<Worksheet ss:Name="Resume"> \n')
  out.write('<Table> \n')
  out.write('<tableColumns count="3"> tableColumn id="1" name="Expenses" tableColumn id="2" name="Amount" tableColumn id="3" name="Date Paid" </tableColumns> \n')
  out.write('<Column ss:Index="2" ss:AutoFitWidth="1" ss:Width="130"/> \n')
  out.write('    <Row/> \n')
  out.write('    <Row> <Cell/> \n')
  out.write('          <Cell ss:StyleID="s23"> <Data ss:Type="String">Name</Data> </Cell> \n')
  out.write('          <Cell ss:StyleID="s23"> <Data ss:Type="String">Size(bytes)</Data> </Cell> \n')
  out.write('    </Row> \n') 
  
    for(var idx=0; idx<struct.res_size.length; idx++) {
      row= struct.res_size[idx]
      
  out.write('    <Row> <Cell/> \n')
  out.write('          <Cell> <Data ss:Type="String">'+row.name+'</Data> </Cell> \n')
  out.write('          <Cell> <Data ss:Type="Number">'+row.size+'</Data> </Cell> \n')
  out.write('    </Row> \n')
  
    }
  
  out.write('</Table> \n')
  out.write('</Worksheet> \n')
}

function fillSections(struct, out) {
  out.write('<Worksheet ss:Name="GroupedItems"> \n')

  out.write('</Worksheet> \n')
}

function fillFoot(struct, out) {
  //out.write('</Worksheet> \n')
  out.write('</Workbook> \n')
}


