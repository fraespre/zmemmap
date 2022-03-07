const FS= require('fs')


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
  var struct, outCsv
  
  //console.log("[filePath:"+filePath+"][options:"+options+"]")
  try {
    struct= initStruct(filePath, options)
    readMapFile(struct)
    calculateSize(struct)
    groupBy(struct)
    outCsv= FS.createWriteStream(struct.path+struct.name+".csv", {encoding:'utf8'})
    
/*    
    scan.fillHeader1(outAsm, true);
    offset= 0
    
    for(i in bulk.detail) {
      one= bulk.detail[i]
      console.log(one)
 
      if(one.operation==OP_SCAN) {
        sprite= scan.initSprite(one.filePath, one.width, one.height, one.mask, one.blank, one.descriptor)
        sprite.bulkOffset= offset
        scan.scanImage(sprite)
        if(hasVerbose) scan.viewSprite(sprite)
        scan.dumpResult(sprite, outAsm, outBin, one.mask, one.blank, true, one.descriptor, true)
        offset+= sprite.totaLength
		
	  }else if(one.operation==OP_ADD) {
		length= addOperation(one.filePath, offset, outAsm, outBin)
		offset+= length
	  }	
	  
    }
    
	var file= bulk.file.substr(bulk.file.lastIndexOf('/')+1)
    scan.fillHeader3(outAsm, bulk.name, file, true)
*/
    
    outCsv.close()
  }catch(problem) {
    //error(problem)
    console.log(problem.stack);
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
  					details: null,
  					sections: null,
  				}
  //console.log(struct)
  return(struct)
}

function readMapFile(struct) {
  var tmpStruct, lines, line, row, word, idx
  
  lines= FS.readFileSync(struct.file).toString().split("\n")
  struct.details= new Array()
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
      rowvarType= word.trim()     
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
      if(struct.opOnlyUser) {
      	if( row.component.endsWith("_c") || row.component.endsWith("_asm") ) 
      	  struct.details.push( row )
      } else 
        struct.details.push( row )
        
    }
  }
  
  debug(struct, "parsed "+struct.details.length+" lines")
  //console.log( struct.matrix )
}

function calculateSize(struct) {
  var row, lastRow
  
  // sort by address
  struct.details.sort( (a, b) => a.address-b.address ) //struct.matrix.sort( (a, b) => a.address.localeCompare(b.address )
  debug(struct, "sorted by address")
  // calculate size
  for(var idx=1; idx<struct.details.length; idx++) {
    row= struct.details[idx]
    lastRow= struct.details[idx-1]
  	if(row.address==lastRow.address)  lastRow.size= 0
  	else							  lastRow.size= row.address-lastRow.address
  }
  debug(struct, "size calculated")
  //console.log( struct.detail )
}

function groupBy(struct) {
  var detailTmp1, detailTmp2, detailTmp3, sectionTmp, componentTmp, sumItem, sumComp
  
  // extract sections > components > items
  debug(struct, "grouping:")
  
  struct.sections= new Array()
  detailTmp1= struct.details.filter(row => (row.size>0)&&(row.def==false)&&(row.section.length>0));
  sectionTmp= [ ... new Set( detailTmp1.map(row => row.section) ) ]
  sectionTmp= sectionTmp.sort( (a, b) => a.localeCompare(b) )
  
  for(var idx=0; idx<sectionTmp.length; idx++) {
    debug(struct, "  L> Section: "+sectionTmp[idx])
  
    struct.sections[idx]= { name: sectionTmp[idx], components: new Array(), size: 0 }  
    detailTmp2= detailTmp1.filter(row => row.section==sectionTmp[idx]);
    componentTmp= [ ... new Set( detailTmp2.map(row => row.component) ) ]
    componentTmp= componentTmp.sort( (a, b) => a.localeCompare(b) )    
    
    for(var idy=0, sumComp=0; idy<componentTmp.length; idy++) {
      debug(struct, "    L> Component: "+componentTmp[idy])
    
      struct.sections[idx].components[idy]= { name: componentTmp[idy], items: new Array(), size: 0 }
      detailTmp3= detailTmp2.filter(row => row.component==componentTmp[idy]);
      detailTmp3.sort( (a, b) => b.size-a.size )
 
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
  //console.log( struct.sections )
}

function sortFilterMap(struct) {

  // filters
  struct.detail= struct.detail.filter(row => row.def != true);
  struct.detail= struct.detail.filter(row => row.size > 0);
  struct.detail= struct.detail.filter(row => row.component != "zx_crt_asm_m4");
  
}




