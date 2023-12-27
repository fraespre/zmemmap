const FS= require('fs')
const NoStyle= null

// https://www.z88dk.org/forum/viewtopic.php?t=10253
// http://m8y.org/Microsoft_Office_2003_XML_Reference_Schemas/Help/html/spreadsheetml_HV01151864.htm
// http://officeopenxml.com/SSstyles.php
// https://firstclassjs.com/remove-duplicate-objects-from-javascript-array-how-to-performance-comparison/
// https://appdividend.com/2022/01/29/javascript-array-find/
// https://stackoverflow.com/questions/24118320/excel-spreadsheet-dynamic-cell-colouring-using-xml-and-xslt
// https://wtools.io/paste-code/bJUz

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
    resultConstants(struct)
    calculateSize(struct)
    resultGrouping(struct)
    
    outFile= FS.createWriteStream(struct.path+struct.name+".xml", {encoding:'utf8'})
    printExcelHead(struct, outFile)
    fillResume(struct, outFile)
    fillSections(struct, outFile)
    fillMemMap(struct, outFile)
    printExcelFoot(struct, outFile)
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
  					src_cons: new Array(),	// constants rows read from Map file
  					src_addr: new Array(),	// addresses rows read from Map file
  					sections: new Array(),	// grouping generated
            componen: new Array(),	// grouping generated
  					res_size: new Array()
  				}
  //console.log(struct)
  return(struct)
}

function readMapFile(struct) {
  var lines, line, row, word, idx
  
  lines= FS.readFileSync(struct.file).toString().split("\n")
  debug(struct, "reading '"+struct.file+"' file")
      
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
      if( row.address <= 65535 ) {	// if addr > $FFFF ==> it's an error
        if( row.varType=="const" ) 	struct.src_cons.push( row )
        else 						struct.src_addr.push( row )
      } 
      
    }
  }
  
  debug(struct, "parsed "+lines.length+" lines => extracted "+struct.src_addr.length+" addresses and "+struct.src_cons.length+" constants")
}

function resultConstants(struct) {
  var detailTmp1
  
  detailTmp1= struct.src_cons.filter(row => (row.address>0)&&(row.item.startsWith("__"))&&(row.item.endsWith("_size")) )
  detailTmp1.sort( (a, b) => b.address-a.address )
  for(var idx=0; idx<detailTmp1.length; idx++) {
    struct.res_size[idx]= { name: detailTmp1[idx].item, size: detailTmp1[idx].address } 
  }
  debug(struct, "results calculated")
  //console.log( struct.res_size )
}

function calculateSize(struct) {
  var row, lastRow
  
  // some filters
  struct.src_addr= struct.src_addr.filter(row => (!row.item.endsWith("_fastcall"))&&(!row.item.endsWith("_callee"))&&(!row.item.endsWith("_unlocked")) )
  struct.src_addr= struct.src_addr.filter(row => !row.item.startsWith("l_") )
  // sort by address
  struct.src_addr.sort( (a, b) => a.address-b.address ) //struct.matrix.sort( (a, b) => a.address.localeCompare(b.address )
  // calculate size
  for(var idx=1; idx<struct.src_addr.length; idx++) {
    row= struct.src_addr[idx]
    lastRow= struct.src_addr[idx-1]
  	if(row.address!=lastRow.address) {			lastRow.size= row.address-lastRow.address
  	}else { // Same address => anomaly
  	  if( (idx+1)<struct.src_addr.length ) {	lastRow.size= struct.src_addr[idx+1]-row.address
  	  }
  	}
  }
  debug(struct, "item size calculated")
  //console.log( struct.src_addr )
}

function resultGrouping(struct) {
  var detailTmp1, detailTmp2, detailTmp3, sectionTmp, componentTmp, sumItem, sumComp
  
  //debug(struct, "grouping addresses:")
  detailTmp1= struct.src_addr.filter(row => (row.size>0)&&(row.def==false)&&(row.section.length>0))
  if(struct.opOnlyUser)
    detailTmp1= detailTmp1.filter(row => row.component.endsWith("_c")||row.component.endsWith("_asm"))
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
        
        struct.sections[idx].components[idy].items[idz]= { name: detailTmp3[idz].item, size: detailTmp3[idz].size, scope: detailTmp3[idz].scope }
        sumItem+= detailTmp3[idz].size
      }
      //struct.sections[idx].components[idy].address= detailTmp3.reduce((min, p) => p.address<min ? p.address : min, 0)
      struct.sections[idx].components[idy].size= sumItem

      minAddress= detailTmp3.reduce((min, p) => (p.address<min?p.address:min), 99999)
      struct.componen.push( { name: componentTmp[idy], section: sectionTmp[idx], size: sumItem, address: minAddress } )

      sumComp+= sumItem
    }
    struct.sections[idx].size= sumComp
  }
  
  debug(struct, "grouping calculated")
  //console.log( struct.sections )
}


// Excel Output Functions ----------------------------------------------------------------------

function printTableIni(out, sheetId, ...args) {
  out.write('<Worksheet ss:Name="'+sheetId+'"> \n <Table> \n')
  if(arguments.length>2) {
    for(var i= 2; i<arguments.length; i++) {
      out.write('<Column ss:Index="'+i+'" ss:Width="'+arguments[i]+'"/> ')
    }
    out.write('\n<Row/> \n') 
  }
}

function printTableFin(out) {
  out.write('</Table> \n </Worksheet> \n')
}

function printTableRow(out, style, ...args) {
  out.write('<Row> \n')
  if(arguments.length>2) {
    out.write('<Cell/> \n')
    for(var i= 2; i<arguments.length; i++) {
      out.write('<Cell'+ ((style!=null)?' ss:StyleID="'+style+'"':'') +'> ')
      out.write('<Data ss:Type="String">'+arguments[i]+'</Data> </Cell> \n')
    } 
  }
  out.write('</Row> \n')   
}

function printExcelHead(struct, out) {
  out.write('<?xml version="1.0" encoding="UTF-8"?> \n')
  out.write('<?mso-application progid="Excel.Sheet"?> \n')
  out.write('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="https://www.w3.org/TR/html401/"> \n')
  out.write('<ss:Styles> \n')
  out.write('  <ss:Style ss:ID="StyleHeader"> <Font x:Family="Swiss" ss:Size="10" ss:Bold="1"/> <Fill x:PatternFill="solid"/> </ss:Style> \n')
  out.write('  <ss:Style ss:ID="StyleGrey">   <Interior ss:Color="#DDDDDD" ss:Pattern="Solid"/> </ss:Style> \n')
  out.write('  <ss:Style ss:ID="StyleYellow"> <Interior ss:Color="#FFFFDD" ss:Pattern="Solid"/> </ss:Style> \n')
  out.write('</ss:Styles> \n')
}

function printExcelFoot(struct, out) {
  out.write('</Workbook> \n')
  debug(struct, "output for Excel generated")
}

function fillResume(struct, out) {
  var row
  
  printTableIni(out, 'Resume', 145, 45)
  printTableRow(out, 'StyleHeader', 'Name', 'Size(bytes)') 
  
  for(var idx=0; idx<struct.res_size.length; idx++) {
    row= struct.res_size[idx]
    printTableRow(out, NoStyle, row.name, row.size)
  }
  
  printTableFin(out)
}

function fillSections(struct, out) {
  var row1, row2, row3
  
  printTableIni(out, 'GroupedItems', 100, 150, 150, 40, 40, 40, 40)
  printTableRow(out, 'StyleHeader', 'Section', 'Component', 'Item', 'Scope', 'Size', 'SumC', 'SumS')

  for(var idx=0; idx<struct.sections.length; idx++) {
    row1= struct.sections[idx]
    printTableRow(out, NoStyle, row1.name)

    for(var idy=0; idy<row1.components.length; idy++) {
      row2= row1.components[idy]
      printTableRow(out, NoStyle, '', row2.name) 
    
      for(var idz=0; idz<row2.items.length; idz++) {
        row3= row2.items[idz]
        printTableRow(out, NoStyle, '', '', row3.name, row3.scope, row3.size) 
      }
        
      printTableRow(out, NoStyle, '', '', '', '', '', row2.size)
    }
    printTableRow(out, NoStyle, '', '', '', '', '', '', row1.size)
  }

  printTableFin(out)
}

function fillMemMap(struct, out) {
  var row

  printTableIni(out, 'MemMap', 40, 32, 170, 100)
  printTableRow(out, 'StyleHeader', 'Address', 'Size', 'Component', 'Section')

  printTableRow(out, 'StyleGrey', '00000', '16384', 'ROM', '')
  printTableRow(out, 'StyleGrey', '16384', '6912', 'Video RAM', '')

  for(var idx=0; idx<struct.componen.length; idx++) {
    row= struct.componen[idx]
    sty= (row.address<=32767)?'StyleYellow':NoStyle    // Contended Memory 
    printTableRow(out, sty, row.address, row.size, row.name, row.section)
  }

  printTableFin(out)
}



