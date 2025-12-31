const dns = require('dns');
const tls = require('tls');

console.log('== dns.lookup ==');
dns.lookup('gol-conway.hopto.org', (err, address, family) => {
  if (err) console.log('dns.lookup error', err.message);
  else console.log('dns.lookup ->', address, 'family', family);

  console.log('\n== dns.resolve4 ==');
  dns.resolve4('gol-conway.hopto.org', (err2, addresses) => {
    if (err2) console.log('dns.resolve4 error', err2.message);
    else console.log('dns.resolve4 ->', addresses);

    console.log('\n== tls.connect check ==');
    const s = tls.connect(443, 'gol-conway.hopto.org', {servername: 'gol-conway.hopto.org'}, () => {
      try {
        console.log('authorized:', s.authorized);
        console.log('authorizationError:', s.authorizationError);
        const peer = s.getPeerCertificate(true) || {};
        console.log('peer subject CN:', peer.subject ? peer.subject.CN : peer);
        console.log('peer issuer CN:', peer.issuer ? peer.issuer.CN : peer);
      } catch (e) {
        console.error('cert read err', e.message);
      }
      s.end();
    });
    s.on('error', e => console.error('TLSERR', e.message));
  });
});
