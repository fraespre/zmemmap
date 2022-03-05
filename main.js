const cmmn= require('./module/common.js')
const scan= require('./module/cmd-scan.js')
const bulk= require('./module/cmd-bulk.js')


module.exports.error= cmmn.error
module.exports.checkFile= cmmn.checkFile
module.exports.checkPngParam= cmmn.checkPngParam
module.exports.checkSizeParam= cmmn.checkSizeParam

module.exports.scan= scan.mainScan
module.exports.bulk= bulk.mainBulk

