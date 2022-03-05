#!/usr/bin/env node

const prog= require('commander');
const pckg= require('./package.json')
const main= require('./main.js')


let cmmdParam;
let fileParam;
let sizeParam;
let optsParam;


console.log(
	 "\n                                     _|_|                                           "
	+"\n  _|_|_|     _|_|_|       _|_|_|   _|    _|     _|_|_|     _|_|_|   _|_|_|  _|_|    "
	+"\n  _|    _|   _|    _|   _|    _|       _|     _|    _|   _|_|       _|    _|    _|  "
	+"\n  _|    _|   _|    _|   _|    _|     _|       _|    _|       _|_|   _|    _|    _|  "
	+"\n  _|_|_|     _|    _|     _|_|_|   _|_|_|_|     _|_|_|   _|_|_|     _|    _|    _|  "
	+"\n  _|                          _|                                                    "
	+"\n  _|                      _|_|                                                      "
 )


prog
  .description(pckg.description+"\nAuthor:"+pckg.author+"  Version:"+pckg.version)
  .version(pckg.version)
prog
  .command('scan <file> <size>')
  .description(	 '\n    Scan a PNG file to ASM conversion'
  				+'\n    Ink[0,0,0], Paper[255,255,255], Mask [255,0,0], Null[0,255,255]'
  				+'\n    Example: png2asm scan -m sprite.png 16x16')
  .option('-m, --mask', 'process the mask information (sprites)')
  .option('-b, --blank', 'include blank rows in the asm file (sprites)')
  .option('-r, --raw', 'output raw data to binary file')
  .option('-d, --descriptor', 'sprite descriptor (file with .des extension)')
  .action( function(file, size, options) {
    //console.log(" >command: scan"); console.log(" >file: "+file); console.log(" >size: "+size); console.log(" >options: "+options);
    cmmdParam= 'scan'
    fileParam= file
    sizeParam= size
    optsParam= options
  });
prog
  .command('bulk <file>')
  .description(  '\n    Bulk process a set of PNG files and result a unique ASM output'
  				+'\n    The bulk file is composed by a set of individual Scan commands'
   				+'\n    Example: png2asm bulk batch.txt')
  .option('-v, --verbose', 'more verbose process')
  .action( function(file, options) {
    //console.log(" >command: bulk"); console.log(" >file: "+file); console.log(" >options: "+options);
    cmmdParam= 'bulk'
    fileParam= file
    optsParam= options
  });
prog
  .parse(process.argv)
  
  
if(cmmdParam=="scan") {
  //checks
  main.checkPngParam(fileParam)
  main.checkFile(fileParam)
  sizes= main.checkSizeParam(sizeParam)
  //execute
  main.scan(fileParam, 
			sizes[0], sizes[1], 
			(optsParam.mask==true), 
			(optsParam.blank==true), 
			(optsParam.raw==true), 
			(optsParam.descriptor==true)
		  )  
}
else if(cmmdParam=="bulk") {
  //checks
  main.checkFile(fileParam)
  //execute
  main.bulk(fileParam, (optsParam.verbose==true) )  
}
else {
  main.error("this command doesn't exist", true)
}

