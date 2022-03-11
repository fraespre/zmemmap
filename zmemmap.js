#!/usr/bin/env node

const prog= require('commander');
const pckg= require('./package.json')
const main= require('./main.js')


prog
  .name('zmemmap')
  .description(pckg.description+"\nAuthor:"+pckg.author+" Version:"+pckg.version)
  .version(pckg.version)
  .argument('<file>', 'map file to parse')
  .option('-u, --user', 'only the user items without libraries')
  .option('-v, --verbose', 'detailed info about the parsing process')
  .action( function(file, options) {
    //console.log(" [action]"); console.log(" >file: "+file); console.log(" >options: "+options);
    main.checkFile(file)
    main.mainScan(file, options) 
  });
  
prog.parse()
  

  
/*
TODO

- Repetitions:
	_guiUtil_border                 = $703A
	_zx_border_fastcall             = $703A
	asm_zx_border                   = $703A

- Local slices:
	__events
	l__events_00101
	l__events_00103
	l__events_00104
	l__events_00105
	l__events_00108

*/