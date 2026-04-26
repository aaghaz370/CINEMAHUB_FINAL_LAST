async function test() {
  const url = 'http://localhost:9090/api/netmirror?action=proxy&url=https%3A%2F%2Fnet52.cc%2Fhls%2F82006666.m3u8%3Fq%3D720p%26in%3D144c9defac04969c7bfad8efaa8ea194%3A%3Ad180461cbd9ede313f0c036e58d0fc72%3A%3A1777213237%3A%3Ani%3A%3A6f55cf625919b85b9f6db526c6b3e322_fii';
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Text:', text.substring(0, 1000));
  } catch(e) {
    console.error(e);
  }
}
test();
