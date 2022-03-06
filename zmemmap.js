#!/usr/bin/env node

const prog= require('commander');
const pckg= require('./package.json')
const main= require('./main.js')


prog
  .name('zmemmap')
  .description(pckg.description+"\nAuthor:"+pckg.author+" Version:"+pckg.version)
  .version(pckg.version)
  .argument('<file>', 'map file to parse')
  .option('-r, --raw', 'output raw data to binary file')
  .action( function(file, options) {
    //console.log(" [action]"); console.log(" >file: "+file); console.log(" >options: "+options);
    main.checkFile(file)
    main.mainScan(file, options) 
  });
  
prog.parse()
  
