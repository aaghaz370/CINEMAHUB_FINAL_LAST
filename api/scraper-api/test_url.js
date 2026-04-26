const finalUrl = 'https://s21.freecdn4.top/files/220884/1080p/1080p.m3u8?in=144c9defac04969c7bfad8efaa8ea194';
const finalUrlObj = new URL(finalUrl);
const baseDir = finalUrlObj.origin + finalUrlObj.pathname.substring(0, finalUrlObj.pathname.lastIndexOf('/') + 1);
const search = finalUrlObj.search;

console.log('original:', finalUrl);
console.log('baseDir:', baseDir);
console.log('search:', search);
console.log('segment:', baseDir + '2560_000.jpg' + search);
