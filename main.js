const FS= require('fs')


module.exports= { checkFile, mainScan }


function error(message) {
  console.error("Error: "+message+"\n")
  process.exit(1)
}

function checkFile(filePath) {
  if( !FS.existsSync(filePath) ) 				error("File '"+filePath+"' not found")
  else {
    if(filePath.split('.').pop()!="map") 		error("The file hasn't .map extension")
  }
}

function mainScan(filePath, options) {
  var struct, outCsv
  
  console.log("[filePath:"+filePath+"][options:"+options+"]")
  try {
    struct= initBulk(filePath)
    //readMapFile(filePath, struct)
    outCsv= FS.createWriteStream(struct.file+".csv", {encoding:'utf8'})
    
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
    error(problem)
  }
}

function initBulk(filePath) {
  var pFile= filePath.substr(0, filePath.lastIndexOf('.'))
  //var pName= pFile.substr(pFile.lastIndexOf('/')+1)
  //    pName= pName.charAt(0).toLowerCase() + pName.slice(1)  
  //var pPath= pFile.substr(0, pFile.lastIndexOf('/')+1) 
  var struct=	{ 	file:pFile,
  					//name:pName,
  					//path:pPath,
  					detail:""
  				}
  //console.log( bulk )
  return(struct)
}

function readBulkFile(filePath, struct) {
  var lines, words, word, i, j, index
  
  lines= FS.readFileSync(filePath).toString().split("\n")
  struct.detail= new Array()
  console.log("\n")
  index= 0
  
  for(i in lines) {
    if(lines[i].trim().length>0) {
      bulk.detail[index]= new Array()
      bulk.detail[index].mask= false
      bulk.detail[index].blank= false
      bulk.detail[index].descriptor= false
      words= lines[i].split(/(\s+)/).filter( e => e.trim().length > 0)
      console.log(words)
      j= 0
      word= words[j++]
	  
      if(word==OP_SCAN) {
		bulk.detail[index].operation= word
        word= words[j++]
        while(word[0]=='-') {
          switch(word[1]) {
            case 'm':
              bulk.detail[index].mask= true 
              break
            case 'b':
              bulk.detail[index].blank= true 
              break
            case 'd':
              bulk.detail[index].descriptor= true 
              break
            case 'r': //ignored
              bulk.detail[index].raw= 'ignored'
              break
            default:
              throw "The parameter '"+word[1]+"' is unknow [line "+(i+1)+"]"
          } 
          word= words[j++]
        }
        bulk.detail[index].filePath= bulk.path + word
        word= words[j++]
        sizes= cmmn.checkSizeParam(word)
        bulk.detail[index].width= sizes[0]
        bulk.detail[index].height= sizes[1]
		
	  }else if(word==OP_ADD) {
	    bulk.detail[index].operation= word
		word= words[j++]
		bulk.detail[index].filePath= bulk.path + word
		
	  }else {
		throw "The command '"+word+"' [line "+(index+1)+"] is not recognized"
	  }
	  
      //console.log( bulk.detail[i] )
      index++    
    }
  }
  console.log("\n")
}







